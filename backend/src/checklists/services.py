import os
import shutil
from datetime import datetime
from fastapi import UploadFile

# carpeta local
UPLOAD_DIR = "uploads/evidencias"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def completar_tarea(tarea_id: int, foto: UploadFile | None = None):
    ruta_foto = None
    #timestamp
    hora_completado = datetime.now() 

    #foto opcional
    if foto:
        # nombre unico con la fecha y hora
        timestamp = hora_completado.strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"tarea_{tarea_id}_{timestamp}_{foto.filename}"
        ruta_foto = os.path.join(UPLOAD_DIR, nombre_archivo)
        
        with open(ruta_foto, "wb") as buffer:
            shutil.copyfileobj(foto.file, buffer)

    # aca iria lo de auditoria para cambiar el estado de la tarea
    # y bloquear la edicion

    return {
        "mensaje": "Tarea completada exitosamente",
        "tarea_id": tarea_id,
        "evidencia_guardada": ruta_foto is not None,
        "ruta": ruta_foto,
        "fecha_completado": hora_completado.isoformat()
    }