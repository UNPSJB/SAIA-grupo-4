"""Modelo de configuración de la vista pública."""

from sqlalchemy import Boolean, CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase

# Configuración única de la vista pública del establecimiento.
# La tabla tiene una sola fila, siempre con id = 1. El token se genera una
# única vez y se reutiliza si la vista se desactiva y se vuelve a activar.
class VistaPublica(ModeloBase):
    """
    """

    __tablename__ = "vista_publica"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )

    __table_args__ = (
        CheckConstraint("id = 1", name="ck_vista_publica_fila_unica"),
    )
