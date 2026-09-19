from typing import Optional
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
import src


class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), index=True)
    categoria: Mapped[str] = mapped_column(index=True)
    descripcion: Mapped[Optional[str]] = mapped_column(nullable=True)
    disponible: Mapped[bool] = mapped_column(default=True)

    unidad_medida: Mapped["src.UnidadMedida"] = relationship(back_populates="insumos")