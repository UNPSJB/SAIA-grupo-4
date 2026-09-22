from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase


class ElementoLimpieza(ModeloBase):
    __tablename__ = "elementos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    frecuencia_recambio_dias: Mapped[Optional[int]] = mapped_column(nullable=True)
    activo: Mapped[bool] = mapped_column(default=True)