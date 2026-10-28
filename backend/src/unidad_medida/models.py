from typing import List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase



class UnidadMedida(ModeloBase):
    __tablename__ = "unidades_de_medidas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    simbolo: Mapped[str] = mapped_column(index=True)
    tipo_magnitud: Mapped[str] = mapped_column(index=True)
    disponible: Mapped[bool] = mapped_column(default=True)

    insumos: Mapped[List["Insumo"]] = relationship(back_populates="unidad_medida")
    insumos_quimicos: Mapped[List["InsumoQuimico"]] = relationship(back_populates="unidad_medida")
    productos: Mapped[List["Producto"]] = relationship(back_populates="unidad_medida")