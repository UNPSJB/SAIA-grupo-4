from decimal import Decimal
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ParametroNutricionalOut(BaseModel):
    id: int
    codigo_nutriente: str
    nombre_etiqueta: str
    unidad: str
    orden: int
    nivel_indentacion: int
    permite_vdr: bool
    vdr: Optional[Decimal] = None
    decimales: int
    umbral_no_significativo: Optional[Decimal] = None
    texto_no_significativo: Optional[str] = None
    factor_conversion_kj: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class ParametroNutricionalUpdateItem(BaseModel):
    codigo_nutriente: str
    vdr: Annotated[Optional[Decimal], Field(default=None, gt=0)]
    decimales: Annotated[int, Field(ge=0, le=3)]
    umbral_no_significativo: Annotated[Optional[Decimal], Field(default=None, ge=0)]
    texto_no_significativo: Annotated[Optional[str], Field(default=None, max_length=100)]
    factor_conversion_kj: Annotated[Optional[Decimal], Field(default=None, gt=0)]


class ConfiguracionNutricionalUpdateIn(BaseModel):
    parametros: Annotated[List[ParametroNutricionalUpdateItem], Field(min_length=1)]
