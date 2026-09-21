import enum
from sqlalchemy import Boolean, Enum as SQLEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class TipoCapacidad(str, enum.Enum):
    SISTEMA = "sistema"
    PERSONALIZADA = "personalizada"

class Capacidad(ModeloBase):
    __tablename__ = "capacidad"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[TipoCapacidad] = mapped_column(SQLEnum(TipoCapacidad), nullable=False, default=TipoCapacidad.PERSONALIZADA)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    personas: Mapped[list["PersonaCapacidad"]] = relationship("PersonaCapacidad", back_populates="capacidad")