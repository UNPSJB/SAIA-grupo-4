from sqlalchemy import ForeignKey, String, Boolean, UniqueConstraint, Numeric, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from src.models import ModeloBase

class InsumoQuimico(ModeloBase):
    __tablename__ = "insumos_quimicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), index=True)
    consumo: Mapped[Decimal] = mapped_column(Numeric(9, 3), default=Decimal("0"), server_default="0", nullable=False,) # Esto tiene 9 digitos y 3 decimales. Ej: 999999.999
    tipo: Mapped[str] = mapped_column(String(100), index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), index=True)
    equipo_id: Mapped[int | None] = mapped_column(ForeignKey("equipos.id"), nullable=True)
    sector_id: Mapped[int | None] = mapped_column(ForeignKey("sectores.id"), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    unidad_medida: Mapped["UnidadMedida"] = relationship(back_populates="insumos_quimicos")
    equipo: Mapped["Equipo | None"] = relationship(back_populates="insumos_quimicos")
    sector: Mapped["Sector | None"] = relationship(back_populates="insumos_quimicos")

    __table_args__ = (
        UniqueConstraint(
            "nombre",
            "tipo",
            "unidad_medida_id",
            name="uq_insumo_quimico_nombre_tipo_unidad_medida_id",
        ),
        CheckConstraint(
            "(equipo_id IS NOT NULL AND sector_id IS NULL) OR "
            "(equipo_id IS NULL AND sector_id IS NOT NULL) OR "
            "(equipo_id IS NULL AND sector_id IS NULL)",
            name="ck_insumo_quimico_equipo_o_sector_o_ninguno",
        ),
    )
