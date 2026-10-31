from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.productos.models import Producto
    from src.insumos.models import Insumo

class Lote(ModeloBase):
    __tablename__ = "lotes_produccion"

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)

    producto: Mapped["Producto"] = relationship("Producto", back_populates="lotes")
    insumos_asociados: Mapped[list["LoteInsumo"]] = relationship(
        "LoteInsumo", back_populates="lote", cascade="all, delete-orphan"
    )

class LoteInsumo(ModeloBase):
    __tablename__ = "lotes_insumos"

    id: Mapped[int] = mapped_column(primary_key=True)
    lote_id: Mapped[int] = mapped_column(ForeignKey("lotes_produccion.id"), nullable=False)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), nullable=False)
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)

    lote: Mapped["Lote"] = relationship("Lote", back_populates="insumos_asociados")
    insumo: Mapped["Insumo"] = relationship("Insumo")