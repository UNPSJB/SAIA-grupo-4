from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum as SQLAlchemyEnum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase
from src.recetas.constants import EstadoReceta


class Receta(ModeloBase):
    __tablename__ = "recetas"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_receta: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre_receta: Mapped[str] = mapped_column(String(150), nullable=False)

    # Relación 1 a N con Producto (pueden existir varios borradores/históricos y 1 activa por producto)
    # TODO: Cuando se mergee el módulo de Producto, pasar a ForeignKey("productos.id")
    producto_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    rendimiento_estandar: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tiempo_estimado_total: Mapped[int | None] = mapped_column(Integer, nullable=True)

    estado: Mapped[EstadoReceta] = mapped_column(
        SQLAlchemyEnum(EstadoReceta),
        nullable=False,
        default=EstadoReceta.BORRADOR,
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    usuario_creador_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)

    # Relaciones
    usuario_creador: Mapped["Persona"] = relationship()
    # TODO: Descomentar cuando exista el modelo PasoReceta y quitar la @property pasos
    # pasos: Mapped[list["PasoReceta"]] = relationship(back_populates="receta", cascade="all, delete-orphan")

    @property
    def usuario_creador_nombre(self) -> str:
        """Nombre completo de la persona que creó la receta."""
        if not self.usuario_creador:
            return ""
        return f"{self.usuario_creador.nombre} {self.usuario_creador.apellido}"

    @property
    def tiene_lotes(self) -> bool:
        """Indica si la receta tiene lotes asociados.

        TODO: Reemplazar por la consulta real cuando exista el módulo de Lotes.
        """
        return False

    @property
    def pasos(self) -> list:
        """Lista de pasos de la receta.

        TODO: Eliminar esta property cuando se descomente el relationship 'pasos'.
        """
        return []