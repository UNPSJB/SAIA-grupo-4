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
  fecha_proxima_revision: z.string().min(1, 'La fecha de próxima revisión es obligatoria'),
  observaciones_cambio: z.string().optional(),
});

export const registrarRevisionSchema = z.object({
  fecha_proxima_revision: z.string().min(1, 'La nueva fecha es obligatoria'),
  observaciones: z.string().min(5, 'Debes ingresar una nota justificando la revisión y por qué no requirió cambios en el PDF'),
});