from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase

class Equipo(ModeloBase):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    ubicacion: Mapped[str] = mapped_column(String(100), nullable=True)
