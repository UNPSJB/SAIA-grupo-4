from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class TipoIncidente(ModeloBase):
    __tablename__ = "tipos_incidentes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(200), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    incidentes: Mapped[List["Incidente"]] = relationship(back_populates="tipo")