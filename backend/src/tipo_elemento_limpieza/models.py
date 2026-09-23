from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase


class TipoElementoLimpieza(ModeloBase):
    __tablename__ = "tipos_elemento_limpieza"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    activo: Mapped[bool] = mapped_column(default=True)

    elementos: Mapped[list["ElementoLimpieza"]] = relationship(back_populates="tipo")