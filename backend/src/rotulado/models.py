from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models import ModeloBase
from src.rotulado.constants import UmbralesEtapa2


class NormativaRotulado(ModeloBase):
    """Reglas de aplicabilidad de rotulado frontal configurables y versionadas (Ley 27.642)."""
    __tablename__ = "normativas_rotulado"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo_normativa: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", nullable=False)

    # Reglas configurables de aplicabilidad
    requiere_envasado_ausencia_cliente: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_azucares_agregados: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_grasas_agregadas: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_sodio_agregado: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_edulcorantes: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )
    evalua_cafeina: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="1", nullable=False
    )

    # Umbrales normativos (Etapa 2 - Decreto 151/2022)
    umbral_pct_azucares: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_PCT_AZUCARES, server_default="10.0", nullable=False
    )
    umbral_pct_grasas_totales: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_PCT_GRASAS_TOTALES, server_default="30.0", nullable=False
    )
    umbral_pct_grasas_saturadas: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_PCT_GRASAS_SATURADAS, server_default="10.0", nullable=False
    )
    umbral_sodio_mg_kcal: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_SODIO_MG_POR_KCAL, server_default="1.0", nullable=False
    )
    umbral_sodio_solido_mg: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_SODIO_SOLIDO_MG, server_default="300.0", nullable=False
    )
    umbral_sodio_liquido_mg: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_SODIO_LIQUIDO_MG, server_default="40.0", nullable=False
    )
    umbral_calorias_solido_kcal: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_CALORIAS_SOLIDO_KCAL, server_default="275.0", nullable=False
    )
    umbral_calorias_liquido_kcal: Mapped[float] = mapped_column(
        Float, default=UmbralesEtapa2.UMBRAL_CALORIAS_LIQUIDO_KCAL, server_default="25.0", nullable=False
    )

    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )
