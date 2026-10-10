import enum
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.documentos.constants import TipoDocumentoEnum
from src.models import ModeloBase

class Documento(ModeloBase):
    __tablename__ = "documentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_documento: Mapped[TipoDocumentoEnum] = mapped_column(Enum(TipoDocumentoEnum), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    versiones: Mapped[list["VersionDocumento"]] = relationship(
        "VersionDocumento",
        back_populates="documento",
        cascade="all, delete-orphan"
    )

    @property
    def version_vigente(self) -> Optional["VersionDocumento"]:
        # next() es más eficiente que un for: frena apenas encuentra la versión True
        return next((v for v in self.versiones if v.es_vigente), None)
    
class VersionDocumento(ModeloBase):
    __tablename__ = "versiones_documento"

    id: Mapped[int] = mapped_column(primary_key=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("documentos.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    archivo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    es_vigente: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    fecha_desde: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    fecha_hasta: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_proxima_revision: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    observaciones_cambio: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    creado_por_id: Mapped[int] = mapped_column(ForeignKey("personal.id"), nullable=False)
    fecha_subida: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    # Relaciones
    documento: Mapped["Documento"] = relationship("Documento", back_populates="versiones")
    # selectin: al serializar la respuesta se precarga la persona (evita N+1)
    creado_por: Mapped["Persona"] = relationship("Persona", lazy="selectin")

    # Historial de revisiones de esta versión (más reciente primero).
    # Se borran junto con la versión (cascade).
    revisiones: Mapped[list["RevisionDocumento"]] = relationship(
        "RevisionDocumento",
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="RevisionDocumento.fecha_registro.desc()",
    )

    @property
    def subido_por_nombre(self) -> Optional[str]:
        """Nombre completo de la persona que subió la versión (para el frontend)."""
        persona = self.creado_por
        return f"{persona.nombre} {persona.apellido}" if persona else None


class RevisionDocumento(ModeloBase):
    __tablename__ = "revisiones_documento"

    id: Mapped[int] = mapped_column(primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("versiones_documento.id"), nullable=False)

    nueva_fecha_proxima_revision: Mapped[date | None] = mapped_column(Date, nullable=True)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    registrado_por_id: Mapped[int | None] = mapped_column(ForeignKey("personal.id"), nullable=True)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)

    version: Mapped["VersionDocumento"] = relationship("VersionDocumento", back_populates="revisiones")
    # selectin: al serializar la respuesta se precarga la persona (evita N+1)
    registrado_por: Mapped["Persona"] = relationship("Persona", lazy="selectin")

    @property
    def registrado_por_nombre(self) -> Optional[str]:
        """Nombre completo de la persona que registró la revisión (para el frontend)."""
        persona = self.registrado_por
        return f"{persona.nombre} {persona.apellido}" if persona else None