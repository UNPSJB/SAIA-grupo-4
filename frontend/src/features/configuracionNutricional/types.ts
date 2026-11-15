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
