from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase


class Sector(ModeloBase):
    __tablename__ = "sectores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    equipos: Mapped[list["Equipo"]] = relationship(back_populates="sector")
    tareas_poes: Mapped[list["TareaPOES"]] = relationship(back_populates="sector")