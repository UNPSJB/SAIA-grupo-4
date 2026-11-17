from decimal import Decimal
from typing import Optional
from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase


class AlimentoReferencia(ModeloBase):
    __tablename__ = "alimentos_referencia"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    alimento: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    categoria: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)

    energia_kcal: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    proteinas_g: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    grasas_totales_g: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    carbohidratos_g: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    fibra_g: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    sodio_mg: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    grasas_saturadas_g: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)

    es_oficial_sara: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
