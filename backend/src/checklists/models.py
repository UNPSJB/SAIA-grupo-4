from datetime import date, datetime
from sqlalchemy import Float, ForeignKey, String, Date, DateTime, Text, Enum as SQLAlchemyEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.checklists.constants import EstadoEjecucion

class EjecucionTarea(ModeloBase):
    __tablename__ = "ejecuciones_tareas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    id_tarea: Mapped[int] = mapped_column(ForeignKey("tareas_poes.id"), nullable=False)
    
    # Nullable porque al estar PENDIENTE quizás aún nadie la tomó
    operador_id: Mapped[int | None] = mapped_column(ForeignKey("personal.id"), nullable=True)
    
    fecha_programada: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_hora_ejecucion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    estado: Mapped[EstadoEjecucion] = mapped_column(
        SQLAlchemyEnum(EstadoEjecucion), 
        default=EstadoEjecucion.PENDIENTE,
        nullable=False
    )
    
    foto_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    tarea: Mapped["TareaPOES"] = relationship("TareaPOES", back_populates="ejecuciones")
    operador: Mapped["Persona"] = relationship("Persona")
    
    consumos_insumos: Mapped[list["EjecucionInsumoQuimico"]] = relationship(
        "EjecucionInsumoQuimico", 
        back_populates="ejecucion",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint('id_tarea', 'fecha_programada', name='uix_tarea_fecha_programada'),
    )
    
class EjecucionInsumoQuimico(ModeloBase):
    __tablename__ = "ejecuciones_insumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True)
    ejecucion_tarea_id: Mapped[int] = mapped_column(ForeignKey("ejecuciones_tareas.id"), nullable=False)
    insumo_quimico_id: Mapped[int] = mapped_column(ForeignKey("insumos_quimicos.id"), nullable=False)
    cantidad_utilizada: Mapped[float] = mapped_column(Float, nullable=False)

    ejecucion: Mapped["EjecucionTarea"] = relationship(back_populates="consumos_insumos")
    insumo_quimico: Mapped["InsumoQuimico"] = relationship()