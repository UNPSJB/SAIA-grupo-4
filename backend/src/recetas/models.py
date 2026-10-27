from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum as SQLAlchemyEnum, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
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
    
    # Relación hacia los pasos, con borrado en cascada
    pasos: Mapped[list["PasoReceta"]] = relationship(
        back_populates="receta", 
        cascade="all, delete-orphan"
    )

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


class PasoReceta(ModeloBase):
    __tablename__ = "pasos_receta"
    __table_args__ = (
        UniqueConstraint("receta_id", "numero_orden", name="uq_receta_paso_numero_orden"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"), nullable=False)
    
    numero_orden: Mapped[int] = mapped_column(Integer, nullable=False) 
    titulo: Mapped[str] = mapped_column(String(100), nullable=False)
    instrucciones: Mapped[str] = mapped_column(Text, nullable=False)
    
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    receta: Mapped["Receta"] = relationship(back_populates="pasos")
    
    # Relaciones hacia abajo con cascade para simplificar el CRUD
    equipos: Mapped[list["PasoEquipo"]] = relationship(
        "PasoEquipo", 
        back_populates="paso",
        cascade="all, delete-orphan"
    )
    insumos: Mapped[list["PasoInsumo"]] = relationship(
        "PasoInsumo", 
        back_populates="paso",
        cascade="all, delete-orphan"
    )


class PasoEquipo(ModeloBase):
    __tablename__ = "pasos_equipos"

    id: Mapped[int] = mapped_column(primary_key=True)
    paso_id: Mapped[int] = mapped_column(ForeignKey("pasos_receta.id"), nullable=False)
    equipo_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False)
    
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    paso: Mapped["PasoReceta"] = relationship(back_populates="equipos")
    equipo: Mapped["Equipo"] = relationship()


class PasoInsumo(ModeloBase):
    __tablename__ = "pasos_insumos"

    id: Mapped[int] = mapped_column(primary_key=True)
    paso_id: Mapped[int] = mapped_column(ForeignKey("pasos_receta.id"), nullable=False)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), nullable=False)
    
    cantidad_consumo_estimada: Mapped[float] = mapped_column(Float, nullable=False)
    
    paso: Mapped["PasoReceta"] = relationship(back_populates="insumos")
    insumo: Mapped["Insumo"] = relationship()