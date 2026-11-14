from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator
from src.insumos.constants import Constantes
from src.insumos import exceptions


class Categoria(str, Enum):
    MATERIA_PRIMA = "materia prima"
    ADITIVO = "aditivo"
    ENVASE = "envase"
    OTROS = "otro"


class BaseCalculo(str, Enum):
    CIEN_G = "100g"
    CIEN_ML = "100ml"


NutrienteOpcional = Annotated[
    Optional[Decimal],
    Field(default=None, ge=0, max_digits=8, decimal_places=2),
]


class UnidadMedida(BaseModel):
    id: int
    nombre: str
    simbolo: str
    tipo_magnitud: str
    disponible: bool

    model_config = ConfigDict(from_attributes=True)


class InsumoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre del insumo es obligatorio")]
    unidad_medida_id: Annotated[int, Field(description="Unidad de medida asociada al insumo")]
    categoria: Annotated[Categoria, Field(description="Categoria a la que pertenece el insumo")]
    consumo: Annotated[Decimal, Field(default=Decimal("0"), max_digits=9, decimal_places=3, ge=0, description="Consumo acumulado del insumo")] = Decimal("0")
    descripcion: Annotated[Optional[str], Field(default=None, max_length=200, description="Descripcion de insumo")]
    densidad_g_ml: Annotated[Optional[float], Field(default=None, gt=0, description="Densidad en g/ml para liquidos")] = None
    peso_unitario_g: Annotated[Optional[float], Field(default=None, gt=0, description="Peso unitario promedio en gramos")] = None
    denominacion_rotulo: Annotated[Optional[str], Field(default=None, max_length=150, description="Denominación para el rótulo según CAA")] = None
    clase_funcional: Annotated[Optional[str], Field(default=None, max_length=100, description="Clase funcional del aditivo")] = None
    numero_ins: Annotated[Optional[str], Field(default=None, max_length=30, description="Número de INS del aditivo")] = None

    # Perfil nutricional (por 100g o 100ml)
    base_calculo: BaseCalculo = BaseCalculo.CIEN_G
    valor_energetico_kcal: NutrienteOpcional = None
    carbohidratos_g: NutrienteOpcional = None
    azucares_totales_g: NutrienteOpcional = None
    azucares_anadidos_g: NutrienteOpcional = None
    proteinas_g: NutrienteOpcional = None
    grasas_totales_g: NutrienteOpcional = None
    grasas_saturadas_g: NutrienteOpcional = None
    grasas_trans_g: NutrienteOpcional = None
    fibra_g: NutrienteOpcional = None
    sodio_mg: NutrienteOpcional = None

    # Fuente de origen
    alimento_referencia_id: Annotated[Optional[int], Field(default=None)] = None
    fuente_nutricional: Annotated[Optional[str], Field(default=None, max_length=200)] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        limpio = v.strip()
        if not limpio:
            raise ValueError("El nombre del insumo no puede estar vacío")
        return limpio


class InsumoCreate(InsumoBase):
    model_config = ConfigDict(extra="forbid")

    @field_validator("consumo")
    @classmethod
    def validar_consumo_inicial_cero(cls, v: Decimal) -> Decimal:
        if v > 0:
            raise ValueError("Un insumo nuevo debe iniciar con consumo 0")
        return v

    @model_validator(mode="after")
    def validar_atributos_aditivo(self):
        cat = (self.categoria.value if hasattr(self.categoria, "value") else str(self.categoria)).strip().lower()
        cf = (self.clase_funcional or "").strip()
        ins = (self.numero_ins or "").strip()

        if cat == Categoria.ADITIVO.value:
            if not cf:
                raise exceptions.ClaseFuncionalRequeridaAditivo()
            if cf.lower() not in Constantes.CLASES_SIN_INS_OBLIGATORIO:
                if not ins:
                    raise exceptions.NumeroInsRequeridoAditivo()
        else:
            if cf or ins:
                raise exceptions.AtributosAditivoNoAplican()

        if cat == Categoria.ENVASE.value:
            tiene_nutricion = (
                any(
                    getattr(self, c) is not None
                    for c in Constantes.CAMPOS_NUTRIENTES_COMPLETOS
                )
                or self.alimento_referencia_id is not None
                or bool((self.fuente_nutricional or "").strip())
            )
            if tiene_nutricion:
                raise exceptions.NutricionNoAplicaEnvase()
        return self


class InsumoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100, description="El nombre del insumo es obligatorio")]
    unidad_medida_id: Annotated[Optional[int], Field(default=None, description="Unidad de medida asociada al insumo")]
    categoria: Annotated[Optional[Categoria], Field(default=None, description="Categoria a la que pertenece el insumo")]
    consumo: Annotated[Optional[Decimal], Field(default=None, max_digits=9, decimal_places=3, ge=0, description="Consumo acumulado del insumo")] = None
    descripcion: Annotated[Optional[str], Field(default=None, max_length=200, description="Descripcion de insumo")]
    disponible: Annotated[Optional[bool], Field(default=None, description="Campo para verificar la baja logica")]
    densidad_g_ml: Annotated[Optional[float], Field(default=None, gt=0, description="Densidad en g/ml para liquidos")] = None
    peso_unitario_g: Annotated[Optional[float], Field(default=None, gt=0, description="Peso unitario promedio en gramos")] = None
    denominacion_rotulo: Annotated[Optional[str], Field(default=None, max_length=150, description="Denominación para el rótulo según CAA")] = None
    clase_funcional: Annotated[Optional[str], Field(default=None, max_length=100, description="Clase funcional del aditivo")] = None
    numero_ins: Annotated[Optional[str], Field(default=None, max_length=30, description="Número de INS del aditivo")] = None

    # Perfil nutricional (por 100g o 100ml)
    base_calculo: Optional[BaseCalculo] = None
    valor_energetico_kcal: NutrienteOpcional = None
    carbohidratos_g: NutrienteOpcional = None
    azucares_totales_g: NutrienteOpcional = None
    azucares_anadidos_g: NutrienteOpcional = None
    proteinas_g: NutrienteOpcional = None
    grasas_totales_g: NutrienteOpcional = None
    grasas_saturadas_g: NutrienteOpcional = None
    grasas_trans_g: NutrienteOpcional = None
    fibra_g: NutrienteOpcional = None
    sodio_mg: NutrienteOpcional = None

    alimento_referencia_id: Annotated[Optional[int], Field(default=None)] = None
    fuente_nutricional: Annotated[Optional[str], Field(default=None, max_length=200)] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        limpio = v.strip()
        if not limpio:
            raise ValueError("El nombre del insumo no puede estar vacío")
        return limpio

    @model_validator(mode="after")
    def validar_obligatorios_no_nulos(self):
        for campo in ("nombre", "unidad_medida_id", "categoria", "disponible"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"El campo '{campo}' no puede ser nulo")
        return self


class InsumoDelete(InsumoBase):
    disponible: bool = False


class Insumo(InsumoBase):
    id: int
    disponible: bool
    unidad_medida: UnidadMedida
    fecha_carga_nutricional: Optional[datetime] = None
    es_nutricion_modificada: bool = False
    modificado_por_usuario_id: Optional[int] = None
    fecha_modificacion_nutricional: Optional[datetime] = None

    @computed_field
    @property
    def denominacion_efectiva(self) -> str:
        return (self.denominacion_rotulo or "").strip() or self.nombre

    @computed_field
    @property
    def nutricion_completa(self) -> bool:
        cat = (self.categoria.value if hasattr(self.categoria, "value") else str(self.categoria)).strip().lower()
        if cat == Categoria.MATERIA_PRIMA.value:
            return all(
                getattr(self, campo) is not None
                for campo in Constantes.CAMPOS_NUTRIENTES_COMPLETOS
            )
        return self.valor_energetico_kcal is not None and self.sodio_mg is not None

    model_config = ConfigDict(from_attributes=True)
