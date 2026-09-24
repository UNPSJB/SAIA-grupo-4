from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
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