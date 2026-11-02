from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
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

    # Relaciones
    producto: Mapped["Producto"] = relationship("Producto", back_populates="lotes")
    receta: Mapped["Receta"] = relationship("Receta", back_populates="lotes")
    operador: Mapped["Persona"] = relationship("Persona")
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

    @property
    def insumo_nombre(self) -> str:
        return self.insumo.nombre if self.insumo else ""

    @property
    def unidad_medida_simbolo(self) -> str:
        if self.insumo and self.insumo.unidad_medida:
            return self.insumo.unidad_medida.simbolo
        return ""
