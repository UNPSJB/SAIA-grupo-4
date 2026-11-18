from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


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

    # Acciones opcionales para restaurar un bloque puntual al cálculo automático
    restaurar_ingredientes_automatico: bool = False
    restaurar_nutricion_automatico: bool = False
    restaurar_sellos_automatico: bool = False
    restaurar_lote_automatico: bool = False


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

    ingredientes_modificado_manualmente: bool = False
    nutricion_modificada_manualmente: bool = False
    sellos_modificados_manualmente: bool = False
    lote_modificado_manualmente: bool = False

    ingredientes_difiere_de_receta: bool = False
    nutricion_difiere_de_receta: bool = False
    sellos_difieren_de_receta: bool = False
    lote_difiere_de_ultimo_lote: bool = False

    fecha_actualizacion: Optional[datetime] = None
    actualizado_por_nombre: Optional[str] = None

    autocompletado: DatosAutocompletadosRecetaOut
    completitud_caa: CompletitudCAAOut

    model_config = ConfigDict(from_attributes=True)
