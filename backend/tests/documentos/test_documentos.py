import pytest
import uuid
import random
import json
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.personal.models import Persona

client = TestClient(app)

def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"

@pytest.fixture
def autor_base(session):
    """Crea una Persona activa en la base de datos para usar como creador."""
    dni = str(random.randint(10000000, 99999999))
    legajo = random.randint(1000, 9999)
    p = Persona(nombre="Doc", apellido="Tester", dni=dni, legajo=legajo, activo=True)
    
    session.add(p)
    session.commit()
    session.refresh(p)
    return p.id


def test_crear_documento_con_archivo_y_autogeneracion_codigo(autor_base):
    payload = {
        "titulo": "Procedimiento de Prueba",
        "tipo_documento": "PROCEDIMIENTO",
        "creado_por_id": autor_base
    }
    archivo_falso = ("prueba.pdf", b"contenido_falso", "application/pdf")

    res = client.post(
        "/documentos/",
        data={"datos": json.dumps(payload)},
        files={"archivo": archivo_falso}
    )
    
    assert res.status_code == 201
    data = res.json()
    
    # Validaciones de la carátula
    assert data["titulo"] == payload["titulo"]
    assert data["codigo"].startswith("POES-") # Verifica autogeneración
    assert data["activo"] is True
    
    # Validaciones de la versión inicial
    assert data["version_vigente"] is not None
    assert data["version_vigente"]["version"] == "v1.0"
    assert data["version_vigente"]["es_vigente"] is True
    # Nombre completo de la persona que subió la versión (fixture: "Doc Tester")
    assert data["version_vigente"]["subido_por_nombre"] == "Doc Tester"
    assert len(data["versiones"]) == 1

def test_crear_documento_sin_archivo_queda_pendiente(autor_base):
    payload = {
        "titulo": "Planilla Vacía",
        "tipo_documento": "PLANILLA",
        "creado_por_id": autor_base
    }
    
    # Se envía solo el data, sin el parámetro files
    res = client.post(
        "/documentos/",
        data={"datos": json.dumps(payload)}
    )
    
    assert res.status_code == 201
    data = res.json()
    
    # Se debe crear el cascarón pero sin versiones
    assert data["codigo"].startswith("PLA-")
    assert data["version_vigente"] is None
    assert len(data["versiones"]) == 0

def test_crear_documento_codigo_duplicado_falla(autor_base):
    codigo_manual = generar_string_unico("MANUAL")
    payload = {
        "codigo": codigo_manual,
        "titulo": "Doc 1",
        "tipo_documento": "MANUAL_BPM",
        "creado_por_id": autor_base
    }
    
    # Primer insert (Exitoso)
    client.post("/documentos/", data={"datos": json.dumps(payload)})
    
    # Segundo insert con el mismo código manual (Debe fallar)
    payload["titulo"] = "Doc 2"
    res_conflicto = client.post("/documentos/", data={"datos": json.dumps(payload)})
    
    assert res_conflicto.status_code == 409
    assert res_conflicto.json()["detail"] == "El código asignado ya está siendo utilizado por otro documento."


def test_crear_documento_codigo_duplicado_inactivo_ofrece_reactivacion(autor_base):
    codigo_manual = generar_string_unico("MANUAL")
    payload = {
        "codigo": codigo_manual,
        "titulo": "Doc Reactivable",
        "tipo_documento": "MANUAL_BPM",
        "creado_por_id": autor_base
    }

    # Alta exitosa y posterior baja lógica
    res_post = client.post("/documentos/", data={"datos": json.dumps(payload)})
    assert res_post.status_code == 201
    doc_id = res_post.json()["id"]
    res_del = client.delete(f"/documentos/{doc_id}")
    assert res_del.status_code == 204

    # Reintento con el mismo código: en lugar del error genérico de duplicado
    # debe devolver el id para que el frontend ofrezca reactivarlo
    payload["titulo"] = "Doc Nuevo"
    res_conflicto = client.post("/documentos/", data={"datos": json.dumps(payload)})

    assert res_conflicto.status_code == 409
    detail = res_conflicto.json()["detail"]
    assert detail["documento_id"] == doc_id
    assert "code" in detail


def test_eliminar_y_reactivar_documento(autor_base):
    payload = {"titulo": "Doc a Reactivar", "tipo_documento": "INSTRUCTIVO", "creado_por_id": autor_base}
    res_post = client.post("/documentos/", data={"datos": json.dumps(payload)})
    doc_id = res_post.json()["id"]

    # Baja lógica
    res_del = client.delete(f"/documentos/{doc_id}")
    assert res_del.status_code == 204

    # Reactivación
    res_put = client.patch(f"/documentos/{doc_id}", json={"activo": True})
    assert res_put.status_code == 200
    assert res_put.json()["activo"] is True

def test_modificar_documento_inactivo_bloqueado(autor_base):
    payload = {"titulo": "Doc Bloqueado", "tipo_documento": "OTRO", "creado_por_id": autor_base}
    res_post = client.post("/documentos/", data={"datos": json.dumps(payload)})
    doc_id = res_post.json()["id"]

    # Se da de baja
    client.delete(f"/documentos/{doc_id}")

    # se intenta cambiar el título a un doc inactivo
    res_patch = client.patch(f"/documentos/{doc_id}", json={"titulo": "Intento de Hackeo"})
    
    # Debe rebotar porque solo acepta {"activo": True} cuando está inactivo
    assert res_patch.status_code == 409 
    
def test_bloquear_baja_por_patch(autor_base):
    payload = {"titulo": "Doc Baja por Patch", "tipo_documento": "OTRO", "creado_por_id": autor_base}
    res_post = client.post("/documentos/", data={"datos": json.dumps(payload)})
    doc_id = res_post.json()["id"]

    # Se intenta dar de baja enviando activo=False por PATCH
    res_patch = client.patch(f"/documentos/{doc_id}", json={"activo": False})
    
    assert res_patch.status_code == 400


def test_ciclo_completo_versiones_y_vigencia(autor_base):
    # Se crea un documento base con v1.0
    payload_doc = {"titulo": "Evolución", "tipo_documento": "PROCEDIMIENTO", "creado_por_id": autor_base}
    res_doc = client.post(
        "/documentos/", 
        data={"datos": json.dumps(payload_doc)}, 
        files={"archivo": ("v1.pdf", b"pdf1", "application/pdf")}
    )
    doc_id = res_doc.json()["id"]
    
    # Se agrega versión v2.0
    payload_v2 = {"version": "v2.0", "creado_por_id": autor_base, "observaciones_cambio": "Cambios anuales"}
    res_v2 = client.post(
        f"/documentos/{doc_id}/versiones", 
        data={"datos": json.dumps(payload_v2)}, 
        files={"archivo": ("v2.pdf", b"pdf2", "application/pdf")}
    )
    
    assert res_v2.status_code == 201
    v2_id = res_v2.json()["id"]
    # Se verifica que entra como NO vigente para no pisar la operativa
    assert res_v2.json()["es_vigente"] is False 

    # Se marca la v2.0 como vigente
    res_vigencia = client.patch(f"/documentos/{doc_id}/versiones/{v2_id}/vigencia")
    assert res_vigencia.status_code == 200
    
    data_final = res_vigencia.json()
    
    # Se valida que el puntero general se actualizó a v2.0
    assert data_final["version_vigente"]["version"] == "v2.0"
    
    # Se buscan los detalles de cada versión en el historial
    v1 = next(v for v in data_final["versiones"] if v["version"] == "v1.0")
    v2 = next(v for v in data_final["versiones"] if v["version"] == "v2.0")
    
    # Se valida que la v1 quedó archivada (perdió vigencia y tiene fecha de cierre)
    assert v1["es_vigente"] is False
    assert v1["fecha_hasta"] is not None
    
    # Se valida que la v2 es la oficial
    assert v2["es_vigente"] is True
    assert v2["fecha_hasta"] is None
    
def test_renovar_version_vigencia(autor_base):
    # Se crea un documento con su versión inicial
    payload_doc = {
        "titulo": "Procedimiento Anual", 
        "tipo_documento": "PROCEDIMIENTO", 
        "creado_por_id": autor_base,
        "observaciones_cambio": "Creación inicial"
    }
    res_doc = client.post(
        "/documentos/", 
        data={"datos": json.dumps(payload_doc)}, 
        files={"archivo": ("v1.pdf", b"pdf1", "application/pdf")}
    )
    doc_id = res_doc.json()["id"]
    version_id = res_doc.json()["version_vigente"]["id"]

    # Se registra la revisión/renovación (sin subir archivo nuevo)
    payload_renovacion = {
        "fecha_proxima_revision": "2027-10-05",
        "observaciones": "Revisión anual completada. Sigue vigente."
    }
    res_renovar = client.patch(
        f"/documentos/{doc_id}/versiones/{version_id}/renovar",
        json=payload_renovacion
    )
    
    assert res_renovar.status_code == 200
    data = res_renovar.json()
    version_renovada = data["version_vigente"]
    
    # Se valida que la fecha se haya actualizado
    assert version_renovada["fecha_proxima_revision"] == "2027-10-05"
    
    # Se valida la trazabilidad (concatenación del texto)
    assert "Creación inicial" in version_renovada["observaciones_cambio"]
    assert "Revisión anual completada" in version_renovada["observaciones_cambio"]
    assert "[Revisión" in version_renovada["observaciones_cambio"]