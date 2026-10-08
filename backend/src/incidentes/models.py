from datetime import datetime
from sqlalchemy import Boolean, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class Incidente(ModeloBase):
    __tablename__ = "incidentes"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    foto_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fecha_hora_reporte: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    reportante_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    tipo_id: Mapped[int] = mapped_column(ForeignKey("tipos_incidentes.id"), nullable=False)

    # Estado
    abierto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Campos de cierre
    accion_correctiva: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    responsable_cierre_id: Mapped[int | None] = mapped_column(ForeignKey("personal.id"), nullable=True)

    # Relaciones
    reportante: Mapped["Persona"] = relationship(
        "Persona",
        foreign_keys="[Incidente.reportante_id]",
        back_populates="incidentes_reportados",
    )
    responsable_cierre: Mapped["Persona | None"] = relationship(
        "Persona",
        foreign_keys="[Incidente.responsable_cierre_id]",
    )
    historial: Mapped[list["HistorialIncidente"]] = relationship(
        "HistorialIncidente",
        back_populates="incidente",
        cascade="all, delete-orphan",
    )
    tipo: Mapped["TipoIncidente"] = relationship(
        "TipoIncidente",
        back_populates="incidentes"
    )


class HistorialIncidente(ModeloBase):
    __tablename__ = "historial_incidentes"

    id: Mapped[int] = mapped_column(primary_key=True)
    incidente_id: Mapped[int] = mapped_column(ForeignKey("incidentes.id"), nullable=False)

    estado_anterior: Mapped[str] = mapped_column(String(20), nullable=False)  # "abierto" / "cerrado"
    estado_nuevo: Mapped[str] = mapped_column(String(20), nullable=False)     # "abierto" / "cerrado"

    motivo: Mapped[str] = mapped_column(Text, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    responsable_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)

    # Relaciones
    incidente: Mapped["Incidente"] = relationship("Incidente", back_populates="historial")
    responsable: Mapped["Persona"] = relationship("Persona")