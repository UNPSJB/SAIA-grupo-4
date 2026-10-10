import { z } from 'zod';
import { TIPOS_DOCUMENTO } from './types';

const tipoDocumentoEnum = z.enum(TIPOS_DOCUMENTO, {
  error: 'Debes seleccionar un tipo de documento válido'
});

export const documentoSchema = z.object({
  codigo: z.string().optional(),
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  tipo_documento: tipoDocumentoEnum,
  descripcion: z.string().optional(),
  
  archivo: z.instanceof(File).optional().nullable(),
  version_inicial: z.string().optional(),
  fecha_proxima_revision: z.string().optional(),
}).refine((data) => {
  // Regla: Si se sube archivo en la creación, debe especificar obligatoriamente la versión
  if (data.archivo && (!data.version_inicial || data.version_inicial.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Si adjuntas un documento, debes indicar el número de versión (ej. v1.0)',
  path: ['version_inicial'],
});

export const subirVersionSchema = z.object({
  archivo: z.instanceof(File, { message: 'Debes adjuntar un archivo PDF' })
    .refine((file) => file.size > 0, 'El archivo no puede estar vacío'),
  version: z.string().min(1, 'El número de versión es obligatorio (ej. v1.1)'),
  // Opcional: la versión puede subirse sin revisión programada
  fecha_proxima_revision: z.string().optional(),
  observaciones_cambio: z.string().optional(),
});

export const registrarRevisionSchema = z.object({
  // Ambas opcionales, pero se exige al menos una: registrar una revisión sin fecha ni notas no deja ningún rastro útil en el historial
  fecha_proxima_revision: z.string().optional(),
  observaciones: z.string().optional(),
}).refine((data) => {
  const tieneFecha = (data.fecha_proxima_revision ?? '').trim() !== '';
  const tieneObservaciones = (data.observaciones ?? '').trim() !== '';
  return tieneFecha || tieneObservaciones;
}, {
  message: 'Ingresá al menos la nueva fecha de revisión o una observación',
  path: ['fecha_proxima_revision'],
});