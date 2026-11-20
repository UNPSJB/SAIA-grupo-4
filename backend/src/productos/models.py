from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(250), nullable=False)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), nullable=False)
    dias_vida_util: Mapped[int | None] = mapped_column(Integer, nullable=True)
    envasado_ausencia_cliente: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", nullable=False)

    # Estado
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relaciones
    unidad_medida: Mapped["UnidadMedida"] = relationship(back_populates="productos")
    recetas: Mapped[list["Receta"]] = relationship("Receta", back_populates="producto")
    lotes: Mapped[list["Lote"]] = relationship("Lote", back_populates="producto")
    rotulo: Mapped["RotuloProducto | None"] = relationship(
        "RotuloProducto", back_populates="producto", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def es_liquido(self) -> bool:
        """Indica si el producto se comercializa en base líquida (unidad de volumen)."""
        if not self.unidad_medida or not self.unidad_medida.tipo_magnitud:
            return False
        return self.unidad_medida.tipo_magnitud.strip().lower() == "volumen"

    # Checks
    __table_args__ = (
        UniqueConstraint(
            "nombre",
            "unidad_medida_id",
            name="uq_producto_nombre_unidad_medida_id",
        ),
    )
