from pydantic import BaseModel, ConfigDict

class PersonaBase(BaseModel):
    nombre: str
    legajo: int

class PersonaCreate(PersonaBase):
    fecha_alta: str

class PersonaUpdate(PersonaBase):
    fecha_alta: str

class PersonaResponse(PersonaBase):
    id: int
    fecha_alta: str

    model_config = ConfigDict(from_attributes=True)