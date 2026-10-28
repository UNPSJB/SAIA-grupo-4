from pydantic import BaseModel, ConfigDict

class ProductoBase(BaseModel):
    nombre: str
    activo: bool = True

class ProductoCreate(ProductoBase):
    pass

class ProductoOut(ProductoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)