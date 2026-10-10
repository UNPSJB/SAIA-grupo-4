from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Persona(ModeloBase):
    __tablename__ = "personal"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    dni: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    legajo: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fecha_alta: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    capacidades: Mapped[list["PersonaCapacidad"]] = relationship("PersonaCapacidad", back_populates="persona")
    vencimientos: Mapped[list["VencimientoPersonal"]] = relationship("VencimientoPersonal", back_populates="persona")
    planes_elaborados: Mapped[list["PlanPOES"]] = relationship(
        "PlanPOES", 
        back_populates="elaborado_por"
    )

class PersonaCapacidad(ModeloBase):
    __tablename__ = "personal_capacidad"

    id: Mapped[int] = mapped_column(primary_key=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    capacidad_id: Mapped[int] = mapped_column(ForeignKey("capacidad.id"), nullable=False)
    fecha_desde: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    fecha_hasta: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    persona: Mapped["Persona"] = relationship("Persona", back_populates="capacidades")
    capacidad: Mapped["Capacidad"] = relationship("Capacidad", back_populates="personas")

class VencimientoPersonal(ModeloBase):
    __tablename__ = "vencimiento_personal"
    # Un solo vencimiento por persona y documento: la renovacion edita la fila existente
    __table_args__ = (
        UniqueConstraint("persona_id", "documento_id", name="uix_persona_documento"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documento_personal.id"), nullable=False)
    fecha_emision: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    url_comprobante: Mapped[str | None] = mapped_column(String(255), nullable=True)

    persona: Mapped["Persona"] = relationship("Persona", back_populates="vencimientos")
    documento: Mapped["DocumentoPersonal"] = relationship("DocumentoPersonal", back_populates="vencimientos")
