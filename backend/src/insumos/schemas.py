from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional
from enum import Enum

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/
class UnidadMedida(str, Enum):
    LITROS = "litros"
    KILOGRAMOS = "kilogramos"
    GRAMOS = "gramos"
    UNIDADES = "unidades"


class InsumoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre del insumo es obligatorio")]
    unidad_medida: Annotated[UnidadMedida, Field(description="Unidad de medida del insumo")]

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(InsumoBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100, description="El nombre del equipo es obligatorio")]
    unidad_medida: Annotated[Optional[UnidadMedida], Field(default=None, description="Unidad de medida del insumo")]

class InsumoDelete(InsumoBase):
    pass

class Insumo(InsumoBase):
    id: int

    # La siguiente opción nos permite instanciar schemas pydantic pasando modelos SQLAlchemy por parámetros.
    # De otro modo solo podríamos usar diccionarios.
    # Más info. sobre ConfigDict -> https://pydantic.dev/docs/validation/dev/api/pydantic/config
    model_config = ConfigDict(from_attributes = True)


