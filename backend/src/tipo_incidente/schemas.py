from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional

class TipoIncidenteBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre del tipo de incidente es obligatorio")]
    descripcion: Annotated[str, Field(min_length=1, max_length=200, description="Descripcion del tipo de incidente")]
    activo: Annotated[bool, Field(default=True)]

class TipoIncidenteCreate(TipoIncidenteBase):
    pass

class TipoIncidenteUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(min_length=1, max_length=50, default=None)]
    descripcion: Annotated[Optional[str], Field(min_length=1, max_length=200, default=None)]
    activo: Annotated[Optional[bool], Field(default=None)]

class TipoIncidenteDelete(TipoIncidenteBase):
    pass

class TipoIncidente(TipoIncidenteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)