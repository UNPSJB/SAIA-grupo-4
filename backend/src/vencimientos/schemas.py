from datetime import date
from typing import Optional
from pydantic import BaseModel, Field
from typing import Annotated, Optional
from src.vencimientos.constants import CategoriaVencimiento, EstadoVencimiento


# Vencimiento: registro normalizado de la vista consolidada

# Cada provider traduce la entidad de su dominio a esta misma forma, y el frontend nunca necesita saber 
# de que modulo interno proviene cada fila.
class Vencimiento(BaseModel):
    id: Annotated[str, Field(description='Clave estable "categoria:entidad_id" de la fila consolidada')]
    categoria: CategoriaVencimiento
    concepto: Annotated[str, Field(description='Nombre del elemento que vence, ej. "Escoba cocina"')]
    entidad: Annotated[str, Field(description='Modulo de origen legible, ej. "Elementos de limpieza"')]
    entidad_id: Annotated[int, Field(description="Id del registro en su tabla de origen")]
    fecha_vencimiento: date
    dias_restantes: Annotated[int, Field(description="Negativo si ya vencio. Es la clave de orden por urgencia")]
    estado: EstadoVencimiento
    detalle: Annotated[Optional[str], Field(default=None, description='Motivo, ej. "Recambio" o "Calibracion"')]
    ruta_detalle: Annotated[str, Field(description=("Ruta interna del frontend al detalle del registro, con el registro ya seleccionado"))]


# Categoria disponible

# Devuelta por GET /vencimientos/categorias. Solo incluye categorias con proveedor registrado, de modo que el frontend arma su filtro de categoria a partir de esto 
class CategoriaDisponible(BaseModel):
    valor: CategoriaVencimiento
    nombre: str
    total: Annotated[int, Field(description="Vencimientos en ventana para esta categoria")]