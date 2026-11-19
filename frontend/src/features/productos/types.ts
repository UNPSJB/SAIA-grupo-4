import type { CodigoAlergenoCAA } from "../insumo/types";
import type { UnidadMedida } from "../unidadMedida/types";

export interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    dias_vida_util?: number | null;
    envasado_ausencia_cliente: boolean;
    activo: boolean;
}

export type ProductoCreate = {
    nombre: string;
    descripcion: string;
    unidad_medida_id: number;
    dias_vida_util?: number | null;
    envasado_ausencia_cliente?: boolean;
};

export interface FilaNutricionalRotuloItem {
    codigo_nutriente: string;
    nombre_etiqueta: string;
    unidad: string;
    nivel_indentacion: number;
    valor_100g?: string | null;
    valor_porcion?: string | null;
    porcentaje_vd?: string | null;
    lleva_vd: boolean;
}

export interface SelloRotuloItem {
    codigo: string;
    texto: string;
}

export interface LoteResumenRotulo {
    id: number;
    codigo_lote: string;
    fecha_elaboracion: string;
    fecha_vencimiento: string;
    receta_codigo: string;
}

export interface ItemCompletitudCAA {
    clave: string;
    etiqueta: string;
    seccion: string;
    obligatorio: boolean;
    completado: boolean;
    motivo_faltante?: string | null;
}

export interface CompletitudCAA {
    porcentaje: number;
    total_obligatorios: number;
    total_completados: number;
    esta_completo: boolean;
    campos_faltantes: string[];
    detalle: ItemCompletitudCAA[];
}

export type EstadoValidacionAlergenos = "SUGERIDO" | "CONFIRMADO";

export interface AlergenoRotuloItem {
    codigo: CodigoAlergenoCAA;
    es_derivado: boolean;
}

export interface OrigenAlergenoOut {
    codigo: CodigoAlergenoCAA;
    etiqueta: string;
    es_derivado: boolean;
    insumos_fuente: string[];
}

export interface ConservacionSugeridaOut {
    temp_conservacion_min_c?: number | null;
    temp_conservacion_max_c?: number | null;
    durabilidad_antes_abrir?: string | null;
    durabilidad_despues_abrir?: string | null;
    condiciones_conservacion?: string | null;
}

export interface DatosAutocompletadosReceta {
    tiene_receta_activa: boolean;
    receta_id?: number | null;
    receta_codigo?: string | null;
    receta_nombre?: string | null;
    lista_ingredientes_calculada?: string | null;
    tamano_porcion_calculado?: string | null;
    leyenda_vd_calculada?: string | null;
    tabla_nutricional_calculada: FilaNutricionalRotuloItem[];
    sellos_calculados: SelloRotuloItem[];
    leyendas_calculadas: SelloRotuloItem[];
    dictamen_aplicabilidad?: string | null;
    ultimo_lote?: LoteResumenRotulo | null;
    lotes_disponibles: LoteResumenRotulo[];
    razon_social_establecimiento?: string | null;
    domicilio_establecimiento?: string | null;
    alergenos_presentes_calculados: AlergenoRotuloItem[];
    detalle_origen_alergenos: OrigenAlergenoOut[];
    leyenda_alergenos_calculada?: string | null;
    conservacion_sugerida?: ConservacionSugeridaOut | null;
}

export interface RotuloProductoUpdate {
    denominacion_venta?: string | null;
    contenido_neto?: string | null;
    aplica_peso_escurrido: boolean;
    peso_escurrido?: string | null;

    razon_social_elaborador?: string | null;
    domicilio_elaborador?: string | null;
    pais_origen?: string | null;
    rne_elaborador?: string | null;
    rnpa_rppa?: string | null;

    es_importado: boolean;
    nombre_importador?: string | null;
    domicilio_importador?: string | null;
    rne_importador?: string | null;

    lote_origen_id?: number | null;
    codigo_lote_declarado?: string | null;
    fecha_duracion_minima?: string | null;
    condiciones_conservacion?: string | null;
    aplica_instrucciones_uso: boolean;
    instrucciones_uso?: string | null;

    lista_ingredientes_texto?: string | null;
    tamano_porcion_declarado?: string | null;
    leyenda_vd_declarada?: string | null;
    tabla_nutricional_json?: FilaNutricionalRotuloItem[];
    sellos_advertencia_json?: SelloRotuloItem[];
    leyendas_precautorias_json?: SelloRotuloItem[];

    alergenos_presentes_json?: AlergenoRotuloItem[];
    alergenos_contaminacion_cruzada_json?: AlergenoRotuloItem[];
    leyenda_alergenos_declarada?: string | null;
    temp_conservacion_min_c?: number | null;
    temp_conservacion_max_c?: number | null;
    durabilidad_antes_abrir?: string | null;
    durabilidad_despues_abrir?: string | null;
    confirmar_alergenos_conservacion?: boolean;

    restaurar_ingredientes_automatico?: boolean;
    restaurar_nutricion_automatico?: boolean;
    restaurar_sellos_automatico?: boolean;
    restaurar_lote_automatico?: boolean;
    restaurar_alergenos_automatico?: boolean;
    restaurar_conservacion_automatico?: boolean;
}

export interface RotuloProductoConsolidado {
    id?: number | null;
    producto_id: number;
    producto_nombre: string;
    unidad_medida_simbolo: string;
    envasado_ausencia_cliente: boolean;
    guardado_en_bd: boolean;

    denominacion_venta?: string | null;
    contenido_neto?: string | null;
    aplica_peso_escurrido: boolean;
    peso_escurrido?: string | null;

    razon_social_elaborador?: string | null;
    domicilio_elaborador?: string | null;
    pais_origen?: string | null;
    rne_elaborador?: string | null;
    rnpa_rppa?: string | null;

    es_importado: boolean;
    nombre_importador?: string | null;
    domicilio_importador?: string | null;
    rne_importador?: string | null;

    lote_origen_id?: number | null;
    codigo_lote_declarado?: string | null;
    fecha_duracion_minima?: string | null;
    condiciones_conservacion?: string | null;
    aplica_instrucciones_uso: boolean;
    instrucciones_uso?: string | null;

    lista_ingredientes_texto?: string | null;
    tamano_porcion_declarado?: string | null;
    leyenda_vd_declarada?: string | null;
    tabla_nutricional_json: FilaNutricionalRotuloItem[];
    sellos_advertencia_json: SelloRotuloItem[];
    leyendas_precautorias_json: SelloRotuloItem[];

    alergenos_presentes_json: AlergenoRotuloItem[];
    alergenos_contaminacion_cruzada_json: AlergenoRotuloItem[];
    leyenda_alergenos_declarada?: string | null;
    temp_conservacion_min_c?: number | null;
    temp_conservacion_max_c?: number | null;
    durabilidad_antes_abrir?: string | null;
    durabilidad_despues_abrir?: string | null;

    ingredientes_modificado_manualmente: boolean;
    nutricion_modificada_manualmente: boolean;
    sellos_modificados_manualmente: boolean;
    lote_modificado_manualmente: boolean;
    alergenos_modificados_manualmente: boolean;
    conservacion_modificada_manualmente: boolean;

    ingredientes_difiere_de_receta: boolean;
    nutricion_difiere_de_receta: boolean;
    sellos_difieren_de_receta: boolean;
    lote_difiere_de_ultimo_lote: boolean;
    alergenos_difieren_de_receta: boolean;
    conservacion_difiere_de_sugerida: boolean;

    estado_validacion_alergenos: EstadoValidacionAlergenos;
    confirmacion_invalidada_por_cambio_receta: boolean;
    fecha_confirmacion_alergenos?: string | null;
    confirmado_alergenos_por_nombre?: string | null;

    fecha_actualizacion?: string | null;
    actualizado_por_nombre?: string | null;

    autocompletado: DatosAutocompletadosReceta;
    completitud_caa: CompletitudCAA;
}
