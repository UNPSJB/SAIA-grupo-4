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
from src.lotes_insumo.models import LoteInsumo
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
    db.flush()

    lote_ins1_a = LoteInsumo(
        insumo_id=insumo1.id,
        codigo_lote="L-HAR-01",
        fecha_vencimiento=date.today() + timedelta(days=30),
        cantidad_inicial=Decimal("8000.000"),
        cantidad_actual=Decimal("8000.000"),
    )
    lote_ins1_b = LoteInsumo(
        insumo_id=insumo1.id,
        codigo_lote="L-HAR-02",
        fecha_vencimiento=date.today() + timedelta(days=60),
        cantidad_inicial=Decimal("8000.000"),
        cantidad_actual=Decimal("8000.000"),
    )
    lote_ins2 = LoteInsumo(
        insumo_id=insumo2.id,
        codigo_lote="L-LEV-01",
        fecha_vencimiento=date.today() + timedelta(days=45),
        cantidad_inicial=Decimal("1000.000"),
        cantidad_actual=Decimal("1000.000"),
    )
    db.add_all([lote_ins1_a, lote_ins1_b, lote_ins2])
    db.commit()

    return {
        "producto_id": producto.id,
        "receta_id": receta.id,
        "insumo1_id": insumo1.id,
        "insumo2_id": insumo2.id,
        "lote_ins1_a_id": lote_ins1_a.id,
        "lote_ins1_b_id": lote_ins1_b.id,
        "lote_ins2_id": lote_ins2.id,
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
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 11200.0,
                "lotes": [
                    {"lote_insumo_id": datos_produccion["lote_ins1_a_id"], "cantidad": 6000.0},
                    {"lote_insumo_id": datos_produccion["lote_ins1_b_id"], "cantidad": 5200.0},
                ],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 390.0,
                "lotes": [
                    {"lote_insumo_id": datos_produccion["lote_ins2_id"], "cantidad": 390.0},
                ],
            },
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
    assert len(c1["detalles_lotes"]) == 2

    c2 = next(c for c in consumos if c["insumo_id"] == datos_produccion["insumo2_id"])
    assert c2["cantidad_teorica"] == 400.0
    assert c2["cantidad_real_utilizada"] == 390.0
    assert c2["detalles_lotes"][0]["codigo_lote_insumo"] == "L-LEV-01"


def test_crear_lote_falla_si_producto_sin_receta_activa(datos_produccion, session):
    # Desactivar la receta
    receta = session.scalar(select(Receta).where(Receta.id == datos_produccion["receta_id"]))
    receta.estado = EstadoReceta.ARCHIVADA
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
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 100.0,
                "lotes": [{"lote_insumo_id": datos_produccion["lote_ins1_a_id"], "cantidad": 100.0}],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 10.0,
                "lotes": [{"lote_insumo_id": datos_produccion["lote_ins2_id"], "cantidad": 10.0}],
            },
        ],
    }
    res1 = client.post("/lotes/", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/lotes/", json=payload)
    assert res2.status_code == 409


def test_receta_con_lotes_es_inmutable_y_su_baja_pasa_a_inhabilitada(datos_produccion, session):
    """Regla de inmutabilidad: si la receta tiene lotes, no se borra físicamente y pasa a INHABILITADA."""
    # 1. Crear un lote para esta receta
    res_lote = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 50.0,
                "lotes": [{"lote_insumo_id": datos_produccion["lote_ins1_a_id"], "cantidad": 50.0}],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 5.0,
                "lotes": [{"lote_insumo_id": datos_produccion["lote_ins2_id"], "cantidad": 5.0}],
            },
        ],
    })
    assert res_lote.status_code == 201

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
    assert receta_db.estado == EstadoReceta.ARCHIVADA
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


def test_consumo_multi_lote_descuenta_atomico_y_agota(datos_produccion, session):
    """Consume de 2 lotes físicos: uno queda AGOTADO (0) y el otro con stock remanente."""
    res = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 9500.0,
                "lotes": [
                    {"lote_insumo_id": datos_produccion["lote_ins1_a_id"], "cantidad": 8000.0},
                    {"lote_insumo_id": datos_produccion["lote_ins1_b_id"], "cantidad": 1500.0},
                ],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 0.0,
                "lotes": [],
            },
        ],
    })
    assert res.status_code == 201, res.text

    session.expire_all()
    lote_a = session.scalar(select(LoteInsumo).where(LoteInsumo.id == datos_produccion["lote_ins1_a_id"]))
    lote_b = session.scalar(select(LoteInsumo).where(LoteInsumo.id == datos_produccion["lote_ins1_b_id"]))
    assert lote_a.cantidad_actual == Decimal("0.000")
    assert lote_a.estado.value == "agotado"
    assert lote_b.cantidad_actual == Decimal("6500.000")
    assert lote_b.estado.value == "activo"


def test_consumo_falla_por_desbalance_y_stock_insuficiente(datos_produccion, session):
    """Rechaza si la suma de lotes no coincide con cantidad_real_utilizada o supera stock, sin descontar."""
    res_desbalance = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 500.0,
                "lotes": [{"lote_insumo_id": datos_produccion["lote_ins1_a_id"], "cantidad": 400.0}],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 0.0,
                "lotes": [],
            },
        ],
    })
    assert res_desbalance.status_code == 400

    res_stock = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 9000.0,
                "lotes": [{"lote_insumo_id": datos_produccion["lote_ins1_a_id"], "cantidad": 9000.0}],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 0.0,
                "lotes": [],
            },
        ],
    })
    assert res_stock.status_code == 400

    session.expire_all()
    lote_a = session.scalar(select(LoteInsumo).where(LoteInsumo.id == datos_produccion["lote_ins1_a_id"]))
    assert lote_a.cantidad_actual == Decimal("8000.000")


def test_consumo_falla_por_lote_vencido_o_inhabilitado(datos_produccion, session):
    lote_vencido = LoteInsumo(
        insumo_id=datos_produccion["insumo1_id"],
        codigo_lote="L-HAR-VENC",
        fecha_vencimiento=date.today() - timedelta(days=1),
        cantidad_inicial=Decimal("5000.000"),
        cantidad_actual=Decimal("5000.000"),
    )
    session.add(lote_vencido)
    session.commit()

    res = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 100.0,
                "lotes": [{"lote_insumo_id": lote_vencido.id, "cantidad": 100.0}],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 0.0,
                "lotes": [],
            },
        ],
    })
    assert res.status_code == 400


def test_consumo_con_conversion_de_unidades_compatible_y_rechazo_incompatible(datos_produccion, session):
    """El operador puede informar consumos/lotes en kg/g/mg sobre un insumo en g y el backend convierte a g."""
    lote_a = LoteInsumo(
        insumo_id=datos_produccion["insumo1_id"],
        codigo_lote="L-CONV-A",
        fecha_vencimiento=date.today() + timedelta(days=30),
        cantidad_inicial=Decimal("1000.000"),
        cantidad_actual=Decimal("1000.000"),
        activo=True,
    )
    lote_b = LoteInsumo(
        insumo_id=datos_produccion["insumo1_id"],
        codigo_lote="L-CONV-B",
        fecha_vencimiento=date.today() + timedelta(days=45),
        cantidad_inicial=Decimal("1000.000"),
        cantidad_actual=Decimal("1000.000"),
        activo=True,
    )
    session.add_all([lote_a, lote_b])
    session.commit()
    session.refresh(lote_a)
    session.refresh(lote_b)

    # 1. Unidad incompatible (L en insumo de masa) debe fallar con 400
    res_bad = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": (date.today() + timedelta(days=5)).isoformat(),
        "cantidad_producida": 100.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 500,
                "unidad": "L",
                "lotes": [{"lote_insumo_id": lote_a.id, "cantidad": 500, "unidad": "L"}],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 0,
                "lotes": [],
            },
        ],
    })
    assert res_bad.status_code == 400

    # 2. Conversión válida: 0.5 kg (500 g) = 0.3 kg (300 g) del lote A + 200 g del lote B
    res_ok = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": (date.today() + timedelta(days=5)).isoformat(),
        "cantidad_producida": 100.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 0.5,
                "unidad": "kg",
                "lotes": [
                    {"lote_insumo_id": lote_a.id, "cantidad": 0.3, "unidad": "kg"},
                    {"lote_insumo_id": lote_b.id, "cantidad": 200, "unidad": "g"},
                ],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 0,
                "lotes": [],
            },
        ],
    })
    assert res_ok.status_code == 201, res_ok.text
    data = res_ok.json()
    consumo_ins1 = next(c for c in data["consumos_insumos"] if c["insumo_id"] == datos_produccion["insumo1_id"])
    assert consumo_ins1["cantidad_real_utilizada"] == 500.0
    session.expire_all()
    assert session.get(LoteInsumo, lote_a.id).cantidad_actual == Decimal("700.000")
    assert session.get(LoteInsumo, lote_b.id).cantidad_actual == Decimal("800.000")


def test_lote_desacopla_masa_tanda_g_y_cantidad_producida_comercial(datos_produccion, session):
    """masa_tanda_g escala la cantidad teórica de insumos mientras cantidad_producida guarda las unidades comerciales."""
    lote_ins1 = LoteInsumo(
        insumo_id=datos_produccion["insumo1_id"],
        codigo_lote="L-DESC-1",
        fecha_vencimiento=date.today() + timedelta(days=30),
        cantidad_inicial=Decimal("500.000"),
        cantidad_actual=Decimal("500.000"),
        activo=True,
    )
    session.add(lote_ins1)
    session.commit()
    session.refresh(lote_ins1)

    # Receta tiene rendimiento_estandar=10; masa_tanda_g=20 => factor 2x (nominal insumo1=5500 => teorica=11000)
    # Producto comercializado: 4 paquetes finales
    res = client.post("/lotes/", json={
        "producto_id": datos_produccion["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": (date.today() + timedelta(days=5)).isoformat(),
        "masa_tanda_g": 20.0,
        "cantidad_producida": 4.0,
        "consumos": [
            {
                "insumo_id": datos_produccion["insumo1_id"],
                "cantidad_real_utilizada": 100.0,
                "lotes": [{"lote_insumo_id": lote_ins1.id, "cantidad": 100.0}],
            },
            {
                "insumo_id": datos_produccion["insumo2_id"],
                "cantidad_real_utilizada": 0,
                "lotes": [],
            },
        ],
    })
    assert res.status_code == 201, res.text
    data = res.json()
    assert float(data["cantidad_producida"]) == 4.0
    consumo_ins1 = next(c for c in data["consumos_insumos"] if c["insumo_id"] == datos_produccion["insumo1_id"])
    assert consumo_ins1["cantidad_teorica"] == 11000.0


def _registrar_produccion(datos, lote_harina_id, lote_levadura_id, cant_harina=100.0, cant_levadura=10.0):
    """Registra un lote de producción y devuelve su id. La receta exige consumir ambos insumos."""
    res = client.post("/lotes/", json={
        "producto_id": datos["producto_id"],
        "fecha_elaboracion": datetime.now().isoformat(),
        "fecha_vencimiento": str(date.today() + timedelta(days=5)),
        "cantidad_producida": 10.0,
        "consumos": [
            {
                "insumo_id": datos["insumo1_id"],
                "cantidad_real_utilizada": cant_harina,
                "lotes": [{"lote_insumo_id": lote_harina_id, "cantidad": cant_harina}],
            },
            {
                "insumo_id": datos["insumo2_id"],
                "cantidad_real_utilizada": cant_levadura,
                "lotes": [{"lote_insumo_id": lote_levadura_id, "cantidad": cant_levadura}],
            },
        ],
    })
    assert res.status_code == 201, res.text
    return res.json()["id"]


def _ids(respuesta):
    assert respuesta.status_code == 200, respuesta.text
    return {lote["id"] for lote in respuesta.json()}


def test_filtro_lote_insumo_devuelve_solo_producciones_que_lo_usaron(datos_produccion):
    prod_a = _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_a_id"], datos_produccion["lote_ins2_id"])
    prod_b = _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_b_id"], datos_produccion["lote_ins2_id"])

    assert _ids(client.get("/lotes/", params={"codigo_lote_insumo": "L-HAR-01"})) == {prod_a}
    assert _ids(client.get("/lotes/", params={"codigo_lote_insumo": "L-HAR-02"})) == {prod_b}
    # La levadura se usó en las dos producciones
    assert _ids(client.get("/lotes/", params={"codigo_lote_insumo": "L-LEV-01"})) == {prod_a, prod_b}


def test_filtro_lote_insumo_ignora_mayusculas_y_espacios(datos_produccion):
    prod_a = _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_a_id"], datos_produccion["lote_ins2_id"])

    res = client.get("/lotes/", params={"codigo_lote_insumo": "  l-har-01 "})
    assert _ids(res) == {prod_a}


def test_filtro_lote_insumo_es_coincidencia_exacta_no_parcial(datos_produccion):
    _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_a_id"], datos_produccion["lote_ins2_id"])

    assert _ids(client.get("/lotes/", params={"codigo_lote_insumo": "L-HAR"})) == set()
    assert _ids(client.get("/lotes/", params={"codigo_lote_insumo": "L-HAR-0"})) == set()


def test_filtro_lote_insumo_sin_uso_devuelve_lista_vacia(datos_produccion, session):
    lote_sin_uso = LoteInsumo(
        insumo_id=datos_produccion["insumo1_id"],
        codigo_lote="L-HAR-NUNCA",
        fecha_vencimiento=date.today() + timedelta(days=30),
        cantidad_inicial=Decimal("1000.000"),
        cantidad_actual=Decimal("1000.000"),
    )
    session.add(lote_sin_uso)
    session.commit()
    _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_a_id"], datos_produccion["lote_ins2_id"])

    # Existe como lote de insumo pero ninguna producción lo usó
    res = client.get("/lotes/", params={"codigo_lote_insumo": "L-HAR-NUNCA"})
    assert res.status_code == 200
    assert res.json() == []

    # Código que no existe en el sistema
    res = client.get("/lotes/", params={"codigo_lote_insumo": "NO-EXISTE"})
    assert res.status_code == 200
    assert res.json() == []


def test_sin_filtro_lote_insumo_lista_todas_las_producciones(datos_produccion):
    prod_a = _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_a_id"], datos_produccion["lote_ins2_id"])
    prod_b = _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_b_id"], datos_produccion["lote_ins2_id"])

    assert _ids(client.get("/lotes/")) == {prod_a, prod_b}
    # Un valor vacío o solo espacios equivale a no filtrar
    assert _ids(client.get("/lotes/", params={"codigo_lote_insumo": "   "})) == {prod_a, prod_b}


def test_filtro_lote_insumo_se_combina_con_otros_filtros(datos_produccion):
    prod_a = _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_a_id"], datos_produccion["lote_ins2_id"])

    res = client.get("/lotes/", params={
        "codigo_lote_insumo": "L-HAR-01",
        "producto_id": datos_produccion["producto_id"],
    })
    assert _ids(res) == {prod_a}

    res = client.get("/lotes/", params={
        "codigo_lote_insumo": "L-HAR-01",
        "producto_id": 99999,
    })
    assert _ids(res) == set()


def test_filtro_lote_insumo_devuelve_codigo_en_detalles_para_el_subtexto(datos_produccion):
    _registrar_produccion(datos_produccion, datos_produccion["lote_ins1_a_id"], datos_produccion["lote_ins2_id"])

    res = client.get("/lotes/", params={"codigo_lote_insumo": "L-HAR-01"})
    assert res.status_code == 200
    lote = res.json()[0]

    codigos = [
        detalle["codigo_lote_insumo"]
        for consumo in lote["consumos_insumos"]
        for detalle in consumo["detalles_lotes"]
    ]
    assert "L-HAR-01" in codigos


def test_filtro_lote_insumo_no_duplica_producciones_con_mismo_codigo_en_dos_insumos(datos_produccion, session):
    """El mismo código puede existir en insumos distintos: la producción debe aparecer una sola vez."""
    lote_harina = LoteInsumo(
        insumo_id=datos_produccion["insumo1_id"],
        codigo_lote="L-COMUN",
        fecha_vencimiento=date.today() + timedelta(days=30),
        cantidad_inicial=Decimal("1000.000"),
        cantidad_actual=Decimal("1000.000"),
    )
    lote_levadura = LoteInsumo(
        insumo_id=datos_produccion["insumo2_id"],
        codigo_lote="L-COMUN",
        fecha_vencimiento=date.today() + timedelta(days=30),
        cantidad_inicial=Decimal("1000.000"),
        cantidad_actual=Decimal("1000.000"),
    )
    session.add_all([lote_harina, lote_levadura])
    session.commit()

    prod = _registrar_produccion(datos_produccion, lote_harina.id, lote_levadura.id)

    res = client.get("/lotes/", params={"codigo_lote_insumo": "L-COMUN"})
    assert res.status_code == 200
    assert [lote["id"] for lote in res.json()] == [prod]
