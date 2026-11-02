from datetime import date, datetime, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.main import app
from src.database import get_db
from src.productos.models import Producto
from src.insumos.models import Insumo
from src.unidad_medida.models import UnidadMedida
from src.recetas.models import Receta, PasoReceta, PasoInsumo
from src.recetas.constants import EstadoReceta
from src.lotes.models import Lote
from src.personal.models import Persona
from tests.database import session, TestingSessionLocal

client = TestClient(app)


@pytest.fixture
def datos_produccion(session):
    """Crea una unidad de medida, insumo, producto con receta activa y pasos para pruebas."""
    db = session
    usuario = db.scalar(select(Persona))

    unidad_prod = UnidadMedida(nombre="Kilogramo", simbolo="kg", tipo_magnitud="masa", disponible=True)
    unidad_ins = UnidadMedida(nombre="Gramo", simbolo="g", tipo_magnitud="masa", disponible=True)
    db.add_all([unidad_prod, unidad_ins])
    db.flush()

    insumo1 = Insumo(
        nombre="Harina de Trigo",
        unidad_medida_id=unidad_ins.id,
        categoria="materia prima",
        descripcion="Harina para panificación",
        disponible=True,
    )
    insumo2 = Insumo(
        nombre="Levadura Seca",
        unidad_medida_id=unidad_ins.id,
        categoria="materia prima",
        descripcion="Levadura",
        disponible=True,
    )
    db.add_all([insumo1, insumo2])
    db.flush()

    producto = Producto(
        nombre="Pan de Campo",
        descripcion="Pan artesanal",
        unidad_medida_id=unidad_prod.id,
        dias_vida_util=7,
        activo=True,
    )
    db.add(producto)
    db.flush()

    receta = Receta(
        codigo_receta="REC-PC-001",
        nombre_receta="Receta Pan de Campo Tradicional",
        producto_id=producto.id,
        rendimiento_estandar=Decimal("10.00"),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario.id,
    )
    db.add(receta)
    db.flush()

    paso1 = PasoReceta(
        receta_id=receta.id,
        numero_orden=1,
        titulo="Amasado",
        instrucciones="Mezclar harina y levadura",
        insumos=[
            PasoInsumo(insumo_id=insumo1.id, cantidad_consumo_estimada=5000.0),
            PasoInsumo(insumo_id=insumo2.id, cantidad_consumo_estimada=200.0),
        ],
    )
    paso2 = PasoReceta(
        receta_id=receta.id,
        numero_orden=2,
        titulo="Espolvoreado final",
        instrucciones="Espolvorear harina extra sobre la corteza",
        insumos=[
            PasoInsumo(insumo_id=insumo1.id, cantidad_consumo_estimada=500.0),
        ],
    )
    db.add_all([paso1, paso2])
    db.commit()

    return {
        "producto_id": producto.id,
        "receta_id": receta.id,
        "insumo1_id": insumo1.id,
        "insumo2_id": insumo2.id,
        "rendimiento_estandar": float(receta.rendimiento_estandar),
    }


def test_listar_productos_disponibles_con_receta_activa(datos_produccion):
    res = client.get("/lotes/productos-disponibles")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    prod = next(p for p in data if p["id"] == datos_produccion["producto_id"])
    assert prod["receta_codigo"] == "REC-PC-001"
    assert prod["dias_vida_util"] == 7
    assert prod["rendimiento_estandar"] == "10.00"

    # Insumos teóricos consolidados (Harina 5000 + 500 = 5500)
    insumo_harina = next(i for i in prod["insumos_teoricos"] if i["insumo_id"] == datos_produccion["insumo1_id"])
    assert insumo_harina["cantidad_nominal_receta"] == 5500.0

    insumo_levadura = next(i for i in prod["insumos_teoricos"] if i["insumo_id"] == datos_produccion["insumo2_id"])
    assert insumo_levadura["cantidad_nominal_receta"] == 200.0


def test_sugerir_codigo_lote(datos_produccion):
    hoy = str(date.today())
    res = client.get(f"/lotes/sugerir-codigo?producto_id={datos_produccion['producto_id']}&fecha={hoy}")
    assert res.status_code == 200
    codigo = res.json()["codigo_lote"]
    assert codigo.startswith("LOT-PC-")
    assert codigo.endswith("-001")


def test_crear_lote_exitoso_con_escalado_dinamico(datos_produccion):
    hoy = datetime.now()
    venc = (hoy + timedelta(days=7)).date()

    # Producir el doble del rendimiento estándar (20 kg vs 10 kg nominales)
    # Factor = 20 / 10 = 2.0
    # Insumo 1 teórico = 5500 * 2 = 11000
    # Insumo 2 teórico = 200 * 2 = 400
    payload = {
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": hoy.isoformat(),
        "fecha_vencimiento": str(venc),
        "cantidad_producida": 20.0,
        "consumos": [
            {"insumo_id": datos_produccion["insumo1_id"], "cantidad_real_utilizada": 11200.0},
            {"insumo_id": datos_produccion["insumo2_id"], "cantidad_real_utilizada": 390.0},
        ],
    }

    res = client.post("/lotes/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["codigo_lote"].startswith("LOT-PC-")
    assert Decimal(str(data["cantidad_producida"])) == Decimal("20.00")
    assert data["receta_codigo"] == "REC-PC-001"

    consumos = data["consumos_insumos"]
    assert len(consumos) == 2
    c1 = next(c for c in consumos if c["insumo_id"] == datos_produccion["insumo1_id"])
    assert c1["cantidad_teorica"] == 11000.0
    assert c1["cantidad_real_utilizada"] == 11200.0

    c2 = next(c for c in consumos if c["insumo_id"] == datos_produccion["insumo2_id"])
    assert c2["cantidad_teorica"] == 400.0
    assert c2["cantidad_real_utilizada"] == 390.0


def test_crear_lote_falla_si_producto_sin_receta_activa(datos_produccion, session):
    # Desactivar la receta
    receta = session.scalar(select(Receta).where(Receta.id == datos_produccion["receta_id"]))
    receta.estado = EstadoReceta.INHABILITADA
    session.commit()

    payload = {
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [],
    }

    res = client.post("/lotes/", json=payload)
    assert res.status_code == 400
    assert "ACTIVA" in res.json()["detail"]


def test_crear_lote_falla_si_fecha_vencimiento_anterior():
    payload = {
        "producto_id": 99999,
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() - timedelta(days=1)),
        "cantidad_producida": 10.0,
    }
    res = client.post("/lotes/", json=payload)
    assert res.status_code == 400


def test_crear_lote_falla_codigo_duplicado(datos_produccion):
    payload = {
        "producto_id": datos_produccion["producto_id"],
        "codigo_lote": "LOT-FIJO-123",
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
    }
    res1 = client.post("/lotes/", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/lotes/", json=payload)
    assert res2.status_code == 409


def test_receta_con_lotes_es_inmutable_y_su_baja_pasa_a_inhabilitada(datos_produccion, session):
    """Regla de inmutabilidad: si la receta tiene lotes, no se borra físicamente y pasa a INHABILITADA."""
    # 1. Crear un lote para esta receta
    client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
    })

    receta_id = datos_produccion["receta_id"]

    # 2. Modificar la cabecera debe fallar porque tiene lotes
    res_patch = client.patch(f"/recetas/{receta_id}", json={"nombre_receta": "Intento de cambio"})
    assert res_patch.status_code == 400
    assert "lotes" in res_patch.json()["detail"]

    # 3. Dar de baja la receta mediante DELETE /recetas/{id}
    res_del = client.delete(f"/recetas/{receta_id}")
    assert res_del.status_code == 204

    # 4. Verificar en base de datos que NO fue borrada físicamente, sino que pasó a INHABILITADA con fecha_baja
    session.expire_all()
    receta_db = session.scalar(select(Receta).where(Receta.id == receta_id))
    assert receta_db is not None
    assert receta_db.estado == EstadoReceta.INHABILITADA
    assert receta_db.fecha_baja is not None


def test_receta_sin_lotes_baja_es_fisica(datos_produccion, session):
    """Si la receta NO tiene lotes, eliminarla realiza una baja física definitiva."""
    receta_id = datos_produccion["receta_id"]

    # Aseguramos que no haya lotes
    lotes = session.scalars(select(Lote).where(Lote.receta_id == receta_id)).all()
    for l in lotes:
        session.delete(l)
    session.commit()

    res_del = client.delete(f"/recetas/{receta_id}")
    assert res_del.status_code == 204

    session.expire_all()
    receta_db = session.scalar(select(Receta).where(Receta.id == receta_id))
    assert receta_db is None


def test_fecha_elaboracion_futura_rechazada(datos_produccion):
    """No permite registrar un lote con fecha de elaboración posterior al día de hoy."""
    fecha_futura = datetime.combine(date.today() + timedelta(days=1), datetime.min.time()).isoformat()
    res = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": fecha_futura,
        "fecha_vencimiento": str(date.today() + timedelta(days=10)),
        "cantidad_producida": 10.0,
    })
    assert res.status_code == 400
    assert "futura" in res.json()["detail"].lower() or "posterior" in res.json()["detail"].lower()


def test_crear_lote_falla_si_insumo_no_pertenece_a_receta(datos_produccion, session):
    """Rechaza el registro de lote si se envía un insumo ajeno a la receta activa del producto."""
    unidad = session.scalar(select(UnidadMedida))
    insumo_ajeno = Insumo(
        nombre="Insumo Ajeno",
        unidad_medida_id=unidad.id,
        categoria="materia prima",
        descripcion="No incluido en la receta",
        disponible=True,
    )
    session.add(insumo_ajeno)
    session.commit()

    res = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {"insumo_id": insumo_ajeno.id, "cantidad_real_utilizada": 1.0},
        ],
    })
    assert res.status_code == 400
    assert "no pertenece a la receta" in res.json()["detail"].lower()


def test_consumo_incremental_insumo(datos_produccion, session):
    """Al registrar un lote, se incrementa el consumo acumulado de los insumos utilizados."""
    insumo_id = datos_produccion["insumo1_id"]
    insumo_antes = session.scalar(select(Insumo).where(Insumo.id == insumo_id))
    consumo_inicial = insumo_antes.consumo

    res = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {"insumo_id": insumo_id, "cantidad_real_utilizada": 2.5}
        ]
    })
    assert res.status_code == 201

    session.expire_all()
    insumo_despues = session.scalar(select(Insumo).where(Insumo.id == insumo_id))
    assert insumo_despues.consumo == consumo_inicial + Decimal("2.5")
