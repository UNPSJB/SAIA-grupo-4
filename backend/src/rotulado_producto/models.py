from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase

if TYPE_CHECKING:
    from src.personal.models import Persona
    from src.productos.models import Producto


class RotuloProducto(ModeloBase):
    """Datos normativos del rótulo de un producto según Cap. V del CAA y Ley 27.642."""
    __tablename__ = "rotulos_producto"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    receta_origen_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("recetas.id", ondelete="SET NULL"), nullable=True
    )
    lote_origen_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("lotes_produccion.id", ondelete="SET NULL"), nullable=True
    )

    # 1. Denominación y Contenidos Netos (Cap. V CAA)
    denominacion_venta: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    contenido_neto: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    aplica_peso_escurrido: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    peso_escurrido: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 2. Identificación del Origen y Registros Sanitarios Declarativos (RNE / RNPA / RPPA)
    razon_social_elaborador: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    domicilio_elaborador: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    pais_origen: Mapped[Optional[str]] = mapped_column(
        String(100), default="Argentina", server_default="Argentina", nullable=True
    )
    rne_elaborador: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rnpa_rppa: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 3. Campos Condicionales de Importador (solo exigibles si es_importado == True)
    es_importado: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    nombre_importador: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    domicilio_importador: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    rne_importador: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 4. Lote, Duración Mínima, Conservación e Instrucciones de Uso
    codigo_lote_declarado: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    fecha_duracion_minima: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    condiciones_conservacion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aplica_instrucciones_uso: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    instrucciones_uso: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 5. Bloques Precargables y Editables Manualmente (Snapshots del Rótulo)
    lista_ingredientes_texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tamano_porcion_declarado: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    leyenda_vd_declarada: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tabla_nutricional_json: Mapped[Optional[list[dict]]] = mapped_column(JSON, nullable=True)
    sellos_advertencia_json: Mapped[Optional[list[dict]]] = mapped_column(JSON, nullable=True)
    leyendas_precautorias_json: Mapped[Optional[list[dict]]] = mapped_column(JSON, nullable=True)

    # 6. Alérgenos, Contaminación Cruzada y Conservación Estructurada (Art. 235 séptimo CAA)
    alergenos_presentes_json: Mapped[Optional[list[dict]]] = mapped_column(JSON, nullable=True)
    alergenos_contaminacion_cruzada_json: Mapped[Optional[list[dict]]] = mapped_column(
        JSON, nullable=True
    )
    leyenda_alergenos_declarada: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    temp_conservacion_min_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temp_conservacion_max_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    durabilidad_antes_abrir: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    durabilidad_despues_abrir: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # 7. Flags de Auditoría de Edición Manual y Validación de Alérgenos
    ingredientes_modificado_manualmente: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    nutricion_modificada_manualmente: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    sellos_modificados_manualmente: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    lote_modificado_manualmente: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    alergenos_modificados_manualmente: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    conservacion_modificada_manualmente: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    estado_validacion_alergenos: Mapped[str] = mapped_column(
        String(20), default="SUGERIDO", server_default="SUGERIDO", nullable=False
    )
    hash_firma_receta_alergenos: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    confirmado_alergenos_por_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("personal.id", ondelete="SET NULL"), nullable=True
    )
    fecha_confirmacion_alergenos: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # 8. Metadatos de Auditoría
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )
    actualizado_por_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("personal.id", ondelete="SET NULL"), nullable=True
    )

    producto: Mapped["Producto"] = relationship("Producto", back_populates="rotulo")
    actualizado_por: Mapped[Optional["Persona"]] = relationship(
        "Persona", foreign_keys=[actualizado_por_id], lazy="selectin"
    )
    confirmado_alergenos_por: Mapped[Optional["Persona"]] = relationship(
        "Persona", foreign_keys=[confirmado_alergenos_por_id], lazy="selectin"
    )

    @property
    def actualizado_por_nombre(self) -> Optional[str]:
        if self.actualizado_por:
            return f"{self.actualizado_por.nombre} {self.actualizado_por.apellido}".strip()
        return None

    @property
    def confirmado_alergenos_por_nombre(self) -> Optional[str]:
        if self.confirmado_alergenos_por:
            return f"{self.confirmado_alergenos_por.nombre} {self.confirmado_alergenos_por.apellido}".strip()
        return None
