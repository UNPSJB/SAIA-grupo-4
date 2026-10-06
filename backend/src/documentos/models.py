import enum
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
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
    creado_por: Mapped["Persona"] = relationship("Persona") # Te permite hacer version.creado_por.nombre