from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import DateTime, ForeignKey, String, Text, Boolean, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import ModeloBase

if TYPE_CHECKING:
    from src.personal.models import Persona

class ConfiguracionSistema(ModeloBase):
    __tablename__ = "configuracion_sistema"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    nombre_establecimiento: Mapped[str] = mapped_column(String(150), nullable=False, default="SAIA-4")
    razon_social: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    cuit: Mapped[Optional[str]] = mapped_column(String(11), nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    localidad: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    provincia: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    sitio_web: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pie_informes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    fecha_modificacion: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    modificado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)

    modificado_por: Mapped[Optional["Persona"]] = relationship("Persona", lazy="selectin")

    @property
    def modificado_por_nombre(self) -> Optional[str]:
        if self.modificado_por:
            return f"{self.modificado_por.nombre} {self.modificado_por.apellido}"
        return None

class ConfiguracionModulo(ModeloBase):
    """Configuración singleton de módulos opcionales (ej. aplicabilidad de octógonos)."""

    __tablename__ = "configuracion_modulos"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    octogonos_activos: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    observacion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fecha_modificacion: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    modificado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)

    modificado_por: Mapped[Optional["Persona"]] = relationship("Persona", lazy="selectin")

    @property
    def modificado_por_nombre(self) -> Optional[str]:
        if self.modificado_por:
            return f"{self.modificado_por.nombre} {self.modificado_por.apellido}"
        return None


class VersionParametroFrontal(ModeloBase):
    """Versión inmutable de los parámetros y umbrales normativos de rotulado frontal."""

    __tablename__ = "versiones_parametros_frontales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_version: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    normativa_referencia: Mapped[str] = mapped_column(String(200), nullable=False)
    motivo_cambio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="VIGENTE")
    fecha_vigencia_desde: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    fecha_vigencia_hasta: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    creado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("personal.id"), nullable=True)

    creado_por: Mapped[Optional["Persona"]] = relationship("Persona", lazy="selectin")
    reglas: Mapped[List["ReglaUmbralFrontal"]] = relationship(
        "ReglaUmbralFrontal",
        back_populates="version",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ReglaUmbralFrontal.id",
    )

    @property
    def creado_por_nombre(self) -> Optional[str]:
        if self.creado_por:
            return f"{self.creado_por.nombre} {self.creado_por.apellido}"
        return "Sistema (Inicialización)"


class ReglaUmbralFrontal(ModeloBase):
    """Detalle de umbral por nutriente crítico y categoría perteneciente a una versión normativa."""

    __tablename__ = "reglas_umbrales_frontales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    version_id: Mapped[int] = mapped_column(
        ForeignKey("versiones_parametros_frontales.id", ondelete="CASCADE"),
        nullable=False,
    )
    nutriente_critico: Mapped[str] = mapped_column(String(50), nullable=False)
    leyenda_sello: Mapped[str] = mapped_column(String(120), nullable=False)
    categoria: Mapped[str] = mapped_column(String(30), nullable=False)  # ALIMENTO o BEBIDA
    valor_umbral: Mapped[float] = mapped_column(Float, nullable=False)
    unidad_umbral: Mapped[str] = mapped_column(String(60), nullable=False)
    condicion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    version: Mapped["VersionParametroFrontal"] = relationship(
        "VersionParametroFrontal",
        back_populates="reglas",
    )