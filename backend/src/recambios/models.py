from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class Recambio(ModeloBase):
    __tablename__ = "historial_recambios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    elemento_id: Mapped[int] = mapped_column(ForeignKey("elementos_limpieza.id"), index=True)
    fecha_recambio: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    observaciones: Mapped[Optional[str]] = mapped_column(nullable=True)

    elemento: Mapped["ElementoLimpieza"] = relationship()

