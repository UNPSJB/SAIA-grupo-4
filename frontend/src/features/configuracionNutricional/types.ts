export interface ParametroNutricional {
  id: number;
  codigo_nutriente: string;
  nombre_etiqueta: string;
  unidad: string;
  orden: number;
  nivel_indentacion: number;
  permite_vdr: boolean;
  vdr: number | string | null;
  decimales: number;
  umbral_no_significativo: number | string | null;
  texto_no_significativo: string | null;
  factor_conversion_kj: number | string | null;
}

export interface ParametroNutricionalUpdateItem {
  codigo_nutriente: string;
  vdr: number | null;
  decimales: number;
  umbral_no_significativo: number | null;
  texto_no_significativo: string | null;
  factor_conversion_kj: number | null;
}

export interface NormativaRotulado {
  id: number;
  codigo_normativa: string;
  nombre: string;
  version: string;
  activa: boolean;
  requiere_envasado_ausencia_cliente: boolean;
  evalua_azucares_agregados: boolean;
  evalua_grasas_agregadas: boolean;
  evalua_sodio_agregado: boolean;
  evalua_edulcorantes: boolean;
  evalua_cafeina: boolean;
  descripcion: string | null;
  fecha_actualizacion: string;
}

export interface NormativaRotuladoUpdate {
  nombre: string;
  version: string;
  requiere_envasado_ausencia_cliente: boolean;
  evalua_azucares_agregados: boolean;
  evalua_grasas_agregadas: boolean;
  evalua_sodio_agregado: boolean;
  evalua_edulcorantes: boolean;
  evalua_cafeina: boolean;
  descripcion: string | null;
}
