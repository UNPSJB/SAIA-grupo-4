from datetime import date
from pydantic import BaseModel, ConfigDict
from src.productos.schemas import ProductoOut

class LoteBase(BaseModel):
    producto_id: int
    fecha: date
    cantidad: float

class LoteCreate(LoteBase):
    pass

class LoteOut(LoteBase):
    id: int
    producto: ProductoOut 
    model_config = ConfigDict(from_attributes=True)