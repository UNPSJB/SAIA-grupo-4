import type { ColumnaExportable, TablaExportable, ValorCelda } from "./tipos";

// "2026-11-09" o "2026-11-09T17:42:00" (con o sin segundos, fracción y zona).
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const FECHA_HORA_ISO =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

const dosDigitos = (n: number) => String(n).padStart(2, "0");

const formatearFecha = (fecha: Date, conHora: boolean) => {
  const dia = `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  return conHora
    ? `${dia} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
    : dia;
};

/** Convierte fechas ISO a formato argentino. Devuelve null si el texto no es una fecha. */
const formatearTextoFecha = (texto: string): string | null => {
  const soloFecha = FECHA_ISO.exec(texto);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;

  const fechaHora = FECHA_HORA_ISO.exec(texto);
  if (!fechaHora) return null;
  // Con zona horaria se pasa a hora local; sin zona se respeta la hora tal cual.
  if (fechaHora[6]) {
    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? null : formatearFecha(fecha, true);
  }
  return `${fechaHora[3]}/${fechaHora[2]}/${fechaHora[1]} ${fechaHora[4]}:${fechaHora[5]}`;
};

const formatearNumero = (numero: number) =>
  Number.isFinite(numero)
    ? numero.toLocaleString("es-AR", {
        useGrouping: false,
        maximumFractionDigits: 6,
      })
    : "";

/**
 * Normaliza cualquier valor a texto exportable:
 * nulos → "", booleanos → "Sí"/"No", fechas ISO → dd/mm/aaaa,
 * números con coma decimal, y objetos o listas anidados por su nombre.
 */
export const formatoValor = (valor: unknown): string => {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number") return formatearNumero(valor);
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? "" : formatearFecha(valor, false);
  }
  if (typeof valor === "string") {
    const texto = valor.trim();
    return formatearTextoFecha(texto) ?? texto;
  }
  if (Array.isArray(valor)) {
    return valor.map(formatoValor).filter(Boolean).join(", ");
  }
  if (typeof valor === "object") return nombreDeObjeto(valor as Record<string, unknown>);
  return String(valor);
};

const CAMPOS_NOMBRE = ["nombre", "titulo", "descripcion", "codigo", "etiqueta", "label"];

// Último recurso para objetos anidados (sector, producto, etc.) que llegan sin
// valorExportacion: se usa el primer campo de nombre conocido.
const nombreDeObjeto = (objeto: Record<string, unknown>): string => {
  const { nombre, apellido } = objeto;
  if (typeof nombre === "string" && typeof apellido === "string") {
    return `${nombre} ${apellido}`.trim();
  }
  for (const campo of CAMPOS_NOMBRE) {
    const valor = objeto[campo];
    if (typeof valor === "string" || typeof valor === "number") return String(valor);
  }
  return "";
};

/** Arma la tabla de texto (encabezados + filas) a partir de las columnas. */
export const construirTabla = <T>(
  columnas: ColumnaExportable<T>[],
  datos: T[],
): TablaExportable => ({
  encabezados: columnas.map((columna) => columna.etiqueta),
  filas: datos.map((item) =>
    columnas.map((columna) => formatoValor(columna.valor(item) as ValorCelda)),
  ),
});
