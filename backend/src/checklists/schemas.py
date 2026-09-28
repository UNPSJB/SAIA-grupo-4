from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from src.checklists.constants import EstadoEjecucion

# Schemas auxiliares para armar el checklist

class RecursoChecklist(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class OperadorChecklist(BaseModel):
    id: int
    nombre: str
    apellido: str
    model_config = ConfigDict(from_attributes=True)

class UnidadMedidaChecklist(BaseModel):
    simbolo: str
    model_config = ConfigDict(from_attributes=True)

class InsumoBaseChecklist(BaseModel):
    id: int
    nombre: str
    unidad_medida: UnidadMedidaChecklist
    model_config = ConfigDict(from_attributes=True)

class InsumoParaChecklist(BaseModel):
    insumo_quimico: InsumoBaseChecklist
    dosis_sugerida: Optional[float] = None
    dilucion_especifica: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ElementoParaChecklist(BaseModel):
    elemento_limpieza: RecursoChecklist
    cantidad_requerida: int
    model_config = ConfigDict(from_attributes=True)

class TareaParaChecklist(BaseModel):
    id: int
    nombre: str
    tipo_poes: str
    metodo: str
    equipo: Optional[RecursoChecklist] = None
    sector: Optional[RecursoChecklist] = None
    
    insumos_quimicos: List[InsumoParaChecklist] = []
    elementos_limpieza: List[ElementoParaChecklist] = []
    
    model_config = ConfigDict(from_attributes=True)

class ConsumoEjecucionChecklist(BaseModel):
    insumo_quimico_id: int
    cantidad_utilizada: float
    model_config = ConfigDict(from_attributes=True)

# Schemas principales de la ejecucion (Request y Response)
class EjecucionTarea(BaseModel):
    id: int
    id_tarea: int
    fecha_programada: date
    estado: EstadoEjecucion
    fecha_hora_ejecucion: Optional[datetime] = None
    operador_id: Optional[int] = None
    operador: Optional[OperadorChecklist] = None
    foto_url: Optional[str] = None
    observaciones: Optional[str] = None
    
    tarea: TareaParaChecklist
    consumos_insumos: List[ConsumoEjecucionChecklist] = []
    model_config = ConfigDict(from_attributes=True)

class RegistroConsumoQuimico(BaseModel):
    insumo_quimico_id: int
    cantidad_utilizada: Optional[float] = Field(
        default=None, 
        ge=0, 
        description="Cantidad utilizada. Omitir o enviar 0 si no se usó."
    )

class CompletarEjecucion(BaseModel):
    operador_id: int
    observaciones: Optional[str] = None
    consumos: List[RegistroConsumoQuimico] = Field(default_factory=list)