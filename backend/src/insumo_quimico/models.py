from sqlalchemy import ForeignKey, String, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

class InsumoQuimico(ModeloBase):
    __tablename__ = "insumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), index=True)
    tipo: Mapped[str] = mapped_column(String(100), index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), index=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    unidad_medida: Mapped["src.UnidadMedida"] = relationship(back_populates="insumos")

    __table_args__ = (
        UniqueConstraint(
            "nombre",
            "tipo",
            "unidad_medida_id",
            name="uq_insumo_quimico_nombre_tipo_unidad_medida_id",
        ),
    )
