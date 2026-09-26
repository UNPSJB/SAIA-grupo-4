from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, relationship
from src.models import ModeloBase


class ElementoLimpieza(ModeloBase):
    __tablename__ = "elementos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(unique=True, index=True)
    tipo_id: Mapped[int] = mapped_column(ForeignKey("tipos_elemento_limpieza.id"), index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    sector_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sectores.id"), nullable=True, index=True)
    equipo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipos.id"), nullable=True, index=True)
    frecuencia_recambio_dias: Mapped[Optional[int]] = mapped_column(nullable=True)
    fecha_ultimo_recambio: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
    )
    activo: Mapped[bool] = mapped_column(default=True)

    tipo: Mapped["TipoElementoLimpieza"] = relationship(back_populates="elementos")
    sector: Mapped[Optional["Sector"]] = relationship(back_populates="elementos_limpieza")
    equipo: Mapped[Optional["Equipo"]] = relationship(back_populates="elementos_limpieza")
    
    tareas_asociadas: Mapped[list["TareaElementoLimpieza"]] = relationship("TareaElementoLimpieza", back_populates="elemento_limpieza")