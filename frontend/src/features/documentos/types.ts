export const TIPOS_DOCUMENTO = [
  'MANUAL_BPM',
  'PROCEDIMIENTO',
  'INSTRUCTIVO',
  'PLANILLA',
  'OTRO'
] as const;

export type TipoDocumento = typeof TIPOS_DOCUMENTO[number];

export interface VersionDocumento {
  id: number;
  documento_id: number;
  version: string;
  archivo_url: string;
  es_vigente: boolean;
  fecha_desde: string;
  fecha_hasta: string | null;
  fecha_proxima_revision: string | null;
  observaciones_cambio: string | null;
  creado_por_id: number;
  subido_por_nombre: string | null;
  fecha_subida: string;
}

export interface Documento {
  id: number;
  codigo: string | null;
  titulo: string;
  tipo_documento: TipoDocumento;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
  version_vigente: VersionDocumento | null;
}

export interface DocumentoDetalle extends Documento {
  versiones: VersionDocumento[];
}

// DTOs para los Formularios del Frontend

export interface DocumentoFormData {
  codigo?: string;
  titulo: string;
  tipo_documento: TipoDocumento | '';
  descripcion?: string;
  // Solo en alta: lo completa el frontend con el usuario logueado (obligatorio en el backend)
  creado_por_id?: number;
  // Opcionales para el alta inicial
  archivo?: File | null;
  version_inicial?: string;
  fecha_proxima_revision?: string;
}

export interface SubirVersionFormData {
  archivo: File | null;
  version: string;
  fecha_proxima_revision: string;
  observaciones_cambio?: string;
}

export interface RegistrarRevisionFormData {
  fecha_proxima_revision: string;
  observaciones: string;
}