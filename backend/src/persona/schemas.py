from datetime import date
from pydantic import BaseModel, ConfigDict

class PersonaBase(BaseModel):
    nombre: str
    legajo: int

class PersonaCreate(PersonaBase):
    fecha_alta: date

class PersonaUpdate(PersonaBase):
    fecha_alta: date

class Persona(PersonaBase):
    id: int
    fecha_alta: date
    model_config = ConfigDict(from_attributes=True)