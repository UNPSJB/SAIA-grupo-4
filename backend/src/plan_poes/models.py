import enum
from datetime import date, datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class TipoPOESEnum(str, enum.Enum):
    PRE_OPERACIONAL = "pre_operacional"
    OPERACIONAL = "operacional"
    POST_OPERACIONAL = "post_operacional"

class FrecuenciaEnum(str, enum.Enum):
    DIARIA = "diaria"
    SEMANAL = "semanal"
    MENSUAL = "mensual"
    DIAS_ESPECIFICOS = "dias_especificos"

class PlanPOES(ModeloBase):
    __tablename__ = "planes_poes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    objetivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    elaborado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_emision: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    fecha_hasta: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relaciones
    elaborado_por: Mapped["Persona"] = relationship(back_populates="planes_elaborados")
    tareas: Mapped[list["TareaPOES"]] = relationship(back_populates="plan", cascade="all, delete-orphan")

class TareaPOES(ModeloBase):
    __tablename__ = "tareas_poes"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes_poes.id"), nullable=False)
    
    tipo_poes: Mapped[str] = mapped_column(String(50), nullable=False)
    frecuencia: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Campo para guardar "lunes,jueves" cuando frecuencia es DIAS_ESPECIFICOS
    dias_semana: Mapped[str | None] = mapped_column(String(50), nullable=True) 
    
    equipo_id: Mapped[int | None] = mapped_column(ForeignKey("equipos.id"), nullable=True)
    sector_id: Mapped[int | None] = mapped_column(ForeignKey("sectores.id"), nullable=True)
    
    metodo: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Relaciones
    plan: Mapped["PlanPOES"] = relationship(back_populates="tareas")
    equipo: Mapped["Equipo"] = relationship(back_populates="tareas_poes")
    sector: Mapped["Sector"] = relationship(back_populates="tareas_poes")
    #insumos_quimicos: Mapped[list["TareaInsumoQuimico"]] = relationship("TareaInsumoQuimico", back_populates="tarea")
    #elementos_limpieza: Mapped[list["TareaElementoLimpieza"]] = relationship("TareaElementoLimpieza", back_populates="tarea")

"""   
class TareaInsumoQuimico(ModeloBase):
    __tablename__ = "tareas_insumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas_poes.id"), nullable=False)
    insumo_quimico_id: Mapped[int] = mapped_column(ForeignKey("insumos_quimicos.id"), nullable=False)
    dosis_sugerida: Mapped[float | None] = mapped_column(nullable=True)
    dilucion_especifica: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Relaciones
    tarea: Mapped["TareaPOES"] = relationship(back_populates="insumos_quimicos")
    insumo_quimico: Mapped["InsumoQuimico"] = relationship(back_populates="tareas_asociadas")
"""

"""
class TareaElementoLimpieza(ModeloBase):
    __tablename__ = "tareas_elementos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas_poes.id"), nullable=False)
    elemento_limpieza_id: Mapped[int] = mapped_column(ForeignKey("elementos_limpieza.id"), nullable=False)
    cantidad_requerida: Mapped[int | None] = mapped_column(nullable=False, default=1)
    
    # Relaciones
    tarea: Mapped["TareaPOES"] = relationship(back_populates="elementos_limpieza")
    elemento_limpieza: Mapped["ElementoLimpieza"] = relationship(back_populates="tareas_asociadas")
"""