from sqlalchemy import Boolean, String, DateTime, ForeignKey # Agregar mas si es necesario
from sqlalchemy.orm import Mapped, mapped_column, relationship # Agregar mas si es necesario
from src.models import ModeloBase
from datetime import datetime

class Incidente(ModeloBase):
    __tablename__ = "incidentes"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(100), nullable=False)

    descripcion: Mapped[str] = mapped_column(String(500), nullable=False) # Seria la descripcion libre del CdA 1

    foto_url: Mapped[str | None] = mapped_column(String(255), nullable=True) # Seria la foto opcional del CdA 2

    fecha_hora_reporte: Mapped[datetime] = mapped_column(DateTime, nullable=False) # Seria la fecha y hora del reporte del CdA 3
    reportante_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False) # Seria el id del reportante del CdA 3

    abierto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True) # Estado del incidente, abierto/cerrado

    reportante: Mapped["Persona"] = relationship("Persona", back_populates="incidentes_reportados") # Relacion con la tabla de personal

    # Probablemente se necesiten relaciones con otras tablas, como lote o PCC por lo que dice el CdA 4