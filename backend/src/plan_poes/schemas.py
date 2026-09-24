from datetime import datetime
from enum import Enum
from typing import Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

class TipoPOES(str, Enum):
    PRE_OPERACIONAL = "pre_operacional"
    OPERACIONAL = "operacional"
    POST_OPERACIONAL = "post_operacional"

class FrecuenciaPOES(str, Enum):
    DIARIA = "diaria"
    SEMANAL = "semanal"
    MENSUAL = "mensual"
    DIAS_ESPECIFICOS = "dias_especificos"

# --- INSUMO QUÍMICO ---
class TareaInsumoQuimicoBase(BaseModel):
    insumo_quimico_id: Annotated[int, Field(gt=0)]
    dosis_sugerida: Annotated[Optional[float], Field(default=None, gt=0)]
    dilucion_especifica: Annotated[Optional[str], Field(default=None, max_length=100)]

class TareaInsumoQuimicoCreate(TareaInsumoQuimicoBase):
    pass

class TareaInsumoQuimico(TareaInsumoQuimicoBase):
    id: int
    tarea_id: int
    model_config = ConfigDict(from_attributes=True)


# --- ELEMENTO DE LIMPIEZA ---
class TareaElementoLimpiezaBase(BaseModel):
    elemento_limpieza_id: Annotated[int, Field(gt=0)]
    cantidad_requerida: Annotated[int, Field(default=1, gt=0)]

class TareaElementoLimpiezaCreate(TareaElementoLimpiezaBase):
    pass

class TareaElementoLimpieza(TareaElementoLimpiezaBase):
    id: int
    tarea_id: int
    model_config = ConfigDict(from_attributes=True)

# --- TAREA POES ---
class TareaPOESBase(BaseModel):
    nombre: Annotated[str, Field(min_length=3, max_length=100)]
    tipo_poes: Annotated[TipoPOES, Field()]
    frecuencia: Annotated[FrecuenciaPOES, Field()]
    detalle_frecuencia: Annotated[Optional[str], Field(default=None, max_length=50)]
    equipo_id: Annotated[Optional[int], Field(default=None, gt=0)]
    sector_id: Annotated[Optional[int], Field(default=None, gt=0)]
    metodo: Annotated[str, Field(min_length=5)]

    @model_validator(mode="after")
    def validar_equipo_xor_sector(self):
        if bool(self.equipo_id) == bool(self.sector_id):
            raise ValueError("La tarea debe estar asignada a un Equipo O a un Sector, pero no a ambos ni a ninguno.")
        return self
    
    @model_validator(mode="after")
    def validar_detalle_frecuencia(self):
        freq = self.frecuencia
        detalle = self.detalle_frecuencia
        
        # Se valida frecuencia DIARIA
        if freq == FrecuenciaPOES.DIARIA:
            if detalle is not None:
                raise ValueError("Si la frecuencia es 'diaria', el campo detalle_frecuencia debe ser nulo.")
                
        # Se valida frecuencia SEMANAL
        elif freq == FrecuenciaPOES.SEMANAL:
            if not detalle:
                raise ValueError("Si la frecuencia es 'semanal', debe especificar el día (ej: 'lunes').")
            dias_semana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
            if detalle.lower().strip() not in dias_semana:
                raise ValueError(f"Día inválido para frecuencia semanal. Use uno de: {dias_semana}")
                
        # Se valida frecuencia MENSUAL
        elif freq == FrecuenciaPOES.MENSUAL:
            if not detalle:
                raise ValueError("Si la frecuencia es 'mensual', debe especificar el día del mes (1 al 31).")
            if not detalle.isdigit() or not (1 <= int(detalle) <= 31):
                raise ValueError("Detalle inválido para frecuencia mensual. Debe ser un número entre 1 y 31.")
                
        # Se valida frecuencia DIAS ESPECIFICOS
        elif freq == FrecuenciaPOES.DIAS_ESPECIFICOS:
            if not detalle:
                raise ValueError("Si la frecuencia es 'dias_especificos', debe especificar los días (ej: 'lun,mar').")
            dias_abrev = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]
            # Se limpian los espacios y se separa por coma
            dias_ingresados = [d.strip().lower() for d in detalle.split(",")]
            for d in dias_ingresados:
                if d not in dias_abrev:
                    raise ValueError(f"Día inválido '{d}'. Use abreviaciones separadas por coma: {dias_abrev}")
            if len(set(dias_ingresados)) != len(dias_ingresados):
                raise ValueError("No se pueden repetir días en la lista de días específicos.")

        return self

class TareaPOESCreate(TareaPOESBase):
    insumos_quimicos: Annotated[List[TareaInsumoQuimicoCreate], Field(default_factory=list)]
    elementos_limpieza: Annotated[List[TareaElementoLimpiezaCreate], Field(default_factory=list)]

    # VALIDACIÓN RECURSOS MÍNIMOS
    @model_validator(mode="after")
    def validar_al_menos_un_recurso(self):
        if not self.insumos_quimicos and not self.elementos_limpieza:
            raise ValueError("La tarea debe incluir al menos un producto químico o un elemento de limpieza.")
        return self


class TareaPOESUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=3, max_length=100)]
    tipo_poes: Annotated[Optional[TipoPOES], Field(default=None)]
    frecuencia: Annotated[Optional[FrecuenciaPOES], Field(default=None)]
    detalle_frecuencia: Annotated[Optional[str], Field(default=None, max_length=50)]
    equipo_id: Annotated[Optional[int], Field(default=None, gt=0)]
    sector_id: Annotated[Optional[int], Field(default=None, gt=0)]
    metodo: Annotated[Optional[str], Field(default=None, min_length=5)]
    activo: Annotated[Optional[bool], Field(default=None)]
    insumos_quimicos: Annotated[Optional[List[TareaInsumoQuimicoCreate]], Field(default=None)]
    elementos_limpieza: Annotated[Optional[List[TareaElementoLimpiezaCreate]], Field(default=None)]


class TareaPOES(TareaPOESBase):
    id: int
    plan_id: int
    activo: bool
    insumos_quimicos: List[TareaInsumoQuimico] = []
    elementos_limpieza: List[TareaElementoLimpieza] = []
    model_config = ConfigDict(from_attributes=True)


# --- PLAN POES ---
class PlanPOESBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=150)]
    objetivo: Annotated[Optional[str], Field(default=None)]

class PlanPOESCreate(PlanPOESBase):
    elaborado_por_id: Annotated[int, Field(gt=0)]

class PlanPOESUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=150)]
    objetivo: Annotated[Optional[str], Field(default=None)]

class PlanPOES(PlanPOESBase):
    id: int
    elaborado_por_id: int
    fecha_emision: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None
    activo: bool
    tareas: List[TareaPOES] = []
    model_config = ConfigDict(from_attributes=True)