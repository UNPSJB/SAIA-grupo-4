from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
from src.lotes_insumo.constants import EstadoLote


class LoteInsumo(ModeloBase):
    __tablename__ = "lotes_insumo"
    __table_args__ = (
        UniqueConstraint("insumo_id", "codigo_lote", name="uq_lote_insumo_codigo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), index=True)
    codigo_lote: Mapped[str] = mapped_column(nullable=False)
    fecha_vencimiento: Mapped[date] = mapped_column(nullable=False)
    cantidad_inicial: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    cantidad_actual: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    activo: Mapped[bool] = mapped_column(default=True)
    motivo_inhabilitacion: Mapped[str | None] = mapped_column(nullable=True)
    fecha_inhabilitacion: Mapped[datetime | None] = mapped_column(nullable=True)
    usuario_inhabilitacion_id: Mapped[int | None] = mapped_column(
        ForeignKey("personal.id"), nullable=True
    )

    insumo: Mapped["Insumo"] = relationship()
    usuario_inhabilitacion: Mapped["Persona | None"] = relationship()

    @property
    def estado(self) -> EstadoLote:
        if not self.activo:
            return EstadoLote.INHABILITADO
        if self.cantidad_actual <= 0:
            return EstadoLote.AGOTADO
        if self.fecha_vencimiento < date.today():
            return EstadoLote.VENCIDO
        return EstadoLote.ACTIVO