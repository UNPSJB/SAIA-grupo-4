from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from src.recetas.schemas import ComposicionPorcentualOut, InformacionNutricionalOut
from src.rotulado.schemas import AplicabilidadFrontalOut, SellosAdvertenciaOut
from src.rotulado_producto.constants import CodigoAlergenoCAA, EstadoValidacionAlergenos


class AlergenoRotuloItem(BaseModel):
    codigo: CodigoAlergenoCAA
    es_derivado: bool = False


class OrigenAlergenoOut(BaseModel):
    codigo: CodigoAlergenoCAA
    etiqueta: str
    es_derivado: bool
    insumos_fuente: list[str] = []


class ConservacionSugeridaOut(BaseModel):
    temp_conservacion_min_c: Optional[float] = None
    temp_conservacion_max_c: Optional[float] = None
    durabilidad_antes_abrir: Optional[str] = None
    durabilidad_despues_abrir: Optional[str] = None
    condiciones_conservacion: Optional[str] = None


class FilaNutricionalRotuloItem(BaseModel):
    codigo_nutriente: str
    nombre_etiqueta: str
    unidad: str
    nivel_indentacion: int = 0
    valor_100g: Optional[str] = None
    valor_porcion: Optional[str] = None
    porcentaje_vd: Optional[str] = None
    lleva_vd: bool = True


class SelloRotuloItem(BaseModel):
    codigo: str
    texto: str


class LoteResumenRotuloOut(BaseModel):
    id: int
    codigo_lote: str
    fecha_elaboracion: datetime
    fecha_vencimiento: date
    receta_codigo: str


class ItemCompletitudCAAOut(BaseModel):
    clave: str
    etiqueta: str
    seccion: str
    obligatorio: bool = True
    completado: bool
    motivo_faltante: Optional[str] = None


class CompletitudCAAOut(BaseModel):
    porcentaje: int
    total_obligatorios: int
    total_completados: int
    esta_completo: bool
    campos_faltantes: list[str] = []
    detalle: list[ItemCompletitudCAAOut] = []


class DatosAutocompletadosRecetaOut(BaseModel):
    tiene_receta_activa: bool
    receta_id: Optional[int] = None
    receta_codigo: Optional[str] = None
    receta_nombre: Optional[str] = None
    lista_ingredientes_calculada: Optional[str] = None
    tamano_porcion_calculado: Optional[str] = None
    leyenda_vd_calculada: Optional[str] = None
    tabla_nutricional_calculada: list[FilaNutricionalRotuloItem] = []
    sellos_calculados: list[SelloRotuloItem] = []
    leyendas_calculadas: list[SelloRotuloItem] = []
    dictamen_aplicabilidad: Optional[str] = None
    ultimo_lote: Optional[LoteResumenRotuloOut] = None
    lotes_disponibles: list[LoteResumenRotuloOut] = []
    razon_social_establecimiento: Optional[str] = None
    domicilio_establecimiento: Optional[str] = None
    alergenos_presentes_calculados: list[AlergenoRotuloItem] = []
    detalle_origen_alergenos: list[OrigenAlergenoOut] = []
    leyenda_alergenos_calculada: Optional[str] = None
    conservacion_sugerida: Optional[ConservacionSugeridaOut] = None


class RotuloProductoUpdateIn(BaseModel):
    # Todos los campos son opcionales para permitir guardado de borrador incompleto sin error 422
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[str] = None
    aplica_peso_escurrido: bool = False
    peso_escurrido: Optional[str] = None

    razon_social_elaborador: Optional[str] = None
    domicilio_elaborador: Optional[str] = None
    pais_origen: Optional[str] = "Argentina"
    rne_elaborador: Optional[str] = None
    rnpa_rppa: Optional[str] = None

    es_importado: bool = False
    nombre_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    rne_importador: Optional[str] = None

    lote_origen_id: Optional[int] = None
    codigo_lote_declarado: Optional[str] = None
    fecha_duracion_minima: Optional[str] = None
    condiciones_conservacion: Optional[str] = None
    aplica_instrucciones_uso: bool = False
    instrucciones_uso: Optional[str] = None

    lista_ingredientes_texto: Optional[str] = None
    tamano_porcion_declarado: Optional[str] = None
    leyenda_vd_declarada: Optional[str] = None
    tabla_nutricional_json: Optional[list[FilaNutricionalRotuloItem]] = None
    sellos_advertencia_json: Optional[list[SelloRotuloItem]] = None
    leyendas_precautorias_json: Optional[list[SelloRotuloItem]] = None

    # Alérgenos, Contaminación Cruzada y Conservación Estructurada (Art. 235 séptimo CAA)
    alergenos_presentes_json: Optional[list[AlergenoRotuloItem]] = None
    alergenos_contaminacion_cruzada_json: Optional[list[AlergenoRotuloItem]] = None
    leyenda_alergenos_declarada: Optional[str] = None
    temp_conservacion_min_c: Optional[float] = None
    temp_conservacion_max_c: Optional[float] = None
    durabilidad_antes_abrir: Optional[str] = None
    durabilidad_despues_abrir: Optional[str] = None
    confirmar_alergenos_conservacion: bool = False

    # Acciones opcionales para restaurar un bloque puntual al cálculo automático
    restaurar_ingredientes_automatico: bool = False
    restaurar_nutricion_automatico: bool = False
    restaurar_sellos_automatico: bool = False
    restaurar_lote_automatico: bool = False
    restaurar_alergenos_automatico: bool = False
    restaurar_conservacion_automatico: bool = False


class RotuloProductoConsolidadoOut(BaseModel):
    id: Optional[int] = None
    producto_id: int
    producto_nombre: str
    unidad_medida_simbolo: str
    envasado_ausencia_cliente: bool
    guardado_en_bd: bool

    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[str] = None
    aplica_peso_escurrido: bool = False
    peso_escurrido: Optional[str] = None

    razon_social_elaborador: Optional[str] = None
    domicilio_elaborador: Optional[str] = None
    pais_origen: Optional[str] = "Argentina"
    rne_elaborador: Optional[str] = None
    rnpa_rppa: Optional[str] = None

    es_importado: bool = False
    nombre_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    rne_importador: Optional[str] = None

    lote_origen_id: Optional[int] = None
    codigo_lote_declarado: Optional[str] = None
    fecha_duracion_minima: Optional[str] = None
    condiciones_conservacion: Optional[str] = None
    aplica_instrucciones_uso: bool = False
    instrucciones_uso: Optional[str] = None

    lista_ingredientes_texto: Optional[str] = None
    tamano_porcion_declarado: Optional[str] = None
    leyenda_vd_declarada: Optional[str] = None
    tabla_nutricional_json: list[FilaNutricionalRotuloItem] = []
    sellos_advertencia_json: list[SelloRotuloItem] = []
    leyendas_precautorias_json: list[SelloRotuloItem] = []

    alergenos_presentes_json: list[AlergenoRotuloItem] = []
    alergenos_contaminacion_cruzada_json: list[AlergenoRotuloItem] = []
    leyenda_alergenos_declarada: Optional[str] = None
    temp_conservacion_min_c: Optional[float] = None
    temp_conservacion_max_c: Optional[float] = None
    durabilidad_antes_abrir: Optional[str] = None
    durabilidad_despues_abrir: Optional[str] = None

    ingredientes_modificado_manualmente: bool = False
    nutricion_modificada_manualmente: bool = False
    sellos_modificados_manualmente: bool = False
    lote_modificado_manualmente: bool = False
    alergenos_modificados_manualmente: bool = False
    conservacion_modificada_manualmente: bool = False

    ingredientes_difiere_de_receta: bool = False
    nutricion_difiere_de_receta: bool = False
    sellos_difieren_de_receta: bool = False
    lote_difiere_de_ultimo_lote: bool = False
    alergenos_difieren_de_receta: bool = False
    conservacion_difiere_de_sugerida: bool = False

    estado_validacion_alergenos: EstadoValidacionAlergenos = EstadoValidacionAlergenos.SUGERIDO
    confirmacion_invalidada_por_cambio_receta: bool = False
    fecha_confirmacion_alergenos: Optional[datetime] = None
    confirmado_alergenos_por_nombre: Optional[str] = None

    fecha_actualizacion: Optional[datetime] = None
    actualizado_por_nombre: Optional[str] = None

    autocompletado: DatosAutocompletadosRecetaOut
    completitud_caa: CompletitudCAAOut

    model_config = ConfigDict(from_attributes=True)


class CaraPrincipalRotuloOut(BaseModel):
    denominacion_venta: Optional[str] = None
    contenido_neto: Optional[str] = None
    aplica_peso_escurrido: bool = False
    peso_escurrido: Optional[str] = None

    modulo_octogonos_activo: bool = True
    dictamen_aplicabilidad: Optional[str] = None
    dictamen_titulo: Optional[str] = None
    motivo_aplicabilidad: Optional[str] = None
    sellos_calculables: bool = True
    sellos_advertencia: list[SelloRotuloItem] = []
    leyendas_precautorias: list[SelloRotuloItem] = []
    aviso_sin_sellos: Optional[str] = None


class OrigenRotuloPreviewOut(BaseModel):
    razon_social_elaborador: Optional[str] = None
    domicilio_elaborador: Optional[str] = None
    pais_origen: Optional[str] = None
    rne_elaborador: Optional[str] = None
    rnpa_rppa: Optional[str] = None
    es_importado: bool = False
    nombre_importador: Optional[str] = None
    domicilio_importador: Optional[str] = None
    rne_importador: Optional[str] = None


class ConservacionLotePreviewOut(BaseModel):
    codigo_lote: Optional[str] = None
    fecha_duracion_minima: Optional[str] = None
    temp_conservacion_min_c: Optional[float] = None
    temp_conservacion_max_c: Optional[float] = None
    durabilidad_antes_abrir: Optional[str] = None
    durabilidad_despues_abrir: Optional[str] = None
    condiciones_conservacion: Optional[str] = None
    aplica_instrucciones_uso: bool = False
    instrucciones_uso: Optional[str] = None


class NutricionRotuloPreviewOut(BaseModel):
    es_completa: bool
    motivo_incompleta: Optional[str] = None
    tamano_porcion: Optional[str] = None
    base_etiqueta: str = "100 g"
    filas: list[FilaNutricionalRotuloItem] = []
    leyenda_vd: Optional[str] = None


class VistaPreviaRotuloOut(BaseModel):
    producto_id: int
    producto_nombre: str
    guardado_en_bd: bool
    tiene_receta_activa: bool
    receta_codigo: Optional[str] = None
    receta_nombre: Optional[str] = None

    leyenda_borrador_obligatoria: str

    cara_principal: CaraPrincipalRotuloOut
    lista_ingredientes_texto: Optional[str] = None
    leyenda_alergenos_declarada: Optional[str] = None
    estado_validacion_alergenos: EstadoValidacionAlergenos
    nutricion: NutricionRotuloPreviewOut
    origen: OrigenRotuloPreviewOut
    conservacion_lote: ConservacionLotePreviewOut

    completitud_caa: CompletitudCAAOut
    tabla_nutricional_incompleta: bool
    advertencias: list[str] = []
    fecha_generacion: datetime

    model_config = ConfigDict(from_attributes=True)


class InsumoAnexoRecetaOut(BaseModel):
    insumo_id: int
    nombre: str
    denominacion_rotulo: Optional[str] = None
    categoria: str
    es_aditivo: bool = False
    clase_funcional: Optional[str] = None
    numero_ins: Optional[str] = None
    cantidad_nominal: float
    unidad_simbolo: str


class AnexoRecetaActivaOut(BaseModel):
    receta_id: int
    codigo_receta: str
    nombre_receta: str
    estado_receta: str
    fecha_creacion: datetime
    rendimiento_estandar: float
    unidad_rendimiento: str
    tamano_porcion: Optional[float] = None
    version_parametro_frontal: Optional[str] = None
    ingredientes: list[InsumoAnexoRecetaOut] = []
    aditivos: list[InsumoAnexoRecetaOut] = []


class FuenteNutricionalInsumoOut(BaseModel):
    insumo_id: int
    nombre: str
    categoria: str
    nutricion_completa: bool
    fuente_nutricional: Optional[str] = None
    es_nutricion_modificada: bool = False
    fecha_carga_nutricional: Optional[datetime] = None
    fecha_modificacion_nutricional: Optional[datetime] = None
    campos_faltantes: list[str] = []


class AnexoNutricionDetalladaOut(BaseModel):
    informacion_nutricional: InformacionNutricionalOut
    fuentes_datos_insumos: list[FuenteNutricionalInsumoOut] = []


class AnexoMemoriaSellosOut(BaseModel):
    aplicabilidad: AplicabilidadFrontalOut
    sellos: SellosAdvertenciaOut


class RespaldoCalculoRotuloOut(BaseModel):
    producto_id: int
    producto_nombre: str
    fecha_emision: datetime
    leyenda_borrador_obligatoria: str
    codigo_receta_empleada: Optional[str] = None
    version_parametros_aplicada: Optional[str] = None
    tiene_receta_activa: bool

    vista_previa: VistaPreviaRotuloOut

    anexo_receta: Optional[AnexoRecetaActivaOut] = None
    anexo_composicion: Optional[ComposicionPorcentualOut] = None
    es_orden_ingredientes_manual: bool = False
    anexo_nutricion: Optional[AnexoNutricionDetalladaOut] = None
    anexo_memoria_sellos: Optional[AnexoMemoriaSellosOut] = None

    model_config = ConfigDict(from_attributes=True)
