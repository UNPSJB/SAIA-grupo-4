from datetime import date
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class Capacidad(ModeloBase):
    __tablename__ = "capacidad"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(unique=True, index=True)

    personas: Mapped[list["PersonaCapacidad"]] = relationship(
        back_populates="capacidad"
    )


class PersonaCapacidad(ModeloBase):
    __tablename__ = "personal_capacidad"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    capacidad_id: Mapped[int] = mapped_column(ForeignKey("capacidad.id"), nullable=False)
    fecha_desde: Mapped[date] = mapped_column(nullable=False)
    fecha_hasta: Mapped[date | None] = mapped_column(nullable=True)

    persona: Mapped["Persona"] = relationship(back_populates="capacidades")
    capacidad: Mapped["Capacidad"] = relationship(back_populates="personas")

    @property
    def persona_nombre(self) -> str:
        return self.persona.nombre
