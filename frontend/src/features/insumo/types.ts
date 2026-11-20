export type EstadoLote = "activo" | "vencido" | "inhabilitado" | "agotado";
export type CodigoAlergenoCAA =
  | "TRIGO"
  | "AVENA"
  | "CEBADA"
  | "CENTENO"
  | "CRUSTACEOS"
  | "HUEVO"
  | "PESCADO"
  | "MANI"
  | "SOJA"
  | "LECHE"
  | "ALMENDRAS"
  | "AVELLANAS"
  | "CASTANAS"
  | "NUECES"
  | "PISTACHOS"
  | "DIOXIDO_AZUFRE_SULFITOS";

export interface AlergenoInsumoItem {
  codigo: CodigoAlergenoCAA;
  es_derivado: boolean;
}

export const CATALOGO_ALERGENOS_CAA: Array<{
  codigo: CodigoAlergenoCAA;
  label: string;
}> = [
  { codigo: "TRIGO", label: "TRIGO" },
  { codigo: "AVENA", label: "AVENA" },
  { codigo: "CEBADA", label: "CEBADA" },
  { codigo: "CENTENO", label: "CENTENO" },
  { codigo: "CRUSTACEOS", label: "CRUSTÁCEOS" },
  { codigo: "HUEVO", label: "HUEVO" },
  { codigo: "PESCADO", label: "PESCADO" },
  { codigo: "MANI", label: "MANÍ" },
  { codigo: "SOJA", label: "SOJA" },
  { codigo: "LECHE", label: "LECHE" },
  { codigo: "ALMENDRAS", label: "ALMENDRAS" },
  { codigo: "AVELLANAS", label: "AVELLANAS" },
  { codigo: "CASTANAS", label: "CASTAÑAS" },
  { codigo: "NUECES", label: "NUECES" },
  { codigo: "PISTACHOS", label: "PISTACHOS" },
  { codigo: "DIOXIDO_AZUFRE_SULFITOS", label: "SULFITOS (≥ 10 ppm)" },
];

export interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
  tipo_magnitud: string;
  disponible: boolean;
}

export interface Insumo {
  id: number;
  nombre: string;
  unidad_medida_id: number;
  unidad_medida: UnidadMedida;
  categoria: string;
  descripcion: string;
  disponible: boolean;

  densidad_g_ml?: number | null;
  peso_unitario_g?: number | null;
  denominacion_rotulo?: string | null;
  clase_funcional?: string | null;
  numero_ins?: string | null;
  denominacion_efectiva?: string;

  // Perfil nutricional
  base_calculo?: "100g" | "100ml" | string;
  valor_energetico_kcal?: number | string | null;
  carbohidratos_g?: number | string | null;
  azucares_totales_g?: number | string | null;
  azucares_anadidos_g?: number | string | null;
  proteinas_g?: number | string | null;
  grasas_totales_g?: number | string | null;
  grasas_saturadas_g?: number | string | null;
  grasas_trans_g?: number | string | null;
  fibra_g?: number | string | null;
  sodio_mg?: number | string | null;

  // Flags de aportes para rotulado frontal (Ley 27.642)
  aporta_azucares_agregados?: boolean;
  aporta_grasas_agregadas?: boolean;
  aporta_sodio_agregado?: boolean;
  es_edulcorante?: boolean;
  contiene_cafeina?: boolean;

  // Alérgenos CAA (Art. 235 séptimo)
  alergenos_declarados_json?: AlergenoInsumoItem[];

  // Auditoría y trazabilidad
  alimento_referencia_id?: number | null;
  fuente_nutricional?: string | null;
  fecha_carga_nutricional?: string | null;
  es_nutricion_modificada?: boolean;
  modificado_por_usuario_id?: number | null;
  fecha_modificacion_nutricional?: string | null;
  nutricion_completa?: boolean;
}

export interface LoteInsumo {
  id: number;
  insumo_id: number;
  codigo_lote: string;
  fecha_vencimiento: string; // "YYYY-MM-DD"
  cantidad_inicial: number;
  cantidad_actual: number;
  activo: boolean;
  estado: EstadoLote;
  motivo_inhabilitacion: string | null;
  fecha_inhabilitacion: string | null;
  usuario_inhabilitacion: PersonalResumen | null;
}

export interface PersonalResumen {
  id: number;
  nombre: string;
  apellido: string;
}