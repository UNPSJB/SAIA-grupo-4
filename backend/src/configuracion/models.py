from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
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