from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr, model_validator
from typing import Optional, Annotated, List
from src.capacidades.schemas import Capacidad
from src.documentos_personal.schemas import DocumentoPersonal

class PersonaBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100)]
    apellido: Annotated[str, Field(min_length=1, max_length=100)]
    dni: Annotated[str, Field(min_length=1, max_length=20)]
    legajo: Annotated[int, Field(gt=0)]
    email: Annotated[Optional[EmailStr], Field(default=None, max_length=150)]
    telefono: Annotated[Optional[str], Field(default=None, max_length=50)]

class PersonaCreate(PersonaBase):
    capacidades_ids: Annotated[List[int], Field(min_length=1)]

class PersonaUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    apellido: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    dni: Annotated[Optional[str], Field(default=None, min_length=1, max_length=20)]
    legajo: Annotated[Optional[int], Field(default=None, gt=0)]
    email: Annotated[Optional[EmailStr], Field(default=None, max_length=150)]
    telefono: Annotated[Optional[str], Field(default=None, max_length=50)]
    activo: Annotated[Optional[bool], Field(default=None)]
    capacidades_ids: Annotated[Optional[List[int]], Field(default=None)]

class PersonaCapacidad(BaseModel):
    id: Annotated[int, Field(gt=0)]
    persona_id: Annotated[int, Field(gt=0)]
    capacidad_id: Annotated[int, Field(gt=0)]
    fecha_desde: Annotated[datetime, Field()]
    fecha_hasta: Annotated[Optional[datetime], Field(default=None)]
    activo: Annotated[bool, Field()]
    capacidad: Capacidad
    model_config = ConfigDict(from_attributes=True)

class VencimientoPersonalBase(BaseModel):
    fecha_emision: Annotated[Optional[date], Field(default=None, description="Fecha en que se emitió el documento")]
    fecha_vencimiento: Annotated[date, Field(description="Fecha en que vence el documento")]

    @model_validator(mode="after")
    def validar_fechas(self):
        if self.fecha_emision and self.fecha_vencimiento:
            if self.fecha_emision > self.fecha_vencimiento:
                raise ValueError("La fecha de emisión no puede ser posterior a la fecha de vencimiento")
            if self.fecha_emision == self.fecha_vencimiento:
                raise ValueError("La fecha de emisión no puede ser igual a la fecha de vencimiento")
        return self

class VencimientoPersonalCreate(VencimientoPersonalBase):
    documento_id: Annotated[int, Field(gt=0)]

class VencimientoPersonalUpdate(VencimientoPersonalBase):
    fecha_vencimiento: Annotated[Optional[date], Field(default=None)]

class VencimientoPersonal(VencimientoPersonalBase):
    id: int
    persona_id: int
    documento_id: int
    url_comprobante: Optional[str] = None
    documento: DocumentoPersonal
    model_config = ConfigDict(from_attributes=True)

class Persona(PersonaBase):
    id: int
    fecha_alta: datetime
    activo: bool
    capacidades: List[PersonaCapacidad] = []
    vencimientos: List[VencimientoPersonal] = []
    model_config = ConfigDict(from_attributes=True)
