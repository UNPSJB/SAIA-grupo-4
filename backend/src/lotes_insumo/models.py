from datetime import date, datetime
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
    motivo_inhabilitacion: Mapped[str | None] = mapped_column(nullable=True)
    fecha_inhabilitacion: Mapped[datetime | None] = mapped_column(nullable=True)
    usuario_inhabilitacion_id: Mapped[int | None] = mapped_column(
    ForeignKey("personal.id"), nullable=True
    )
    insumo: Mapped["Insumo"] = relationship()