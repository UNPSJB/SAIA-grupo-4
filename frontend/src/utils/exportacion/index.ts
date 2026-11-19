import { generarCsv } from "./csv";
import { construirTabla } from "./formatoValor";
import { nombreArchivo } from "./nombreArchivo";
import type { FiltroAplicado, OpcionesExportacion } from "./tipos";

export type {
  ColumnaExportable,
  FiltroAplicado,
  FormatoExportacion,
  OpcionesExportacion,
  ValorCelda,
} from "./tipos";
export { formatoValor } from "./formatoValor";

const descargar = (contenido: Blob, nombre: string) => {
  const url = URL.createObjectURL(contenido);
  try {
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.style.display = "none";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } finally {
    // Se libera un instante después: algunos navegadores cancelan la descarga
    // si la URL se revoca en el mismo tick del click.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

/**
 * API única de exportación. Recibe el array YA filtrado (completo, no la
 * página visible) y descarga el archivo en el formato pedido.
 */
export const exportarListado = async <T>({
  formato,
  titulo,
  columnas,
  datos,
  filtros = [],
  nombreBase,
}: OpcionesExportacion<T>): Promise<void> => {
  if (columnas.length === 0) throw new Error("No hay columnas para exportar.");

  const fecha = new Date();
  const tabla = construirTabla(columnas, datos);
  const nombre = nombreArchivo(nombreBase ?? titulo, formato, fecha);

  if (formato === "csv") {
    descargar(generarCsv(tabla), nombre);
    return;
  }

  // pdf.ts se carga bajo demanda junto con jsPDF.
  const { generarPdf } = await import("./pdf");
  descargar(await generarPdf({ titulo, tabla, filtros, fecha }), nombre);
};

/**
 * Arma la lista de filtros para el PDF descartando los vacíos:
 * armarFiltros([["Búsqueda", busqueda], ["Estado", "Activos"], ["Sector", undefined]])
 */
export const armarFiltros = (
  pares: [etiqueta: string, valor: string | null | undefined | false][],
): FiltroAplicado[] =>
  pares
    .filter((par): par is [string, string] => typeof par[1] === "string" && par[1].trim() !== "")
    .map(([etiqueta, valor]) => ({ etiqueta, valor: valor.trim() }));

/** Busca la etiqueta visible de una opción de FiltroSelect a partir de su value. */
export const etiquetaOpcion = (
  opciones: { label: string; value: string }[],
  valor: string,
): string | undefined =>
  valor ? (opciones.find((opcion) => opcion.value === valor)?.label ?? valor) : undefined;
