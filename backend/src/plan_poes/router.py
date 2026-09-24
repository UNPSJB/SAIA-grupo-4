from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.plan_poes import schemas, services, exceptions


router = APIRouter(prefix="/planes-poes", tags=["planes_poes"])

# RUTAS DE PLAN POES

@router.get("/activo", response_model=schemas.PlanPOES)
def obtener_plan_activo(db: Session = Depends(get_db)):
    """Devuelve el plan que se encuentra actualmente vigente."""
    plan = services.obtener_plan_activo(db)
    if not plan:
        # Reutilizamos la excepción por si no hay plan activo
        raise exceptions.PlanPOESNoEncontrado()
    return plan

@router.get("/borrador", response_model=schemas.PlanPOES)
def obtener_plan_borrador(db: Session = Depends(get_db)):
    """Devuelve el plan que se encuentra en estado borrador (si existe)."""
    plan = services.obtener_plan_borrador(db)
    if not plan:
        raise exceptions.PlanPOESNoEncontrado()
    return plan

@router.get("/", response_model=list[schemas.PlanPOES])
def listar_planes(db: Session = Depends(get_db)):
    """Lista el historial completo de planes POES."""
    return services.listar_planes(db)

@router.get("/{plan_id}", response_model=schemas.PlanPOES)
def obtener_plan(plan_id: int, db: Session = Depends(get_db)):
    """Obtiene un plan específico por su ID."""
    return services.obtener_plan_por_id(db, plan_id)

@router.post("/", response_model=schemas.PlanPOES, status_code=201)
def crear_plan(plan: schemas.PlanPOESCreate, db: Session = Depends(get_db)):
    """Crea un nuevo plan en estado borrador."""
    return services.crear_plan_borrador(db, plan)

@router.patch("/{plan_id}", response_model=schemas.PlanPOES)
def modificar_plan(plan_id: int, plan: schemas.PlanPOESUpdate, db: Session = Depends(get_db)):
    """Modifica la carátula de un plan (Borrador o Activo)."""
    return services.modificar_plan(db, plan_id, plan)

# --- ACCIONES DE ESTADO DEL PLAN ---

@router.post("/{plan_id}/activar", response_model=schemas.PlanPOES)
def activar_plan(plan_id: int, db: Session = Depends(get_db)):
    """Pasa un borrador a estado activo, archivando el anterior."""
    return services.activar_plan(db, plan_id)

@router.post("/{plan_id}/archivar", response_model=schemas.PlanPOES)
def archivar_plan(plan_id: int, db: Session = Depends(get_db)):
    """Archiva el plan activo actual."""
    return services.archivar_plan(db, plan_id)

@router.delete("/{plan_id}/descartar", status_code=204)
def descartar_borrador(plan_id: int, db: Session = Depends(get_db)):
    """Elimina físicamente un plan en estado borrador."""
    services.descartar_borrador(db, plan_id)
    return None

@router.post("/{plan_id}/clonar", response_model=schemas.PlanPOES, status_code=201)
def clonar_plan_historico(
    plan_id: int, 
    elaborado_por_id: int = Query(..., description="ID del usuario que elabora el nuevo borrador"),
    db: Session = Depends(get_db)
):
    """Clona un plan histórico para generar un nuevo borrador."""
    return services.clonar_plan_historico(db, plan_id, elaborado_por_id)


# RUTAS DE TAREAS POES

@router.get("/{plan_id}/tareas", response_model=list[schemas.TareaPOES])
def listar_tareas_de_plan(plan_id: int, db: Session = Depends(get_db)):
    """Lista todas las tareas activas de un plan específico."""
    return services.listar_tareas_por_plan(db, plan_id)

@router.post("/{plan_id}/tareas", response_model=schemas.TareaPOES, status_code=201)
def agregar_tarea(plan_id: int, tarea: schemas.TareaPOESCreate, db: Session = Depends(get_db)):
    """Agrega una nueva tarea a un plan."""
    return services.agregar_tarea_a_plan(db, plan_id, tarea)

# Para leer, modificar o borrar tareas individuales, no necesitamos el plan_id en la URL
@router.get("/tareas/{tarea_id}", response_model=schemas.TareaPOES)
def obtener_tarea(tarea_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de una tarea específica."""
    return services.obtener_tarea_por_id(db, tarea_id)

@router.patch("/tareas/{tarea_id}", response_model=schemas.TareaPOES)
def modificar_tarea(tarea_id: int, tarea: schemas.TareaPOESUpdate, db: Session = Depends(get_db)):
    """Modifica una tarea existente y sus recursos asignados."""
    return services.modificar_tarea(db, tarea_id, tarea)

@router.delete("/tareas/{tarea_id}", response_model=schemas.TareaPOES)
def eliminar_tarea(tarea_id: int, db: Session = Depends(get_db)):
    """Realiza el borrado lógico de una tarea."""
    return services.eliminar_tarea(db, tarea_id)