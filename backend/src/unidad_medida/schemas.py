from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional
from enum import Enum


# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class TipoMagnitud(str, Enum):
    MASA = "masa"
    VOLUMEN = "volumen"
    TEMPERATURA = "temperatura"
    TIEMPO = "tiempo"
    LONGITUD = "longitud"
    CANTIDAD = "cantidad"
    CONCENTRACION = "concentracion"


class UnidadMedidaBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre de la unidad de medida es obligatorio")]
    simbolo: Annotated[str, Field(min_length=1, max_length=4, description="Simbolo abreviado de la unidad de medida")]
    tipo_magnitud: Annotated[TipoMagnitud, Field(description="Tipo de magnitud de la unidad de medida")]
    disponible: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]


class UnidadMedidaCreate(UnidadMedidaBase):
    pass


class UnidadMedidaUpdate(UnidadMedidaBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=50, description="El nombre de la unidad de medida es obligatorio")]
    simbolo: Annotated[Optional[str], Field(default=None, min_length=1, max_length=4, description="Simbolo abreviado de la unidad de medida")]
    tipo_magnitud: Annotated[Optional[TipoMagnitud], Field(default=None, description="Tipo de magnitud de la unidad de medida")]
    disponible: Annotated[Optional[bool], Field(default=None, description="Campo para verificar la baja logica")]


class UnidadMedidaDelete(UnidadMedidaBase):
    pass


class UnidadMedida(UnidadMedidaBase):
    id: int

    # La siguiente opción nos permite instanciar schemas pydantic pasando modelos SQLAlchemy por parámetros.
    # De otro modo solo podríamos usar diccionarios.
    # Más info. sobre ConfigDict -> https://pydantic.dev/docs/validation/dev/api/pydantic/config
    model_config = ConfigDict(from_attributes=True)