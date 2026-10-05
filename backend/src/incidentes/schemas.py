from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Annotated, Optional
from src.personal.schemas import Persona

class IncidenteBase(BaseModel):
    titulo: Annotated[str, Field(min_length=1, max_length=100)]
    descripcion: Annotated[str, Field(min_length=1, max_length=500)]
    foto_url: Annotated[Optional[str], Field(default=None, max_length=255)]
    fecha_hora_reporte: datetime
    reportante_id: Annotated[int, Field(gt=0)]

class IncidenteCreate(IncidenteBase):
    pass

# Agregar los otros schemas

class Incidente(IncidenteBase):
    id: int
    abierto: bool
    reportante: Persona
    model_config = ConfigDict(from_attributes=True)