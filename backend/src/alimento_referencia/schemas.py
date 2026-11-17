from decimal import Decimal
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


_CAMPOS_NUTRIENTES = (
    "energia_kcal",
    "proteinas_g",
    "grasas_totales_g",
    "carbohidratos_g",
    "fibra_g",
    "sodio_mg",
    "grasas_saturadas_g",
)


NutrienteDecimal = Annotated[
    Decimal,
    Field(default=Decimal("0.00"), ge=0, max_digits=8, decimal_places=2),
]


class AlimentoReferenciaBase(BaseModel):
    codigo: Annotated[Optional[str], Field(default=None, max_length=20)] = None
    alimento: Annotated[str, Field(min_length=1, max_length=200)]
    categoria: Annotated[Optional[str], Field(default=None, max_length=120)] = None

    energia_kcal: NutrienteDecimal = Decimal("0.00")
    proteinas_g: NutrienteDecimal = Decimal("0.00")
    grasas_totales_g: NutrienteDecimal = Decimal("0.00")
    carbohidratos_g: NutrienteDecimal = Decimal("0.00")
    fibra_g: NutrienteDecimal = Decimal("0.00")
    sodio_mg: NutrienteDecimal = Decimal("0.00")
    grasas_saturadas_g: NutrienteDecimal = Decimal("0.00")

    @field_validator("alimento")
    @classmethod
    def validar_alimento_no_vacio(cls, v: str) -> str:
        limpio = v.strip()
        if not limpio:
            raise ValueError("El nombre del alimento no puede estar vacío")
        return limpio


class AlimentoReferenciaCreate(AlimentoReferenciaBase):
    model_config = ConfigDict(extra="forbid")


class AlimentoReferenciaUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: Annotated[Optional[str], Field(default=None, max_length=20)] = None
    alimento: Annotated[Optional[str], Field(default=None, min_length=1, max_length=200)] = None
    categoria: Annotated[Optional[str], Field(default=None, max_length=120)] = None

    energia_kcal: Annotated[Optional[Decimal], Field(default=None, ge=0, max_digits=8, decimal_places=2)] = None
    proteinas_g: Annotated[Optional[Decimal], Field(default=None, ge=0, max_digits=8, decimal_places=2)] = None
    grasas_totales_g: Annotated[Optional[Decimal], Field(default=None, ge=0, max_digits=8, decimal_places=2)] = None
    carbohidratos_g: Annotated[Optional[Decimal], Field(default=None, ge=0, max_digits=8, decimal_places=2)] = None
    fibra_g: Annotated[Optional[Decimal], Field(default=None, ge=0, max_digits=8, decimal_places=2)] = None
    sodio_mg: Annotated[Optional[Decimal], Field(default=None, ge=0, max_digits=8, decimal_places=2)] = None
    grasas_saturadas_g: Annotated[Optional[Decimal], Field(default=None, ge=0, max_digits=8, decimal_places=2)] = None

    @field_validator("alimento")
    @classmethod
    def validar_alimento_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        limpio = v.strip()
        if not limpio:
            raise ValueError("El nombre del alimento no puede estar vacío")
        return limpio

    @model_validator(mode="after")
    def validar_campos_no_nulos(self):
        if "alimento" in self.model_fields_set and self.alimento is None:
            raise ValueError("El nombre del alimento no puede ser nulo")
        for campo in _CAMPOS_NUTRIENTES:
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"El campo '{campo}' no puede ser nulo")
        return self


class AlimentoReferencia(AlimentoReferenciaBase):
    id: int
    es_oficial_sara: bool

    model_config = ConfigDict(from_attributes=True)
