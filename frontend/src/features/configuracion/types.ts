export interface ConfiguracionPublica {
  nombre_establecimiento: string;
  logo_url: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  sitio_web: string | null;
  pie_informes: string | null;
}

export interface ConfiguracionSistema extends ConfiguracionPublica {
  id: number;
  razon_social: string | null;
  cuit: string | null;
  fecha_modificacion: string;
  modificado_por_id: number | null;
  modificado_por_nombre: string | null;
}

export interface ConfiguracionUpdatePayload {
  nombre_establecimiento: string;
  razon_social?: string | null;
  cuit?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  telefono?: string | null;
  email?: string | null;
  sitio_web?: string | null;
  pie_informes?: string | null;
}

export interface ReglaUmbralFrontal {
  id?: number;
  version_id?: number;
  nutriente_critico: string;
  leyenda_sello: string;
  categoria: "ALIMENTO" | "BEBIDA" | string;
  valor_umbral: number;
  unidad_umbral: string;
  condicion: string | null;
}

export interface VersionParametroFrontal {
  id: number;
  numero_version: number;
  normativa_referencia: string;
  motivo_cambio: string | null;
  estado: "VIGENTE" | "HISTORICA" | string;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string | null;
  creado_por_id: number | null;
  creado_por_nombre: string | null;
  reglas: ReglaUmbralFrontal[];
}

export interface ConfiguracionModuloOctogonos {
  id: number;
  octogonos_activos: boolean;
  observacion: string | null;
  fecha_modificacion: string;
  modificado_por_id: number | null;
  modificado_por_nombre: string | null;
}

export interface ParametrosFrontalesConsolidado {
  modulo: ConfiguracionModuloOctogonos;
  version_vigente: VersionParametroFrontal;
  historial: VersionParametroFrontal[];
}

export interface CrearVersionParametrosPayload {
  normativa_referencia: string;
  motivo_cambio?: string | null;
  reglas: Omit<ReglaUmbralFrontal, "id" | "version_id">[];
}