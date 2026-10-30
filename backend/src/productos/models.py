from sqlalchemy import Boolean, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Producto(ModeloBase):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(250), nullable=False)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), nullable=False)
    # Tal vez sean necesarios mas atributos

    # Estado
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relaciones
    unidad_medida: Mapped["UnidadMedida"] = relationship(back_populates="productos")
    recetas: Mapped[list["Receta"]] = relationship("Receta", back_populates="producto")
    
    # Checks
    __table_args__ = (
        UniqueConstraint(
            "nombre",
            "unidad_medida_id",
            name="uq_producto_nombre_unidad_medida_id",
        ),
    )