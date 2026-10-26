from datetime import date
from sqlalchemy import Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Lote(ModeloBase):
    __tablename__ = "lotes_produccion"

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)

    #relacion con productos
    producto = relationship("Producto", back_populates="lotes")