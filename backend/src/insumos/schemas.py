from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional
from enum import Enum

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/

# Clase que en un futuro sera un modelo
class Categoria(str, Enum):
    MATERIA_PRIMA = "materia prima"
    ADITIVO = "aditivo"
    ENVASE = "envase"
    OTROS = "otro"

# Esquema de lectura anidado: unidad de medida asociada al insumo
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
    descripcion: Annotated[Optional[str], Field(default=None, max_length=200, description="Descripcion de insumo")]
    disponible: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(InsumoBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100, description="El nombre del equipo es obligatorio")]
    unidad_medida_id: Annotated[Optional[int], Field(default=None, description="Unidad de medida asociada al insumo")]
    categoria: Annotated[Optional[Categoria], Field(default=None, description="Categoria a la que pertenece el insumo")]
    descripcion: Annotated[Optional[str], Field(default=None, max_length=200, description="Descripcion de insumo")]
    disponible: Annotated[Optional[bool], Field(default=None, description="Campo para verificar la baja logica")]

class InsumoDelete(InsumoBase):
    pass

class Insumo(InsumoBase):
    id: int
    unidad_medida: UnidadMedida

    # La siguiente opción nos permite instanciar schemas pydantic pasando modelos SQLAlchemy por parámetros.
    # De otro modo solo podríamos usar diccionarios.
    # Más info. sobre ConfigDict -> https://pydantic.dev/docs/validation/dev/api/pydantic/config
    model_config = ConfigDict(from_attributes = True)