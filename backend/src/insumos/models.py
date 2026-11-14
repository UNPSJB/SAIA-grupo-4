from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.insumos.constants import Constantes
from src.models import ModeloBase


class Insumo(ModeloBase):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(index=True)
    unidad_medida_id: Mapped[int] = mapped_column(ForeignKey("unidades_de_medidas.id"), index=True)
    categoria: Mapped[str] = mapped_column(index=True)
    consumo: Mapped[Decimal] = mapped_column(Numeric(9, 3), default=Decimal("0"), server_default="0", nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(nullable=True)
    disponible: Mapped[bool] = mapped_column(default=True)
    densidad_g_ml: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peso_unitario_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    denominacion_rotulo: Mapped[Optional[str]] = mapped_column(nullable=True)
    clase_funcional: Mapped[Optional[str]] = mapped_column(nullable=True)
    numero_ins: Mapped[Optional[str]] = mapped_column(nullable=True)

    # Perfil nutricional cada 100g o 100ml
    base_calculo: Mapped[str] = mapped_column(
        String(10), default="100g", server_default="100g", nullable=False
    )
    valor_energetico_kcal: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    carbohidratos_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    azucares_totales_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    azucares_anadidos_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    proteinas_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    grasas_totales_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    grasas_saturadas_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    grasas_trans_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    fibra_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    sodio_mg: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)

    # Auditoría y trazabilidad nutricional
    alimento_referencia_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("alimentos_referencia.id", ondelete="SET NULL"), nullable=True
    )
    fuente_nutricional: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    fecha_carga_nutricional: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    es_nutricion_modificada: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    modificado_por_usuario_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("personal.id", ondelete="SET NULL"), nullable=True
    )
    fecha_modificacion_nutricional: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    unidad_medida: Mapped["UnidadMedida"] = relationship(back_populates="insumos")

    @property
    def denominacion_efectiva(self) -> str:
        """Devuelve la denominación para rótulo o, si está vacía, el nombre del insumo."""
        return (self.denominacion_rotulo or "").strip() or self.nombre

    @property
    def nutricion_completa(self) -> bool:
        """Indica si el insumo tiene cargados los nutrientes mínimos según su categoría."""
        cat = (self.categoria or "").strip().lower()
        if cat == "materia prima":
            return all(
                getattr(self, campo) is not None
                for campo in Constantes.CAMPOS_NUTRIENTES_COMPLETOS
            )
        return self.valor_energetico_kcal is not None and self.sodio_mg is not None
