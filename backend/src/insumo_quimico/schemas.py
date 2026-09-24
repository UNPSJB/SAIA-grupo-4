from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from enum import Enum
from src.unidad_medida.schemas import UnidadMedida

# Probablemente haya que cambiarlo por una tabla nueva
class TipoInsumoQuimico(str, Enum):
    DETERGENTE = "detergente"
    DESINFECTANTE = "desinfectante"
    DESENGRASANTE = "desengrasante"
    OTRO = "otro"

class InsumoQuimicoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="Nombre del insumo químico")]
    tipo: Annotated[TipoInsumoQuimico, Field(description="Tipo de insumo químico")]
    unidad_medida_id: Annotated[int, Field(description="Unidad de medida asociada al insumo químico")]

class InsumoQuimicoCreate(InsumoQuimicoBase):
    pass

class InsumoQuimicoUpdate(InsumoQuimicoBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100, description="Nombre del insumo químico")]
    tipo: Annotated[Optional[TipoInsumoQuimico], Field(default=None, description="Tipo de insumo químico")]
    unidad_medida_id: Annotated[Optional[int], Field(default=None, description="Unidad de medida asociada al insumo químico")]
    activo: Annotated[Optional[bool], Field(default=None)]

class InsumoQuimico(InsumoQuimicoBase):
    id: int
    activo: bool
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)