from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.models import ModeloBase


class ParametroNutricional(ModeloBase):
    __tablename__ = "parametro_nutricional"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo_nutriente: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre_etiqueta: Mapped[str] = mapped_column(String(100), nullable=False)
    unidad: Mapped[str] = mapped_column(String(20), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    nivel_indentacion: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    permite_vdr: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", nullable=False)
    vdr: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    decimales: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    umbral_no_significativo: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    texto_no_significativo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    factor_conversion_kj: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
