from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase


class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    unidad_medida: Mapped[str] = mapped_column()
