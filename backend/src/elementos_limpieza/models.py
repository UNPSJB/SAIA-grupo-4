from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class ElementoLimpieza(ModeloBase):
    __tablename__ = "elementos_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    frecuencia_recambio_dias: Mapped[Optional[int]] = mapped_column(nullable=True)
    activo: Mapped[bool] = mapped_column(default=True)
    
    tareas_asociadas: Mapped[list["TareaElementoLimpieza"]] = relationship("TareaElementoLimpieza", back_populates="elemento_limpieza")