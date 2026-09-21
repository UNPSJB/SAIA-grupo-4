from fastapi import APIRouter, UploadFile, File
from src.checklists import services

router = APIRouter(prefix="/checklists", tags=["checklists"])

@router.post("/{tarea_id}/completar")
def completar_tarea_endpoint(
    tarea_id: int,
    # no es obligatoria la foto
    foto: UploadFile | None = File(default=None)
):
    return services.completar_tarea(tarea_id, foto)