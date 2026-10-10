from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional

class DocumentoPersonalBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="Nombre del documento, ej. 'Libreta sanitaria'")]
    vigencia_dias: Annotated[int, Field(gt=0, description="Días de vigencia desde la fecha de emisión")]

class DocumentoPersonalCreate(DocumentoPersonalBase):
    pass

class DocumentoPersonalUpdate(DocumentoPersonalBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    vigencia_dias: Annotated[Optional[int], Field(default=None, gt=0)]
    activo: Annotated[Optional[bool], Field(default=None)]

class DocumentoPersonal(DocumentoPersonalBase):
    id: int
    activo: bool
    model_config = ConfigDict(from_attributes=True)
