from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Equipo(ModeloBase):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    marca: Mapped[str] = mapped_column(String(100), nullable=False)
    numero_serie: Mapped[str] = mapped_column(String(100), nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectores.id"), nullable=False)
    ubicacion: Mapped[str | None] = mapped_column(String(100), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sector: Mapped["Sector"] = relationship(back_populates="equipos")
    tareas_poes: Mapped[list["TareaPOES"]] = relationship(back_populates="equipo")
    
    __table_args__ = (
        UniqueConstraint(
            "nombre",
            "marca",
            "numero_serie",
            name="uq_equipo_nombre_marca_numero_serie"
        ),
    )
