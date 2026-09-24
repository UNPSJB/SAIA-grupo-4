from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class PlanPOES(ModeloBase):
    __tablename__ = "planes_poes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    objetivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    elaborado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_emision: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_hasta: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    elaborado_por: Mapped["Persona"] = relationship(back_populates="planes_elaborados")
    tareas: Mapped[list["TareaPOES"]] = relationship(back_populates="plan", cascade="all, delete-orphan")

class TareaPOES(ModeloBase):
    __tablename__ = "tareas_poes"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes_poes.id"), nullable=False)
    
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_poes: Mapped[str] = mapped_column(String(50), nullable=False)
    frecuencia: Mapped[str] = mapped_column(String(50), nullable=False)
    detalle_frecuencia: Mapped[str | None] = mapped_column(String(50), nullable=True) 
    
    equipo_id: Mapped[int | None] = mapped_column(ForeignKey("equipos.id"), nullable=True)
    sector_id: Mapped[int | None] = mapped_column(ForeignKey("sectores.id"), nullable=True)
    
    metodo: Mapped[str] = mapped_column(Text, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    plan: Mapped["PlanPOES"] = relationship(back_populates="tareas")
    equipo: Mapped["Equipo"] = relationship(back_populates="tareas_poes")
    sector: Mapped["Sector"] = relationship(back_populates="tareas_poes")
    
    # El delete-orphan limpia automáticamente la tabla intermedia si se borra la tarea
    insumos_quimicos: Mapped[list["TareaInsumoQuimico"]] = relationship(
        "TareaInsumoQuimico", 
        back_populates="tarea",
        cascade="all, delete-orphan"
    )
    elementos_limpieza: Mapped[list["TareaElementoLimpieza"]] = relationship(
        "TareaElementoLimpieza", 
        back_populates="tarea",
        cascade="all, delete-orphan"
    )
  
class TareaInsumoQuimico(ModeloBase):
    __tablename__ = "tareas_insumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas_poes.id"), nullable=False)
    insumo_quimico_id: Mapped[int] = mapped_column(ForeignKey("insumos_quimicos.id"), nullable=False)
    dosis_sugerida: Mapped[float | None] = mapped_column(Float, nullable=True)
    dilucion_especifica: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    tarea: Mapped["TareaPOES"] = relationship(back_populates="insumos_quimicos")
    insumo_quimico: Mapped["InsumoQuimico"] = relationship(back_populates="tareas_asociadas")
    
class TareaElementoLimpieza(ModeloBase):
    __tablename__ = "tareas_elementos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas_poes.id"), nullable=False)
    elemento_limpieza_id: Mapped[int] = mapped_column(ForeignKey("elementos_limpieza.id"), nullable=False)
    cantidad_requerida: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    tarea: Mapped["TareaPOES"] = relationship(back_populates="elementos_limpieza")
    elemento_limpieza: Mapped["ElementoLimpieza"] = relationship(back_populates="tareas_asociadas")