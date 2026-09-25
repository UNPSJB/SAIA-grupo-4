from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from enum import Enum
from decimal import Decimal
from src.unidad_medida.schemas import UnidadMedida
from src.equipos.schemas import Equipo
from src.sectores.schemas import Sector

# Probablemente haya que cambiarlo por una tabla nueva
class TipoInsumoQuimico(str, Enum):
    DETERGENTE = "detergente"
    DESINFECTANTE = "desinfectante"
    DESENGRASANTE = "desengrasante"
    OTRO = "otro"

class InsumoQuimicoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="Nombre del insumo químico")]
    consumo: Annotated[Decimal, Field(default=Decimal("0"), max_digits=9, decimal_places=3, ge=0, description="Consumo acumulado del insumo químico")]
    tipo: Annotated[TipoInsumoQuimico, Field(description="Tipo de insumo químico")]
    unidad_medida_id: Annotated[int, Field(description="Unidad de medida asociada al insumo químico")]
    equipo_id: Annotated[int | None, Field(default=None)]
    sector_id: Annotated[int | None, Field(default=None)]

class InsumoQuimicoCreate(InsumoQuimicoBase):
    pass

class InsumoQuimicoUpdate(InsumoQuimicoBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100, description="Nombre del insumo químico")]
    consumo: Annotated[Decimal, Field(default=Decimal("0"), max_digits=9, decimal_places=3, ge=0, description="Consumo acumulado del insumo químico")]
    tipo: Annotated[Optional[TipoInsumoQuimico], Field(default=None, description="Tipo de insumo químico")]
    unidad_medida_id: Annotated[Optional[int], Field(default=None, description="Unidad de medida asociada al insumo químico")]
    activo: Annotated[Optional[bool], Field(default=None)]
    equipo_id: Annotated[int | None, Field(default=None)]
    sector_id: Annotated[int | None, Field(default=None)]

class InsumoQuimico(InsumoQuimicoBase):
    id: int
    activo: bool
    unidad_medida: UnidadMedida
    equipo: Equipo | None = None
    sector: Sector | None = None

    model_config = ConfigDict(from_attributes=True)