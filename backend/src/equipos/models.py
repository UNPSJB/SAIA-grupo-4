from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from typing import Any
    Sector = Any
    TareaPOES = Any
    InsumoQuimico = Any
    ElementoLimpieza = Any

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

    frecuencia_calibracion_dias: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fecha_ultima_calibracion: Mapped[date | None] = mapped_column(Date, nullable=True)

    sector: Mapped["Sector"] = relationship(back_populates="equipos")
    tareas_poes: Mapped[list["TareaPOES"]] = relationship(back_populates="equipo")
    insumos_quimicos: Mapped[list["InsumoQuimico"]] = relationship(back_populates="equipo")
    elementos_limpieza: Mapped[list["ElementoLimpieza"]] = relationship(back_populates="equipo")

    calibraciones: Mapped[list["CalibracionEquipo"]] = relationship(
        back_populates="equipo", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "nombre",
            "marca",
            "numero_serie",
            name="uq_equipo_nombre_marca_numero_serie",
        ),
    )


class CalibracionEquipo(ModeloBase):
    __tablename__ = "calibraciones_equipos"

    id: Mapped[int] = mapped_column(primary_key=True)
    equipo_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False)
    fecha_calibracion: Mapped[date] = mapped_column(Date, nullable=False)
    observaciones: Mapped[str | None] = mapped_column(String(255), nullable=True)
    certificado_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    equipo: Mapped["Equipo"] = relationship(back_populates="calibraciones")