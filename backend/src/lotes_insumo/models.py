from datetime import date
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class LoteInsumo(ModeloBase):
    __tablename__ = "lotes_insumo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), index=True)
    codigo_lote: Mapped[str] = mapped_column(nullable=False)
    fecha_vencimiento: Mapped[date] = mapped_column(nullable=False)
    activo: Mapped[bool] = mapped_column(default=True)

    insumo: Mapped["Insumo"] = relationship()