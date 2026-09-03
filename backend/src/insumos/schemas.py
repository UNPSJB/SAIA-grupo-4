from pydantic import BaseModel, ConfigDict, field_validator
from src.insumos.models import Insumo
from src.insumos import exceptions

# Los siguientes schemas contienen atributos sin muchas restricciones de tipo.
# Podemos crear atributos con ciertas reglas mediante el uso de un "Field" adecuado.
# https://docs.pydantic.dev/latest/concepts/fields/


class InsumoBase(BaseModel):
    nombre: str
    unidad_medida: str

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(InsumoBase):
    pass

class InsumoDelete(InsumoBase):
    pass

class Insumo(InsumoBase):
    id: int

    # La siguiente opción nos permite instanciar schemas pydantic pasando modelos SQLAlchemy por parámetros.
    # De otro modo solo podríamos usar diccionarios.
    # Más info. sobre ConfigDict -> https://pydantic.dev/docs/validation/dev/api/pydantic/config
    model_config = ConfigDict(from_attributes = True)


