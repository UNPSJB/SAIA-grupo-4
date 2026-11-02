from decimal import Decimal
from typing import Optional
from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), index=True)
    categoria: Mapped[str] = mapped_column(index=True)
    consumo: Mapped[Decimal] = mapped_column(Numeric(9, 3), default=Decimal("0"), server_default="0", nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(nullable=True)
    disponible: Mapped[bool] = mapped_column(default=True)

    unidad_medida: Mapped["UnidadMedida"] = relationship(back_populates="insumos")