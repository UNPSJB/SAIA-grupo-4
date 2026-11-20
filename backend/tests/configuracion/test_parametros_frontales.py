from fastapi.testclient import TestClient
from sqlalchemy import func, select

from src.auth.dependencies import get_current_user
from src.capacidades.constants import RolesSistema
from src.configuracion.constants import (
    EstadoVersionNormativa,
    NORMATIVA_INICIAL_NOMBRE,
    REGLAS_INICIALES_LEY_27642,
)
from src.configuracion.models import VersionParametroFrontal
from src.main import app
from tests.auth import helpers
from tests.database import session  # noqa: F401

client = TestClient(app)


# --- 1. SEED INICIAL AUTOMÁTICO (VERSIÓN 1 VIGENTE LEY 27.642 Y MÓDULO ACTIVO) ---

def test_seed_inicial_crea_version_1_vigente_y_modulo_activo(session):
    res = client.get("/configuracion/parametros-frontales")
    assert res.status_code == 200
    data = res.json()

    # Módulo de octógonos activo por defecto
    assert data["modulo"]["octogonos_activos"] is True

    # Versión 1 vigente con las reglas de la Ley 27.642
    vigente = data["version_vigente"]
    assert vigente["numero_version"] == 1
    assert vigente["estado"] == EstadoVersionNormativa.VIGENTE
    assert vigente["normativa_referencia"] == NORMATIVA_INICIAL_NOMBRE
    assert vigente["fecha_vigencia_hasta"] is None
    assert len(vigente["reglas"]) == len(REGLAS_INICIALES_LEY_27642)

    # Sin historial inicialmente
    assert data["historial"] == []


# --- 2. CREACIÓN DE NUEVA VERSIÓN, UNICIDAD DE VIGENTE E INMUTABILIDAD HISTÓRICA ---

def test_versionado_archiva_anterior_y_mantiene_unica_vigente(session):
    res_inicial = client.get("/configuracion/parametros-frontales")
    reglas_base = res_inicial.json()["version_vigente"]["reglas"]
    umbral_original_primer_item = reglas_base[0]["valor_umbral"]

    # Modificamos el umbral de la primera regla para la versión 2
    nuevas_reglas = [
        {
            "nutriente_critico": r["nutriente_critico"],
            "leyenda_sello": r["leyenda_sello"],
            "categoria": r["categoria"],
            "valor_umbral": 5.5 if idx == 0 else r["valor_umbral"],
            "unidad_umbral": r["unidad_umbral"],
            "condicion": r["condicion"],
        }
        for idx, r in enumerate(reglas_base)
    ]

    res_v2 = client.post(
        "/configuracion/parametros-frontales",
        json={
            "normativa_referencia": "Disposición ANMAT 2026 - Actualización",
            "motivo_cambio": "Ajuste de umbral de azúcares añadidos",
            "reglas": nuevas_reglas,
        },
    )
    assert res_v2.status_code == 200
    data_v2 = res_v2.json()

    # Nueva versión vigente es la #2
    vigente = data_v2["version_vigente"]
    assert vigente["numero_version"] == 2
    assert vigente["estado"] == EstadoVersionNormativa.VIGENTE
    assert vigente["normativa_referencia"] == "Disposición ANMAT 2026 - Actualización"
    assert vigente["motivo_cambio"] == "Ajuste de umbral de azúcares añadidos"
    assert vigente["creado_por_id"] is not None
    assert vigente["reglas"][0]["valor_umbral"] == 5.5

    # La versión #1 pasó al historial con fecha de cierre e intacta (inmutable)
    assert len(data_v2["historial"]) == 1
    historica = data_v2["historial"][0]
    assert historica["numero_version"] == 1
    assert historica["estado"] == EstadoVersionNormativa.HISTORICA
    assert historica["fecha_vigencia_hasta"] is not None
    assert historica["reglas"][0]["valor_umbral"] == umbral_original_primer_item

    # En base de datos solo existe 1 fila con estado VIGENTE
    total_vigentes = session.scalar(
        select(func.count())
        .select_from(VersionParametroFrontal)
        .where(VersionParametroFrontal.estado == EstadoVersionNormativa.VIGENTE)
    )
    assert total_vigentes == 1


# --- 3. VALIDACIONES DE PARÁMETROS NORMATIVOS ---

def test_validaciones_creacion_version(session):
    regla_valida = {
        "nutriente_critico": "SODIO",
        "leyenda_sello": "EXCESO EN SODIO",
        "categoria": "ALIMENTO",
        "valor_umbral": 300.0,
        "unidad_umbral": "mg cada 100 g",
        "condicion": ">= 300 mg",
    }

    # Normativa vacía -> 422
    res_sin_norma = client.post(
        "/configuracion/parametros-frontales",
        json={
            "normativa_referencia": "   ",
            "reglas": [regla_valida],
        },
    )
    assert res_sin_norma.status_code == 422

    # Umbral menor o igual a 0 -> 422
    regla_invalida = {**regla_valida, "valor_umbral": 0}
    res_umbral_cero = client.post(
        "/configuracion/parametros-frontales",
        json={
            "normativa_referencia": "Ley Test",
            "reglas": [regla_invalida],
        },
    )
    assert res_umbral_cero.status_code == 422

    # Lista de reglas vacía -> 422
    res_sin_reglas = client.post(
        "/configuracion/parametros-frontales",
        json={
            "normativa_referencia": "Ley Test",
            "reglas": [],
        },
    )
    assert res_sin_reglas.status_code == 422


# --- 4. SWITCH DE APLICABILIDAD DEL MÓDULO DE OCTÓGONOS ---

def test_toggle_modulo_octogonos(session):
    # Desactivar módulo de octógonos
    res_off = client.patch(
        "/configuracion/modulo-octogonos",
        json={
            "octogonos_activos": False,
            "observacion": "Elaboración exclusiva de insumos industriales B2B",
        },
    )
    assert res_off.status_code == 200
    data_off = res_off.json()
    assert data_off["octogonos_activos"] is False
    assert data_off["observacion"] == "Elaboración exclusiva de insumos industriales B2B"
    assert data_off["modificado_por_id"] is not None

    # Volver a activar
    res_on = client.patch(
        "/configuracion/modulo-octogonos",
        json={"octogonos_activos": True, "observacion": "Reactivado"},
    )
    assert res_on.status_code == 200
    assert res_on.json()["octogonos_activos"] is True


# --- 5. PERMISOS (ANÓNIMO 401 Y OPERADOR 403) ---

def test_permisos_endpoints_parametros_frontales(session):
    app.dependency_overrides.pop(get_current_user, None)
    unauth_client = TestClient(app)

    assert unauth_client.get("/configuracion/parametros-frontales").status_code == 401
    assert unauth_client.post("/configuracion/parametros-frontales", json={}).status_code == 401
    assert unauth_client.patch(
        "/configuracion/modulo-octogonos",
        json={"octogonos_activos": False},
    ).status_code == 401

    caps = helpers.capacidades_sistema(session)
    helpers.crear_persona(
        session,
        "Operador",
        "33445566",
        caps[RolesSistema.OPERAR],
        password_hash=helpers.HASH_OPERADOR,
    )
    op_client = TestClient(app)
    token_op = helpers.iniciar_sesion(op_client, "33445566", helpers.OPERADOR_PASSWORD)
    headers_op = helpers.auth_headers(token_op)

    assert op_client.get("/configuracion/parametros-frontales", headers=headers_op).status_code == 403
    assert op_client.patch(
        "/configuracion/modulo-octogonos",
        json={"octogonos_activos": False},
        headers=headers_op,
    ).status_code == 403