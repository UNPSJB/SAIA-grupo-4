from datetime import datetime
from typing import Annotated, Optional
from pydantic import BaseModel, Field, ConfigDict
from src.personal.schemas import Persona
from src.tipo_incidente.schemas import TipoIncidente

class IncidenteBase(BaseModel):
    titulo: Annotated[str, Field(min_length=1, max_length=100)]
    descripcion: Annotated[str, Field(min_length=1, max_length=500)]
    foto_url: Annotated[Optional[str], Field(default=None, max_length=255)]
    fecha_hora_reporte: datetime
    reportante_id: Annotated[int, Field(gt=0)]


class IncidenteCreate(IncidenteBase):
    pass


# --- Requests Cierre y Reapertura ---

class IncidenteCierreCreate(BaseModel):
    accion_correctiva: Annotated[str, Field(min_length=1, max_length=1000)]
    responsable_cierre_id: Annotated[int, Field(gt=0)]


class IncidenteReaperturaCreate(BaseModel):
    motivo: Annotated[str, Field(min_length=1, max_length=1000)]
    responsable_id: Annotated[int, Field(gt=0)]


# --- Historial Response ---
class HistorialIncidenteResponse(BaseModel):
    id: int
    incidente_id: int
    estado_anterior: str
    estado_nuevo: str
    motivo: str
    fecha: datetime
    responsable_id: int
    responsable: Optional[Persona] = None

    model_config = ConfigDict(from_attributes=True)


# --- Incidente Response Principal ---
class Incidente(IncidenteBase):
    id: int
    abierto: bool
    reportante: Persona

    # Nuevos campos de cierre opcionales
    accion_correctiva: Optional[str] = None
    fecha_cierre: Optional[datetime] = None
    responsable_cierre_id: Optional[int] = None
    responsable_cierre: Optional[Persona] = None

    model_config = ConfigDict(from_attributes=True)