from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.lotes.constants import EstadoLoteProduccion
from src.models import ModeloBase


class Lote(ModeloBase):
    __tablename__ = "lotes_produccion"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_lote: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False, index=True)
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"), nullable=False, index=True)
    operador_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False, index=True)

    fecha_elaboracion: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_registro_sistema: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    cantidad_producida: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Auditoría de retención preventiva
    motivo_retencion: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_retencion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    usuario_retencion_id: Mapped[int | None] = mapped_column(
        ForeignKey("personal.id"), nullable=True
    )

    # Relaciones
    producto: Mapped["Producto"] = relationship("Producto", back_populates="lotes")
    receta: Mapped["Receta"] = relationship("Receta", back_populates="lotes")
    operador: Mapped["Persona"] = relationship("Persona", foreign_keys=[operador_id])
    usuario_retencion: Mapped["Persona | None"] = relationship(
        "Persona", foreign_keys=[usuario_retencion_id]
    )
    consumos_insumos: Mapped[list["ConsumoInsumoLote"]] = relationship(
        "ConsumoInsumoLote",
        back_populates="lote",
        cascade="all, delete-orphan",
    )

    @property
    def producto_nombre(self) -> str:
        return self.producto.nombre if self.producto else ""

    @property
    def unidad_medida_simbolo(self) -> str:
        if self.producto and self.producto.unidad_medida:
            return self.producto.unidad_medida.simbolo
        return ""

    @property
    def receta_codigo(self) -> str:
        return self.receta.codigo_receta if self.receta else ""

    @property
    def receta_nombre(self) -> str:
        return self.receta.nombre_receta if self.receta else ""

    @property
    def operador_nombre(self) -> str:
        if self.operador:
            return f"{self.operador.nombre} {self.operador.apellido}".strip()
        return ""

    @property
    def estado(self) -> EstadoLoteProduccion:
        if self.fecha_retencion is not None:
            return EstadoLoteProduccion.RETENIDO
        if self.fecha_vencimiento and self.fecha_vencimiento < date.today():
            return EstadoLoteProduccion.VENCIDO
        return EstadoLoteProduccion.ACTIVO


class ConsumoInsumoLote(ModeloBase):
    __tablename__ = "consumos_insumo_lote"
    __table_args__ = (
        UniqueConstraint("lote_id", "insumo_id", name="uq_consumo_lote_insumo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lote_id: Mapped[int] = mapped_column(ForeignKey("lotes_produccion.id"), nullable=False)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), nullable=False)

    cantidad_teorica: Mapped[float] = mapped_column(Float, nullable=False)
    cantidad_real_utilizada: Mapped[float] = mapped_column(Float, nullable=False)

    lote: Mapped["Lote"] = relationship("Lote", back_populates="consumos_insumos")
    insumo: Mapped["Insumo"] = relationship("Insumo")
    detalles_lotes: Mapped[list["DetalleConsumoLoteInsumo"]] = relationship(
        "DetalleConsumoLoteInsumo",
        back_populates="consumo_insumo",
        cascade="all, delete-orphan",
    )

    @property
    def insumo_nombre(self) -> str:
        return self.insumo.nombre if self.insumo else ""

    @property
    def unidad_medida_simbolo(self) -> str:
        if self.insumo and self.insumo.unidad_medida:
            return self.insumo.unidad_medida.simbolo
        return ""


class DetalleConsumoLoteInsumo(ModeloBase):
    __tablename__ = "detalle_consumos_lote_insumo"
    __table_args__ = (
        UniqueConstraint(
            "consumo_insumo_id",
            "lote_insumo_id",
            name="uq_detalle_consumo_lote_insumo",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    consumo_insumo_id: Mapped[int] = mapped_column(
        ForeignKey("consumos_insumo_lote.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lote_insumo_id: Mapped[int] = mapped_column(
        ForeignKey("lotes_insumo.id"),
        nullable=False,
        index=True,
    )
    cantidad: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)

    consumo_insumo: Mapped["ConsumoInsumoLote"] = relationship(
        "ConsumoInsumoLote", back_populates="detalles_lotes"
    )
    lote_insumo: Mapped["LoteInsumo"] = relationship("LoteInsumo")

    @property
    def codigo_lote_insumo(self) -> str:
        return self.lote_insumo.codigo_lote if self.lote_insumo else ""

    @property
    def fecha_vencimiento(self) -> date | None:
        return self.lote_insumo.fecha_vencimiento if self.lote_insumo else None
