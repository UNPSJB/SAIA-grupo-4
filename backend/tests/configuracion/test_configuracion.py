from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from src.auth.dependencies import get_current_user
from src.capacidades.constants import RolesSistema
from src.configuracion.constants import Constantes, ErrorCode
from src.configuracion.models import ConfiguracionSistema
from src.configuracion.services import UPLOAD_DIR
from src.main import app
from tests.auth import helpers
from tests.database import session  # noqa: F401

client = TestClient(app)


# --- 1. CONFIGURACIÓN POR DEFECTO Y REGISTRO ÚNICO (SINGLETON) ---

def test_obtener_configuracion_crea_registro_unico_por_defecto(session):
    res1 = client.get("/configuracion")
    assert res1.status_code == 200
    data = res1.json()
    assert data["id"] == 1
    assert data["nombre_establecimiento"] == Constantes.NOMBRE_DEFECTO
    assert data["logo_url"] is None

    # Segunda lectura o actualización no debe duplicar filas en la tabla
    res2 = client.put(
        "/configuracion",
        json={
            "nombre_establecimiento": "Planta Sur",
            "razon_social": "Alimentos del Sur S.R.L.",
            "cuit": "30-71234567-9",
            "direccion": "Av. Industrial 123",
            "localidad": "Trelew",
            "provincia": "Chubut",
            "telefono": "2804123456",
            "email": "contacto@plantasur.com",
            "sitio_web": "https://plantasur.com",
            "pie_informes": "Documento de uso interno",
        },
    )
    assert res2.status_code == 200
    actualizado = res2.json()
    assert actualizado["id"] == 1
    assert actualizado["nombre_establecimiento"] == "Planta Sur"
    assert actualizado["cuit"] == "30712345679"
    assert actualizado["modificado_por_id"] is not None
    assert actualizado["modificado_por_nombre"] is not None

    total_filas = session.scalar(select(func.count()).select_from(ConfiguracionSistema))
    assert total_filas == 1


# --- 2. ENDPOINT PÚBLICO (SCHEMA REDUCIDO Y SIN AUTENTICACIÓN) ---

def test_endpoint_publico_sin_auth_y_schema_reducido(session):
    client.put(
        "/configuracion",
        json={
            "nombre_establecimiento": "Establecimiento Público",
            "razon_social": "Razón Social Privada S.A.",
            "cuit": "30112233445",
            "direccion": "Calle Falsa 123",
            "localidad": "Rawson",
            "provincia": "Chubut",
            "telefono": "2804000000",
            "email": "info@establecimiento.com",
            "sitio_web": "https://establecimiento.com",
            "pie_informes": "Pie institucional",
        },
    )

    # Quitamos el override de auth para simular un visitante anónimo
    app.dependency_overrides.pop(get_current_user, None)
    anon_client = TestClient(app)

    res_pub = anon_client.get("/configuracion/publica")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()

    assert pub_data["nombre_establecimiento"] == "Establecimiento Público"
    assert pub_data["direccion"] == "Calle Falsa 123"
    assert pub_data["telefono"] == "2804000000"
    assert pub_data["email"] == "info@establecimiento.com"
    assert pub_data["sitio_web"] == "https://establecimiento.com"
    assert pub_data["pie_informes"] == "Pie institucional"

    # Datos fiscales e internos no se exponen en el endpoint público
    assert "cuit" not in pub_data
    assert "razon_social" not in pub_data
    assert "modificado_por_id" not in pub_data


# --- 3. VALIDACIONES DE CAMPOS (NOMBRE, CUIT, EMAIL, LONGITUDES) ---

def test_validaciones_nombre_cuit_email_y_longitudes(session):
    # Nombre vacío o solo espacios -> 422
    res_nombre = client.put("/configuracion", json={"nombre_establecimiento": "   "})
    assert res_nombre.status_code == 422

    # CUIT con menos de 11 dígitos o con letras -> 422
    for cuit_invalido in ("1234567890", "301234567890", "30ABCD56789"):
        res_cuit = client.put(
            "/configuracion",
            json={"nombre_establecimiento": "SAIA", "cuit": cuit_invalido},
        )
        assert res_cuit.status_code == 422

    # Email con formato inválido -> 422
    res_email = client.put(
        "/configuracion",
        json={"nombre_establecimiento": "SAIA", "email": "correo-invalido"},
    )
    assert res_email.status_code == 422

    # Longitud máxima excedida en nombre (> 150 caracteres) -> 422
    res_largo = client.put(
        "/configuracion",
        json={"nombre_establecimiento": "A" * 151},
    )
    assert res_largo.status_code == 422


# --- 4. SUBIDA, REEMPLAZO, VALIDACIÓN Y ELIMINACIÓN DE LOGO ---

def test_subir_reemplazar_y_eliminar_logo(session):
    # 1. Subir primer logo PNG válido
    logo_1 = ("logo1.png", b"\x89PNG\r\n\x1a\ncontenido_png_1", "image/png")
    res_subida1 = client.post("/configuracion/logo", files={"logo": logo_1})
    assert res_subida1.status_code == 200
    url_1 = res_subida1.json()["logo_url"]
    assert url_1 is not None
    assert url_1.startswith("uploads/configuracion/logo_")
    assert url_1.endswith(".png")

    archivo_fisico_1 = UPLOAD_DIR / Path(url_1).name
    assert archivo_fisico_1.is_file()

    # 2. Reemplazar por un segundo logo WebP (debe borrar el archivo anterior)
    logo_2 = ("logo2.webp", b"RIFF____WEBPcontenido_2", "image/webp")
    res_subida2 = client.post("/configuracion/logo", files={"logo": logo_2})
    assert res_subida2.status_code == 200
    url_2 = res_subida2.json()["logo_url"]
    assert url_2 != url_1
    assert url_2.endswith(".webp")

    archivo_fisico_2 = UPLOAD_DIR / Path(url_2).name
    assert archivo_fisico_2.is_file()
    assert not archivo_fisico_1.exists()

    # 3. Eliminar logo (debe limpiar la DB y borrar el archivo físico)
    res_del = client.delete("/configuracion/logo")
    assert res_del.status_code == 200
    assert res_del.json()["logo_url"] is None
    assert not archivo_fisico_2.exists()


def test_validaciones_de_formato_y_tamano_de_logo(session):
    # Formato no permitido (SVG / TXT) -> 400
    archivo_invalido = ("malicioso.txt", b"texto plano", "text/plain")
    res_formato = client.post("/configuracion/logo", files={"logo": archivo_invalido})
    assert res_formato.status_code == 400
    assert res_formato.json()["detail"] == ErrorCode.ARCHIVO_LOGO_INVALIDO

    # Archivo que supera los 2 MB -> 400
    bytes_grandes = b"x" * (Constantes.MAX_LOGO_SIZE_BYTES + 10)
    archivo_pesado = ("grande.jpg", bytes_grandes, "image/jpeg")
    res_pesado = client.post("/configuracion/logo", files={"logo": archivo_pesado})
    assert res_pesado.status_code == 400
    assert res_pesado.json()["detail"] == ErrorCode.ARCHIVO_LOGO_MUY_GRANDE


# --- 5. PERMISOS (ANÓNIMO 401 Y OPERADOR 403) ---

def test_permisos_endpoints_administracion(session):
    app.dependency_overrides.pop(get_current_user, None)
    unauth_client = TestClient(app)

    # Sin token -> 401 en todos los endpoints de administración
    assert unauth_client.get("/configuracion").status_code == 401
    assert unauth_client.put("/configuracion", json={"nombre_establecimiento": "X"}).status_code == 401
    assert unauth_client.post(
        "/configuracion/logo",
        files={"logo": ("a.png", b"123", "image/png")},
    ).status_code == 401
    assert unauth_client.delete("/configuracion/logo").status_code == 401

    # Con token de Operador (sin capacidad administrar) -> 403
    caps = helpers.capacidades_sistema(session)
    helpers.crear_persona(
        session,
        "Operador",
        "22334455",
        caps[RolesSistema.OPERAR],
        password_hash=helpers.HASH_OPERADOR,
    )
    op_client = TestClient(app)
    token_op = helpers.iniciar_sesion(op_client, "22334455", helpers.OPERADOR_PASSWORD)
    headers_op = helpers.auth_headers(token_op)

    assert op_client.get("/configuracion", headers=headers_op).status_code == 403
    assert op_client.put(
        "/configuracion",
        json={"nombre_establecimiento": "X"},
        headers=headers_op,
    ).status_code == 403
    assert op_client.delete("/configuracion/logo", headers=headers_op).status_code == 403