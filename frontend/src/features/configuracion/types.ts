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