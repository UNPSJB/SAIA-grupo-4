from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class DocumentoPersonal(ModeloBase):
    __tablename__ = "documento_personal"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    vigencia_dias: Mapped[int] = mapped_column(Integer, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    vencimientos: Mapped[list["VencimientoPersonal"]] = relationship("VencimientoPersonal", back_populates="documento")
