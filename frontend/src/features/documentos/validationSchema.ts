import { z } from 'zod';
import { TIPOS_DOCUMENTO, type Documento } from './types';

export const PATRON_VERSION = /^[vV]?(\d+)\.(\d+)$/;

export const parsearVersion = (valor: string): [number, number] | null => {
  const match = PATRON_VERSION.exec((valor ?? '').trim());
  if (!match) return null;
  const mayor = Number(match[1]);
  const menor = Number(match[2]);
  if (!Number.isInteger(mayor) || !Number.isInteger(menor)) return null;
  if (mayor < 1 && menor < 0) return null;
  if (mayor === 0) return null;
  return [mayor, menor];
};

export const normalizarVersion = (valor: string): string => {
  const tupla = parsearVersion(valor);
  if (!tupla) return valor.trim();
  return `v${tupla[0]}.${tupla[1]}`;
};

export const compararVersiones = (
  a: [number, number],
  b: [number, number],
): number => {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
};

export const obtenerUltimaVersionDocumento = (
  documento?: Documento,
): { tupla: [number, number]; texto: string } | null => {
  if (!documento) return null;
  const candidatas: string[] = [];
  if (documento.version_vigente?.version) {
    candidatas.push(documento.version_vigente.version);
  }
  if (documento.versiones?.length) {
    for (const v of documento.versiones) {
      if (v.version) candidatas.push(v.version);
    }
  }

  let maxima: { tupla: [number, number]; texto: string } | null = null;
  for (const texto of candidatas) {
    const tupla = parsearVersion(texto);
    if (!tupla) continue;
    if (!maxima || compararVersiones(tupla, maxima.tupla) > 0) {
      maxima = { tupla, texto: `v${tupla[0]}.${tupla[1]}` };
    }
  }
  return maxima;
};

export const sugerirSiguienteVersion = (documento?: Documento): string => {
  const ultima = obtenerUltimaVersionDocumento(documento);
  if (!ultima) return 'v1.0';
  const [mayor, menor] = ultima.tupla;
  return `v${mayor}.${menor + 1}`;
};

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
}).refine(
  (data) => {
    if (!data.archivo) return true;
    const raw = (data.version_inicial ?? '').trim();
    if (!raw) return false;
    const tupla = parsearVersion(raw);
    return tupla !== null && tupla[0] === 1 && tupla[1] === 0;
  },
  {
    message: 'La versión inicial de un documento nuevo debe ser v1.0',
    path: ['version_inicial'],
  },
);

export const crearSubirVersionSchema = (
  ultimaVersion?: { tupla: [number, number]; texto: string } | null,
) =>
  z.object({
    archivo: z
      .instanceof(File, { message: 'Debes adjuntar un archivo PDF' })
      .refine((file) => file.size > 0, 'El archivo no puede estar vacío'),
    version: z
      .string()
      .min(1, 'El número de versión es obligatorio (ej. v1.1)')
      .refine(
        (val) => parsearVersion(val) !== null,
        'Formato inválido. Usá el formato X.Y o vX.Y (ej. 1.1, 2.0, v1.1)',
      )
      .refine((val) => {
        if (!ultimaVersion) return true;
        const tupla = parsearVersion(val);
        if (!tupla) return true; // El error de formato ya lo atrapa la regla anterior
        return compararVersiones(tupla, ultimaVersion.tupla) > 0;
      }, {
        message: ultimaVersion
          ? `Debe ser mayor a la última versión (${ultimaVersion.texto}), ej. v${ultimaVersion.tupla[0]}.${ultimaVersion.tupla[1] + 1} o v${ultimaVersion.tupla[0] + 1}.0`
          : 'Debe ser mayor a la última versión',
      }),
    // Opcional: la versión puede subirse sin revisión programada
    fecha_proxima_revision: z.string().optional(),
    observaciones_cambio: z.string().optional(),
  });

export const subirVersionSchema = crearSubirVersionSchema(null);

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