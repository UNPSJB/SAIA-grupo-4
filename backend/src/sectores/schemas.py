from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Annotated

class SectorBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="Nombre del sector")]

class SectorCreate(SectorBase):
    pass

class SectorUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    activo: Annotated[Optional[bool], Field(default=None)]

class Sector(SectorBase):
    id: int
    activo: bool
    
    model_config = ConfigDict(from_attributes=True)