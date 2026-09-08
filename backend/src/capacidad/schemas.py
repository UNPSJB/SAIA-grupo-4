from datetime import date
from pydantic import BaseModel, ConfigDict


class CapacidadBase(BaseModel):
    nombre: str


class CapacidadCreate(CapacidadBase):
    pass


class CapacidadUpdate(CapacidadBase):
    pass


class Capacidad(CapacidadBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PersonaCapacidadBase(BaseModel):
    capacidad_id: int
    fecha_desde: date
    fecha_hasta: date | None = None


class PersonaCapacidadCreate(PersonaCapacidadBase):
    pass


class PersonaCapacidad(BaseModel):
    id: int
    persona_id: int
    capacidad_id: int
    fecha_desde: date
    fecha_hasta: date | None = None
    model_config = ConfigDict(from_attributes=True)

class PersonaCapacidadConDetalle(BaseModel):
    id: int
    persona_nombre: str
    fecha_desde: date
    fecha_hasta: date | None = None
    capacidad: Capacidad
    model_config = ConfigDict(from_attributes=True)