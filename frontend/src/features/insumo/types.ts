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
  consumo: number;
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

  // Auditoría y trazabilidad
  alimento_referencia_id?: number | null;
  fuente_nutricional?: string | null;
  fecha_carga_nutricional?: string | null;
  es_nutricion_modificada?: boolean;
  modificado_por_usuario_id?: number | null;
  fecha_modificacion_nutricional?: string | null;
  nutricion_completa?: boolean;
}
