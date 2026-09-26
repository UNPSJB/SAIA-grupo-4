from sqlalchemy import ForeignKey, String, Boolean, UniqueConstraint, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from src.models import ModeloBase

class InsumoQuimico(ModeloBase):
    __tablename__ = "insumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), index=True)
    consumo: Mapped[Decimal] = mapped_column(Numeric(9, 3), default=Decimal("0"), server_default="0", nullable=False,) 
    tipo: Mapped[str] = mapped_column(String(100), index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), index=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    unidad_medida: Mapped["UnidadMedida"] = relationship(back_populates="insumos_quimicos")
    tareas_asociadas: Mapped[list["TareaInsumoQuimico"]] = relationship("TareaInsumoQuimico", back_populates="insumo_quimico")
    ejecuciones_asociadas: Mapped[list["EjecucionInsumoQuimico"]] = relationship(
        "EjecucionInsumoQuimico", 
        back_populates="insumo_quimico"
    )

    __table_args__ = (
        UniqueConstraint(
            "nombre",
            "tipo",
            "unidad_medida_id",
            name="uq_insumo_quimico_nombre_tipo_unidad_medida_id",
        ),
    )
