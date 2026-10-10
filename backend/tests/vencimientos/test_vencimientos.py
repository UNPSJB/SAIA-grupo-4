from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.recambios.constants import Constantes as ConstantesRecambio
from src.vencimientos.constants import (
    CategoriaVencimiento,
    Constantes,
    EstadoVencimiento,
)
from src.vencimientos.services import _resolver_corte, calcular_estado
from tests.database import session

client = TestClient(app)


# =============================================================================
# Helpers
# =============================================================================
# El nombre del tipo de elemento de limpieza es unico, asi que el helper lo
# recibe por parametro para poder crear mas de uno dentro del mismo test.
def crear_tipo_auxiliar(nombre="Escoba"):
    res = client.post("/tipos-elemento-limpieza/", json={"nombre": nombre, "prefijo": "ESC"})
    return res.json()["id"]


def crear_elemento_auxiliar(nombre, frecuencia=10, tipo_id=None):
    if tipo_id is None:
        tipo_id = crear_tipo_auxiliar()
    res = client.post(
        "/elementos-limpieza/",
        json={"nombre": nombre, "tipo_id": tipo_id, "frecuencia_recambio_dias": frecuencia},
    )
    return res.json()["id"]


def registrar_recambio(elemento_id, dias_atras):
    fecha = (date.today() - timedelta(days=dias_atras)).isoformat()
    return client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": fecha})


# Atajo para dejar un elemento con una urgencia concreta.
# proxima_fecha = hoy - dias_atras + frecuencia, o sea dias_restantes = frecuencia - dias_atras
def crear_con_urgencia(nombre, dias_restantes, tipo_id=None, frecuencia=None):
    if frecuencia is None:
        # Frecuencia holgada para que dias_atras nunca sea negativo.
        frecuencia = max(dias_restantes, 30)
    elemento_id = crear_elemento_auxiliar(nombre, frecuencia=frecuencia, tipo_id=tipo_id)
    registrar_recambio(elemento_id, frecuencia - dias_restantes)
    return elemento_id


# =============================================================================
# Semaforizacion: funcion pura, sin base de datos
# =============================================================================

def test_calcular_estado_vencido():
    assert calcular_estado(-1) == EstadoVencimiento.VENCIDO


def test_calcular_estado_proximo_hoy():
    assert calcular_estado(0) == EstadoVencimiento.PROXIMO


def test_calcular_estado_proximo_en_el_limite():
    assert calcular_estado(Constantes.DIAS_AVISO_PROXIMO) == EstadoVencimiento.PROXIMO


def test_calcular_estado_vigente_un_dia_despues_del_limite():
    assert calcular_estado(Constantes.DIAS_AVISO_PROXIMO + 1) == EstadoVencimiento.VIGENTE


def test_calcular_estado_tope_de_la_ventana():
    # El tope del valor negativo: -1 dia ya es vencido, no un error de calculo.
    assert calcular_estado(-1) == EstadoVencimiento.VENCIDO
    assert calcular_estado(0) == EstadoVencimiento.PROXIMO


def test_umbral_propio_no_hereda_el_de_recambios():
    # Los dos modulos tienen ventanas distintas y a proposito: el tablero
    # consolida 15 dias, el semaforo dentro del listado de elementos de
    # limpieza avisa a 3.
    assert Constantes.DIAS_AVISO_PROXIMO == 15
    assert ConstantesRecambio.DIAS_AVISO_PROXIMO == 3


def test_umbral_no_se_mezcla_con_el_de_recambios():
    # Mismo vencimiento de +5 dias, clasificado por cada modulo por separado.
    crear_elemento_auxiliar("Escoba cocina", frecuencia=10)
    registrar_recambio(
        client.get("/elementos-limpieza/").json()[0]["id"],
        5,
    )

    alerta = client.get("/recambios/alertas").json()[0]
    vencimientos = client.get("/vencimientos/").json()[0]

    assert alerta["estado"] == "al_dia"     # ventana de 3 dias
    assert vencimientos["estado"] == "proximo"  # ventana de 15 dias
    assert vencimientos["dias_restantes"] == alerta["dias_restantes"] == 5


# =============================================================================
# Ventana de dias: sin parametro no se recorta
# =============================================================================
# El corte por defecto se elimino. `vigente` esta definido como "vence despues
# de DIAS_AVISO_PROXIMO dias", asi que un tope implicito en ese mismo umbral
# dejaba fuera justamente al tercer estado y "Todos los estados" no podia
# mostrarlo. Acortar la ventana es ahora explicito, con `dias_max`.

def test_lista_sin_filtro_incluye_los_tres_estados():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Vigente", 29, tipo_id=tipo_id)

    data = client.get("/vencimientos/").json()

    assert [v["estado"] for v in data] == ["vencido", "proximo", "vigente"]


def test_lista_incluye_el_limite_exacto_de_15_dias():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Limite", Constantes.DIAS_AVISO_PROXIMO, tipo_id=tipo_id)

    data = client.get("/vencimientos/").json()

    assert len(data) == 1
    assert data[0]["dias_restantes"] == 15
    assert data[0]["estado"] == "proximo"


def test_lista_incluye_vencidos():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)

    data = client.get("/vencimientos/").json()

    assert len(data) == 1
    assert data[0]["estado"] == "vencido"
    assert data[0]["dias_restantes"] == -20


def test_dias_max_explicito_estrecha_la_ventana():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Lejano", 29, tipo_id=tipo_id)

    # Sin `dias_max` no hay recorte: entra la fila que vence en 29 dias.
    assert len(client.get("/vencimientos/").json()) == 1
    # El corte ahora hay que pedirlo, y `dias_max=0` deja solo lo ya vencido.
    assert client.get("/vencimientos/", params={"dias_max": 0}).json() == []
    assert len(client.get("/vencimientos/", params={"dias_max": 29}).json()) == 1


def test_dias_max_cero_devuelve_solo_lo_que_ya_vencio_o_vence_hoy():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)
    crear_con_urgencia("Hoy", 0, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"dias_max": 0}).json()

    assert [v["concepto"] for v in data] == ["Vencido", "Hoy"]


def test_dias_max_negativo_devuelve_422():
    assert client.get("/vencimientos/", params={"dias_max": -1}).status_code == 422


def test_dias_max_no_entero_devuelve_422():
    assert client.get("/vencimientos/", params={"dias_max": "quince"}).status_code == 422


# =============================================================================
# Orden por urgencia (criterio 2)
# =============================================================================

def test_orden_por_urgencia_mas_urgente_primero():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("VencidoLeve", -1, tipo_id=tipo_id)
    crear_con_urgencia("Hoy", 0, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("VencidoFuerte", -20, tipo_id=tipo_id)

    data = client.get("/vencimientos/").json()

    assert [v["concepto"] for v in data] == ["VencidoFuerte", "VencidoLeve", "Hoy", "Proximo"]
    assert [v["dias_restantes"] for v in data] == sorted(v["dias_restantes"] for v in data)


def test_orden_se_mantiene_al_aplicar_filtros():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("VencidoA", -1, tipo_id=tipo_id)
    crear_con_urgencia("VencidoB", -20, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "vencido"}).json()

    assert [v["concepto"] for v in data] == ["VencidoB", "VencidoA"]


def test_orden_estable_entre_requests():
    # Dos registros con la misma cantidad de dias restantes no pueden depender
    # del orden de insercion en la base.
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("B", 5, tipo_id=tipo_id)
    crear_con_urgencia("A", 5, tipo_id=tipo_id)

    primero = client.get("/vencimientos/").json()
    segundo = client.get("/vencimientos/").json()

    assert [v["concepto"] for v in primero] == ["A", "B"]
    assert [v["id"] for v in primero] == [v["id"] for v in segundo]


# =============================================================================
# Filtro por estado
# =============================================================================

def test_filtro_por_estado_vencido():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)
    crear_con_urgencia("Hoy", 0, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "vencido"}).json()

    assert [v["concepto"] for v in data] == ["Vencido"]


def test_filtro_por_estado_proximo():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Hoy", 0, tipo_id=tipo_id)
    crear_con_urgencia("Limite", 15, tipo_id=tipo_id)
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "proximo"}).json()

    # Orden por urgencia ascendente: hoy, luego +5, luego el limite de +15.
    assert [v["concepto"] for v in data] == ["Hoy", "Proximo", "Limite"]


def test_filtro_por_estado_vigente():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vigente", 29, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "vigente"}).json()

    assert [v["concepto"] for v in data] == ["Vigente"]
    assert data[0]["estado"] == "vigente"
    assert data[0]["dias_restantes"] == 29


def test_filtro_vigente_devuelve_todos_los_vigentes_sin_corte():
    # "Vigente" es "> 15 dias": si se le aplicara el corte por defecto no
    # devolveria nunca nada.
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("MuyLejano", 200, tipo_id=tipo_id)
    crear_con_urgencia("Lejano", 29, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "vigente"}).json()

    assert [v["concepto"] for v in data] == ["Lejano", "MuyLejano"]
    assert sorted(v["dias_restantes"] for v in data) == [29, 200]


def test_filtro_vigente_ordena_del_mas_urgente_al_mas_lejano():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Lejano", 29, tipo_id=tipo_id)
    crear_con_urgencia("MuyLejano", 200, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "vigente"}).json()

    assert [v["dias_restantes"] for v in data] == [29, 200]


def test_filtro_por_estado_sin_coincidencias_devuelve_lista_vacia():
    assert client.get("/vencimientos/", params={"estado": "vencido"}).json() == []


def test_filtro_por_estado_por_vencer_excluye_vigentes():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)
    crear_con_urgencia("Hoy", 0, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Limite", 15, tipo_id=tipo_id)
    crear_con_urgencia("Vigente", 29, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "por_vencer"}).json()

    assert [v["concepto"] for v in data] == ["Vencido", "Hoy", "Proximo", "Limite"]
    assert all(v["estado"] in ("vencido", "proximo") for v in data)


def test_filtro_por_estado_por_vencer_respeta_dias_max():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Vigente", 29, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "por_vencer", "dias_max": 0}).json()
    assert [v["concepto"] for v in data] == ["Vencido"]


def test_filtro_por_estado_por_vencer_mantiene_orden_por_urgencia():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("VencidoA", -1, tipo_id=tipo_id)
    crear_con_urgencia("VencidoB", -20, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Hoy", 0, tipo_id=tipo_id)

    data = client.get("/vencimientos/", params={"estado": "por_vencer"}).json()

    assert [v["concepto"] for v in data] == ["VencidoB", "VencidoA", "Hoy", "Proximo"]


def test_filtro_por_estado_por_vencer_combinado_con_categoria():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)
    crear_con_urgencia("Vigente", 29, tipo_id=tipo_id)

    data = client.get(
        "/vencimientos/",
        params={"estado": "por_vencer", "categoria": "elemento_limpieza"},
    ).json()

    assert [v["concepto"] for v in data] == ["Vencido", "Proximo"]
    assert all(v["categoria"] == "elemento_limpieza" for v in data)


def test_estado_invalido_devuelve_422():
    assert client.get("/vencimientos/", params={"estado": "inventado"}).status_code == 422


# =============================================================================
# Filtro por categoria
# =============================================================================

def test_filtro_por_categoria_devuelve_solo_esa_categoria():
    crear_con_urgencia("Escoba cocina", 5)

    data = client.get(
        "/vencimientos/",
        params={"categoria": CategoriaVencimiento.ELEMENTO_LIMPIEZA.value},
    ).json()

    assert len(data) == 1
    assert data[0]["categoria"] == "elemento_limpieza"


def test_categoria_sin_proveedor_devuelve_400():
    # El filtro tiene que fallar fuerte para que el frontend distinga "no hay datos" de "esa categoria no existe".
    res = client.get("/vencimientos/", params={"categoria": "personal"})

    assert res.status_code == 400
    assert res.json()["detail"] == "La categoria solicitada todavia no tiene vencimientos registrados. "


@pytest.mark.parametrize(
    "categoria",
    [c.value for c in CategoriaVencimiento if c is not CategoriaVencimiento.ELEMENTO_LIMPIEZA],
)
def test_todas_las_categorias_sin_provider_devuelven_400(categoria):
    assert client.get("/vencimientos/", params={"categoria": categoria}).status_code == 400


def test_categoria_invalida_devuelve_422():
    assert client.get("/vencimientos/", params={"categoria": "inventada"}).status_code == 422


def test_categoria_con_provider_sin_datos_devuelve_lista_vacia():
    res = client.get(
        "/vencimientos/", params={"categoria": CategoriaVencimiento.ELEMENTO_LIMPIEZA.value}
    )

    assert res.status_code == 200
    assert res.json() == []


def test_filtros_combinados():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)

    data = client.get(
        "/vencimientos/",
        params={"estado": "proximo", "categoria": "elemento_limpieza"},
    ).json()

    assert [v["concepto"] for v in data] == ["Proximo"]


# =============================================================================
# Exclusion de registros que no se pueden computar
# =============================================================================

def test_excluye_elementos_sin_frecuencia():
    sin_frecuencia = client.post(
        "/elementos-limpieza/",
        json={"nombre": "Sin frecuencia", "tipo_id": crear_tipo_auxiliar()},
    ).json()["id"]

    assert sin_frecuencia is not None
    assert client.get("/vencimientos/").json() == []


def test_excluye_elementos_inactivos():
    tipo_id = crear_tipo_auxiliar()
    elemento_id = crear_con_urgencia("Inactivo", 5, tipo_id=tipo_id)
    client.delete(f"/elementos-limpieza/{elemento_id}")

    assert client.get("/vencimientos/").json() == []


def test_lista_vacia_sin_ningun_dato():
    res = client.get("/vencimientos/")

    assert res.status_code == 200
    assert res.json() == []


# =============================================================================
# Navegacion al detalle (criterio 3)
# =============================================================================

def test_ruta_detalle_apunta_al_registro_de_origen():
    elemento_id = crear_elemento_auxiliar("Escoba cocina", frecuencia=10)
    registrar_recambio(elemento_id, 5)

    vencimientos = client.get("/vencimientos/").json()

    assert vencimientos[0]["ruta_detalle"] == f"/elementos-limpieza?detalle={elemento_id}"


def test_id_consolidado_es_estable():
    elemento_id = crear_elemento_auxiliar("Escoba cocina", frecuencia=10)
    registrar_recambio(elemento_id, 5)

    vencimientos = client.get("/vencimientos/").json()

    assert vencimientos[0]["id"] == f"elemento_limpieza:{elemento_id}"


def test_id_consolidado_no_colisiona_entre_registros():
    # El id de la vista consolidada no puede ser el id de la tabla de origen:
    # cuando E3 y E4 sumen filas, dos registros distintos pueden tener el
    # mismo entero.
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Escoba cocina", 5, tipo_id=tipo_id)
    crear_con_urgencia("Escoba bano", 6, tipo_id=tipo_id)

    ids = [v["id"] for v in client.get("/vencimientos/").json()]

    assert len(ids) == 2
    assert len(set(ids)) == 2
    assert all(i.startswith("elemento_limpieza:") for i in ids)


def test_campos_del_contrato_consolidado():
    elemento_id = crear_elemento_auxiliar("Escoba cocina", frecuencia=10)
    registrar_recambio(elemento_id, 5)

    vencimiento = client.get("/vencimientos/").json()[0]

    assert vencimiento == {
        "id": f"elemento_limpieza:{elemento_id}",
        "categoria": "elemento_limpieza",
        "concepto": "Escoba cocina",
        "entidad": "Elementos de limpieza",
        "entidad_id": elemento_id,
        "fecha_vencimiento": (date.today() + timedelta(days=5)).isoformat(),
        "dias_restantes": 5,
        "estado": "proximo",
        "detalle": "Escoba",
        "ruta_detalle": f"/elementos-limpieza?detalle={elemento_id}",
    }


# =============================================================================
# Contrato con equipos / personal / documentacion / elementos de limpieza
# =============================================================================

def test_categorias_declaradas_en_el_contrato():
    # Las cuatro categorias existen en el enum aunque tres no tengan provider.
    assert {c.value for c in CategoriaVencimiento} == {
        "personal",
        "equipo",
        "elemento_limpieza",
        "documento",
    }


def test_categorias_endpoint_solo_expone_las_con_provider():
    data = client.get("/vencimientos/categorias").json()

    assert [c["valor"] for c in data] == ["elemento_limpieza"]


def test_categorias_endpoint_usa_la_etiqueta_legible():
    data = client.get("/vencimientos/categorias").json()

    assert data[0]["nombre"] == "Elementos de limpieza"


def test_categorias_endpoint_total_refleja_el_listado():
    tipo_id = crear_tipo_auxiliar()
    crear_con_urgencia("Vigente", 29, tipo_id=tipo_id)
    crear_con_urgencia("Proximo", 5, tipo_id=tipo_id)
    crear_con_urgencia("Vencido", -20, tipo_id=tipo_id)

    data = client.get("/vencimientos/categorias").json()

    # Sin corte por defecto, el total coincide con las tres filas del listado.
    assert data[0]["total"] == 3
    # Si el listado se acota, el total cuenta lo mismo que el listado: con
    # dias_max=5 entran el proximo (5) y el vencido (-20), y no el vigente.
    acotado = client.get("/vencimientos/categorias", params={"dias_max": 5}).json()
    assert acotado[0]["total"] == 2
    assert len(client.get("/vencimientos/", params={"dias_max": 5}).json()) == 2


def test_categorias_endpoint_lista_vacia_sin_datos():
    assert client.get("/vencimientos/categorias").json() == [
        {"valor": "elemento_limpieza", "nombre": "Elementos de limpieza", "total": 0}
    ]


def test_categorias_endpoint_rechaza_dias_max_negativo():
    assert client.get("/vencimientos/categorias", params={"dias_max": -1}).status_code == 422


# =============================================================================
# Resolucion del corte de dias
# =============================================================================

def test_resolver_corte_sin_filtro_de_estado():
    # Sin `dias_max` tampoco se recorta: "Todos los estados" tiene que poder
    # devolver a los vigentes.
    assert _resolver_corte(None, None) is None
    # Si el cliente acota la ventana, se respeta lo que pidio.
    assert _resolver_corte(None, Constantes.DIAS_AVISO_PROXIMO) == 15


def test_resolver_corte_levanta_el_tope_con_estado_vigente():
    assert _resolver_corte(EstadoVencimiento.VIGENTE, Constantes.DIAS_AVISO_PROXIMO) is None


def test_resolver_corte_mantiene_el_tope_en_el_resto_de_los_estados():
    for estado in (EstadoVencimiento.VENCIDO, EstadoVencimiento.PROXIMO):
        assert _resolver_corte(estado, Constantes.DIAS_AVISO_PROXIMO) == 15
        # Sin tope pedido, vencido y proximo abarcan toda la lista.
        assert _resolver_corte(estado, None) is None


def test_resolver_corte_respeta_un_tope_explicito():
    assert _resolver_corte(None, 3) == 3
    assert _resolver_corte(EstadoVencimiento.VENCIDO, 3) == 3


# =============================================================================
# Renovacion: un recambio registrado tiene que verse en la vista consolidada
# =============================================================================
# El tablero de vencimientos es read-only, pero la renovacion se dispara desde
# el: el boton "Renovar vencimiento" hace POST /recambios/ y despues recarga.
# estos tests fijan que ese ciclo efectivamente actualiza la proxima fecha.

def _fila(elemento_id):
    """Devuelve la fila consolidada de un elemento, o None si no esta."""
    for v in client.get("/vencimientos/").json():
        if v["id"] == f"elemento_limpieza:{elemento_id}":
            return v
    return None


def test_renovar_refleja_el_nuevo_vencimiento():
    elemento_id = crear_elemento_auxiliar("Escoba renovar", frecuencia=10)
    registrar_recambio(elemento_id, 15)  # proxima = hoy - 5, vencido

    antes = _fila(elemento_id)
    assert antes["fecha_vencimiento"] == (date.today() - timedelta(days=5)).isoformat()
    assert antes["estado"] == EstadoVencimiento.VENCIDO.value

    res = client.post("/recambios/", json={"elemento_id": elemento_id})

    assert res.status_code == 201

    # fecha_vencimiento es la proxima fecha debida, no la del recambio: renovar
    # hoy con frecuencia 10 corre el vencimiento 10 dias hacia adelante.
    despues = _fila(elemento_id)
    assert despues["fecha_vencimiento"] == (
        date.today() + timedelta(days=10)
    ).isoformat()
    assert despues["dias_restantes"] == 10
    assert despues["estado"] == EstadoVencimiento.PROXIMO.value


def test_renovar_con_frecuencia_larga_mantiene_la_fila_con_la_fecha_nueva():
    # Con frecuencia mayor a los 15 dias de aviso, renovar dejaba la fila con
    # estado "vigente". Antes el tablero la recortaba y "renovar" hacia
    # desaparecerla; al no haber corte por defecto, se sigue viendo con la
    # fecha nueva, que es lo que el usuario necesita confirmar.
    elemento_id = crear_elemento_auxiliar("Escoba holgada", frecuencia=40)
    registrar_recambio(elemento_id, 35)  # proxima = hoy + 5, proximo

    client.post("/recambios/", json={"elemento_id": elemento_id})

    fila = _fila(elemento_id)
    assert fila is not None
    assert fila["fecha_vencimiento"] == (date.today() + timedelta(days=40)).isoformat()
    assert fila["dias_restantes"] == 40
    assert fila["estado"] == EstadoVencimiento.VIGENTE.value


def test_renovar_con_frecuencia_corta_mantiene_la_fila_en_la_ventana():
    # Contraparte del anterior: con frecuencia <= 15 la fila sigue visible,
    # pero con la fecha nueva. El tablero no oculta lo recien renovado.
    elemento_id = crear_elemento_auxiliar("Escoba corta", frecuencia=10)
    registrar_recambio(elemento_id, 10)

    client.post("/recambios/", json={"elemento_id": elemento_id})

    fila = _fila(elemento_id)
    assert fila is not None
    assert fila["fecha_vencimiento"] == (date.today() + timedelta(days=10)).isoformat()
    assert fila["dias_restantes"] == 10


def test_renovar_un_elemento_no_afecta_a_los_demas():
    tipo_id = crear_tipo_auxiliar()
    a = crear_con_urgencia("Escoba A", 3, tipo_id=tipo_id, frecuencia=30)
    b = crear_con_urgencia("Escoba B", 4, tipo_id=tipo_id, frecuencia=30)

    antes_b = _fila(b)

    client.post("/recambios/", json={"elemento_id": a})

    assert _fila(b) == antes_b


def test_renovar_refleja_el_estado_vigente():
    # Renovar un elemento con frecuencia holgada lo deja vigente, y el estado
    # vigente levanta cualquier corte: se sigue viendo sin pedir nada.
    elemento_id = crear_elemento_auxiliar("Escoba vigente", frecuencia=40)
    registrar_recambio(elemento_id, 39)  # proxima = hoy + 1, proximo

    client.post("/recambios/", json={"elemento_id": elemento_id})

    fila = _fila(elemento_id)
    assert fila is not None  # sigue en el listado, ahora vigente
    assert fila["estado"] == EstadoVencimiento.VIGENTE.value
    assert fila["dias_restantes"] == 40
