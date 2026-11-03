import pytest
import uuid
import random
import json
from datetime import date, timedelta
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.personal.models import Persona
from src.documentos.constants import Constantes, EstadoVencimiento
from src.documentos.services import calcular_estado_vencimiento

client = TestClient(app)

def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


def crear_documento(
    autor_id: int,
    titulo: str,
    tipo_documento: str,
    descripcion: str | None = None,
) -> dict:
    payload = {
        "titulo": titulo,
        "tipo_documento": tipo_documento,
        "creado_por_id": autor_id,
    }
    if descripcion is not None:
        payload["descripcion"] = descripcion

    res = client.post("/documentos/", data={"datos": json.dumps(payload)})
    assert res.status_code == 201, res.text
    return res.json()

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


def test_listar_documentos_filtra_por_texto_tipo_y_estado(autor_base):
    sufijo = uuid.uuid4().hex[:8]
    procedimiento = crear_documento(
        autor_base,
        f"Procedimiento Único {sufijo}",
        "PROCEDIMIENTO",
        descripcion=f"Descripción especial {sufijo}",
    )
    manual = crear_documento(
        autor_base,
        f"Manual de planta {sufijo}",
        "MANUAL_BPM",
    )
    inactivo = crear_documento(
        autor_base,
        f"Instructivo dado de baja {sufijo}",
        "INSTRUCTIVO",
    )
    assert client.delete(f"/documentos/{inactivo['id']}").status_code == 204

    # Búsqueda sin mayúsculas ni acentos sobre el título.
    res_texto = client.get(
        "/documentos/",
        params={"busqueda": f"procedimiento unico {sufijo}"},
    )
    assert res_texto.status_code == 200, res_texto.text
    assert {d["id"] for d in res_texto.json()} == {procedimiento["id"]}

    # La misma búsqueda también alcanza la descripción.
    res_descripcion = client.get(
        "/documentos/",
        params={"busqueda": f"descripcion especial {sufijo}"},
    )
    assert res_descripcion.status_code == 200, res_descripcion.text
    assert {d["id"] for d in res_descripcion.json()} == {procedimiento["id"]}

    res_tipo = client.get(
        "/documentos/",
        params={"tipo_documento": "MANUAL_BPM"},
    )
    assert res_tipo.status_code == 200, res_tipo.text
    assert {d["id"] for d in res_tipo.json()} == {manual["id"]}

    res_inactivos = client.get("/documentos/", params={"activo": "false"})
    assert res_inactivos.status_code == 200, res_inactivos.text
    assert {d["id"] for d in res_inactivos.json()} == {inactivo["id"]}

    # Los filtros se combinan entre sí.
    res_combinado = client.get(
        "/documentos/",
        params={
            "busqueda": f"procedimiento unico {sufijo}",
            "tipo_documento": "PROCEDIMIENTO",
            "activo": "true",
        },
    )
    assert res_combinado.status_code == 200, res_combinado.text
    assert {d["id"] for d in res_combinado.json()} == {procedimiento["id"]}


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
        "observaciones": "Revisión anual completada. Sigue vigente.",
        "registrado_por_id": autor_base
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
    
    assert version_renovada["observaciones_cambio"] == "Creación inicial"

    # El historial de revisiones queda como fila propia, con quién la registró
    res_hist = client.get(f"/documentos/{doc_id}/versiones/{version_id}/revisiones")
    assert res_hist.status_code == 200
    revisiones = res_hist.json()
    assert len(revisiones) == 1
    assert revisiones[0]["nueva_fecha_proxima_revision"] == "2027-10-05"
    assert revisiones[0]["observaciones"] == "Revisión anual completada. Sigue vigente."
    # Nombre completo de la persona que registró la revisión (fixture: "Doc Tester")
    assert revisiones[0]["registrado_por_nombre"] == "Doc Tester"


def test_renovar_solo_observaciones_mantiene_fecha(autor_base):
    # Documento con versión inicial SIN fecha de revisión programada
    payload_doc = {
        "titulo": "Instructivo Sin Fecha",
        "tipo_documento": "INSTRUCTIVO",
        "creado_por_id": autor_base
    }
    res_doc = client.post(
        "/documentos/",
        data={"datos": json.dumps(payload_doc)},
        files={"archivo": ("v1.pdf", b"pdf1", "application/pdf")}
    )
    doc_id = res_doc.json()["id"]
    version_id = res_doc.json()["version_vigente"]["id"]

    # Revisión sin fecha nueva: solo se asienta la nota de auditoría
    res_renovar = client.patch(
        f"/documentos/{doc_id}/versiones/{version_id}/renovar",
        json={"observaciones": "Se verifica que el procedimiento sigue vigente."}
    )
    assert res_renovar.status_code == 200
    version = res_renovar.json()["version_vigente"]

    # La fecha no se toca (sigue sin programar) y la nota queda en el historial
    assert version["fecha_proxima_revision"] is None
    res_hist = client.get(f"/documentos/{doc_id}/versiones/{version_id}/revisiones")
    revisiones = res_hist.json()
    assert len(revisiones) == 1
    assert revisiones[0]["nueva_fecha_proxima_revision"] is None
    assert revisiones[0]["registrado_por_id"] is None
    assert revisiones[0]["registrado_por_nombre"] is None


def test_renovar_sin_fecha_ni_observaciones_rechazado(autor_base):
    payload_doc = {
        "titulo": "Documento Sin Datos",
        "tipo_documento": "OTRO",
        "creado_por_id": autor_base
    }
    res_doc = client.post(
        "/documentos/",
        data={"datos": json.dumps(payload_doc)},
        files={"archivo": ("v1.pdf", b"pdf1", "application/pdf")}
    )
    doc_id = res_doc.json()["id"]
    version_id = res_doc.json()["version_vigente"]["id"]

    # Sin fecha y sin observaciones no hay nada que registrar
    res_renovar = client.patch(
        f"/documentos/{doc_id}/versiones/{version_id}/renovar",
        json={"observaciones": "   "}
    )
    assert res_renovar.status_code == 422


# Test de alertas de vencimeinto de próximas revisiones, con la regla de semaforización

def test_calcular_estado_vencimiento_vencido():
    hoy = date(2026, 1, 20)
    dias, estado = calcular_estado_vencimiento(date(2026, 1, 10), hoy)
    assert dias == -10
    assert estado == EstadoVencimiento.VENCIDO


def test_calcular_estado_vencimiento_vence_hoy_es_proximo():
    hoy = date(2026, 1, 20)
    dias, estado = calcular_estado_vencimiento(hoy, hoy)
    assert dias == 0
    assert estado == EstadoVencimiento.PROXIMO


def test_calcular_estado_vencimiento_limite_proximo():
    hoy = date(2026, 1, 20)
    limite = hoy + timedelta(days=Constantes.DIAS_AVISO_PROXIMO)
    _, estado = calcular_estado_vencimiento(limite, hoy)
    assert estado == EstadoVencimiento.PROXIMO


def test_calcular_estado_vencimiento_al_dia():
    hoy = date(2026, 1, 20)
    fuera_de_rango = hoy + timedelta(days=Constantes.DIAS_AVISO_PROXIMO + 1)
    _, estado = calcular_estado_vencimiento(fuera_de_rango, hoy)
    assert estado == EstadoVencimiento.AL_DIA


def _crear_documento_con_revision(autor_id, fecha_proxima_revision, titulo="Doc Alerta"):
    payload = {
        "titulo": titulo,
        "tipo_documento": "PROCEDIMIENTO",
        "creado_por_id": autor_id,
        "fecha_proxima_revision": fecha_proxima_revision,
    }
    res = client.post(
        "/documentos/",
        data={"datos": json.dumps(payload)},
        files={"archivo": ("v1.pdf", b"pdf1", "application/pdf")}
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_listar_alertas_ordena_por_urgencia_y_excluye(autor_base):
    hoy = date.today()
    doc_vencido = _crear_documento_con_revision(
        autor_base, (hoy - timedelta(days=5)).isoformat(), "Vencido"
    )
    doc_proximo = _crear_documento_con_revision(
        autor_base, (hoy + timedelta(days=3)).isoformat(), "Próximo"
    )
    doc_al_dia = _crear_documento_con_revision(
        autor_base, (hoy + timedelta(days=60)).isoformat(), "Al día"
    )
    # Sin próxima revisión: no debe aparecer
    _crear_documento_con_revision(autor_base, None, "Sin fecha")
    # Dado de baja: no debe aparecer aunque tenga fecha
    doc_baja = _crear_documento_con_revision(
        autor_base, (hoy - timedelta(days=1)).isoformat(), "De baja"
    )
    assert client.delete(f"/documentos/{doc_baja}").status_code == 204

    res = client.get("/documentos/alertas")
    assert res.status_code == 200
    alertas = res.json()

    # Sólo los tres documentos activos con revisión, ordenados por urgencia
    ids = [a["documento"]["id"] for a in alertas]
    assert ids == [doc_vencido, doc_proximo, doc_al_dia]

    # Estados y días restantes coherentes
    por_id = {a["documento"]["id"]: a for a in alertas}
    assert por_id[doc_vencido]["estado"] == EstadoVencimiento.VENCIDO
    assert por_id[doc_vencido]["dias_restantes"] == -5
    assert por_id[doc_proximo]["estado"] == EstadoVencimiento.PROXIMO
    assert por_id[doc_proximo]["dias_restantes"] == 3
    assert por_id[doc_al_dia]["estado"] == EstadoVencimiento.AL_DIA
    assert por_id[doc_al_dia]["dias_restantes"] == 60

    # El schema expone la carátula del documento, no sólo el id
    assert por_id[doc_vencido]["documento"]["titulo"] == "Vencido"
    assert por_id[doc_vencido]["documento"]["codigo"].startswith("POES-")
    assert por_id[doc_vencido]["proxima_revision"] == (hoy - timedelta(days=5)).isoformat()


def test_listar_alertas_sin_documentos_devuelve_vacio():
    res = client.get("/documentos/alertas")
    assert res.status_code == 200
    assert res.json() == []


def test_version_formato_invalido_rechazada(autor_base):
    doc = crear_documento(autor_base, "Doc Formato Version", "PROCEDIMIENTO")
    doc_id = doc["id"]

    for version_invalida in ["abc", "1", "v1", "1.0.0", "0.5"]:
        res = client.post(
            f"/documentos/{doc_id}/versiones",
            data={"datos": json.dumps({"version": version_invalida, "creado_por_id": autor_base})},
            files={"archivo": ("v.pdf", b"pdf", "application/pdf")},
        )
        assert res.status_code == 400, f"Debería rechazar {version_invalida}"


def test_version_incremental_obligatoria_y_normalizacion(autor_base):
    payload_doc = {
        "titulo": "Doc Incremental",
        "tipo_documento": "PROCEDIMIENTO",
        "creado_por_id": autor_base,
        "version_inicial": "1.0",
    }
    res_doc = client.post(
        "/documentos/",
        data={"datos": json.dumps(payload_doc)},
        files={"archivo": ("v1.pdf", b"pdf1", "application/pdf")},
    )
    assert res_doc.status_code == 201
    assert res_doc.json()["version_vigente"]["version"] == "v1.0"
    doc_id = res_doc.json()["id"]

    # Intentar subir la misma versión (1.0 / v1.0) debe fallar
    res_igual = client.post(
        f"/documentos/{doc_id}/versiones",
        data={"datos": json.dumps({"version": "1.0", "creado_por_id": autor_base})},
        files={"archivo": ("v1_dup.pdf", b"pdf", "application/pdf")},
    )
    assert res_igual.status_code == 400

    # Subir versión menor incremental ("1.1" sin 'v') se acepta y normaliza a "v1.1"
    res_v1_1 = client.post(
        f"/documentos/{doc_id}/versiones",
        data={"datos": json.dumps({"version": "1.1", "creado_por_id": autor_base})},
        files={"archivo": ("v1_1.pdf", b"pdf", "application/pdf")},
    )
    assert res_v1_1.status_code == 201
    assert res_v1_1.json()["version"] == "v1.1"

    # Subir v2.0 se acepta
    res_v2 = client.post(
        f"/documentos/{doc_id}/versiones",
        data={"datos": json.dumps({"version": "v2.0", "creado_por_id": autor_base})},
        files={"archivo": ("v2.pdf", b"pdf", "application/pdf")},
    )
    assert res_v2.status_code == 201
    assert res_v2.json()["version"] == "v2.0"

    # Intentar subir una versión menor a la máxima existente (ej. v1.5 < v2.0) debe fallar
    res_menor = client.post(
        f"/documentos/{doc_id}/versiones",
        data={"datos": json.dumps({"version": "v1.5", "creado_por_id": autor_base})},
        files={"archivo": ("v1_5.pdf", b"pdf", "application/pdf")},
    )
    assert res_menor.status_code == 400
