from datetime import date
import json
from fastapi import APIRouter, Query, UploadFile, File, Depends, Form
from sqlalchemy.orm import Session
from pydantic import ValidationError

from src.database import get_db
from src.checklists import schemas, services, exceptions

router = APIRouter(prefix="/checklists", tags=["checklists"])

@router.get("/hoy", response_model=list[schemas.EjecucionTarea])
def obtener_tareas_hoy(db: Session = Depends(get_db)):
    """Devuelve la lista de tareas a ejecutar en el día actual. Internamente genera las tareas faltantes y cierra las vencidas."""
    return services.obtener_tareas_del_dia(db)

@router.patch("/{ejecucion_id}/completar", response_model=schemas.EjecucionTarea)
def completar_ejecucion(
    ejecucion_id: int,
    datos: str = Form(..., description="String JSON con operador_id, observaciones y consumos"),
    foto: UploadFile | None = File(default=None),
    db: Session = Depends(get_db)
):
    """Marca una ejecución como completada, guardando la evidencia fotográfica y los consumos químicos reportados por el operador."""
    # Se valida la entrada (Form a Pydantic)
    try:
        datos_dict = json.loads(datos)
        datos_schema = schemas.CompletarEjecucion(**datos_dict)
    except json.JSONDecodeError:
        raise exceptions.FormatoJSONInvalido()
    except ValidationError as e:
        raise exceptions.DatosValidacionError(errores=e.errors())

    # Se delega al servicio
    return services.completar_ejecucion(db, ejecucion_id, datos_schema, foto)

@router.get("/historial", response_model=list[schemas.EjecucionTarea])
def obtener_historial(
    desde: date = Query(..., description="Fecha de inicio del filtro (YYYY-MM-DD)"),
    hasta: date = Query(..., description="Fecha de fin del filtro (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Devuelve el historial de ejecuciones de tareas en un rango de fechas.
    Solo incluye tareas completadas o no realizadas (incumplidas).
    """
    return services.obtener_historial_ejecuciones(db, desde, hasta)