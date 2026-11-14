export interface AlimentoReferencia {
  id: number;
  codigo?: string | null;
  alimento: string;
  categoria?: string | null;
  energia_kcal: number | string;
  proteinas_g: number | string;
  grasas_totales_g: number | string;
  carbohidratos_g: number | string;
  fibra_g: number | string;
  sodio_mg: number | string;
  grasas_saturadas_g: number | string;
  es_oficial_sara: boolean;
}
