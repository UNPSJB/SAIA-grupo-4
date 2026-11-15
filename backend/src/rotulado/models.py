from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase


class NormativaRotulado(ModeloBase):
    """Reglas de aplicabilidad de rotulado frontal configurables y versionadas (Ley 27.642)."""
    __tablename__ = "normativas_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo_normativa: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", nullable=False)

    # Reglas configurables de aplicabilidad
    requiere_envasado_ausencia_cliente: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_azucares_agregados: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_grasas_agregadas: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_sodio_agregado: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_edulcorantes: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_cafeina: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )

    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )
