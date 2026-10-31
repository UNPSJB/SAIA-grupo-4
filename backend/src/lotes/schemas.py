from datetime import date
from pydantic import BaseModel, ConfigDict, Field
from src.productos.schemas import ProductoOut

class InsumoDetalleRespuesta(BaseModel):
    id: int
    nombre: str
    simbolo_unidad: str | None = None

    model_config = ConfigDict(from_attributes=True)

class LoteInsumoItem(BaseModel):
    insumo_id: int
    cantidad: float = Field(gt=0, description="La cantidad utilizada debe ser mayor a cero.")

class AsociarInsumosRequest(BaseModel):
    insumos: list[LoteInsumoItem] = Field(min_length=1, description="Debe asociar al menos un insumo al lote.")

class LoteInsumoOut(BaseModel):
    id: int
    insumo_id: int
    cantidad: float
    nombre_insumo: str
    unidad_medida: str

    model_config = ConfigDict(from_attributes=True)

class LoteBase(BaseModel):
    producto_id: int
    fecha: date
    cantidad: float = Field(gt=0, description="La cantidad producida debe ser mayor a cero.")

class LoteCreate(LoteBase):
    pass

class LoteOut(LoteBase):
    id: int
    producto: ProductoOut
    insumos_asociados: list[LoteInsumoOut] = []

    model_config = ConfigDict(from_attributes=True)