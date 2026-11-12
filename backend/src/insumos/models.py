from decimal import Decimal
from typing import Optional
from sqlalchemy import Float, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), index=True)
    categoria: Mapped[str] = mapped_column(index=True)
    consumo: Mapped[Decimal] = mapped_column(Numeric(9, 3), default=Decimal("0"), server_default="0", nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(nullable=True)
    disponible: Mapped[bool] = mapped_column(default=True)
    densidad_g_ml: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peso_unitario_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    denominacion_rotulo: Mapped[Optional[str]] = mapped_column(nullable=True)
    clase_funcional: Mapped[Optional[str]] = mapped_column(nullable=True)
    numero_ins: Mapped[Optional[str]] = mapped_column(nullable=True)

    unidad_medida: Mapped["UnidadMedida"] = relationship(back_populates="insumos")

    @property
    def denominacion_efectiva(self) -> str:
        """Devuelve la denominación para rótulo o, si está vacía, el nombre del insumo."""
        return (self.denominacion_rotulo or "").strip() or self.nombre
