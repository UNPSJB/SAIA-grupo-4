import type { ReactNode } from "react";
import { Box, Table } from "@chakra-ui/react";
import { ExportarMenu } from "../../ExportarMenu";
import {
  exportarListado,
  type ColumnaExportable,
  type FiltroAplicado,
  type FormatoExportacion,
  type ValorCelda,
} from "../../../../utils/exportacion";

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
  /** Ancho de la columna, ej. "120px" o "20%". */
  w?: string;
  /** Tope de ancho. Sin `truncate` el contenido puede desbordar la celda. */
  maxW?: string;
  /** Recorta con "…" y deja el texto completo en el `title`. */
  truncate?: boolean;
  render: (item: T) => ReactNode;
  /** `false` deja la columna fuera de la exportación (ej. "Acciones"). Por defecto `true`. */
  exportable?: boolean;
  /**
   * Valor plano para CSV/PDF. Obligatorio en columnas cuyo `render` devuelve
   * JSX (badges, semáforos, varias líneas): sin esto la celda sale vacía.
   * Fechas ISO, booleanos y nulos se normalizan solos (ver formatoValor).
   */
  valorExportacion?: (item: T) => ValorCelda;
}

interface DataTableProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  getRowKey: (item: T) => string | number;
  /**
   * Array filtrado COMPLETO (no la página visible). Si se pasa, aparece el
   * menú Exportar arriba de la tabla.
   */
  exportarItems?: T[];
  exportarTitulo?: string;
  /** Filtros aplicados, para el encabezado del PDF. */
  exportarFiltros?: FiltroAplicado[];
  /** Base del nombre de archivo; por defecto, el título. */
  exportarNombreArchivo?: string;
  hideTableOnMobile?: boolean;
  /**
   * Ancho mínimo de la tabla. Va en la tabla, NO en el wrapper: si el `minW`
   * estuviera en el wrapper empujaría al contenedor en vez de scrollear
   * adentro. Sólo se declara en las tablas cuyas columnas no entran en
   * pantalla; las angostas lo dejan sin definir.
   */
  minW?: string;
}

// Para el atributo `title` de las celdas truncadas: si el render devuelve
// texto plano se usa ese texto; si devuelve un elemento (Badge, botón, etc.)
// no hay nada razonable que mostrar y se deja sin title.
const textOf = (nodo: ReactNode): string | undefined =>
  typeof nodo === "string" || typeof nodo === "number"
    ? String(nodo)
    : undefined;

const columnasAvisadas = new Set<string>();

/**
 * Pasa las ColumnDef a columnas exportables. Si una columna no declara
 * `valorExportacion` se usa el render cuando es texto plano; si el render es
 * JSX la celda queda vacía y, en desarrollo, se avisa por consola.
 */
const aColumnasExportables = <T,>(
  columns: ColumnDef<T>[],
  titulo: string,
): ColumnaExportable<T>[] =>
  columns
    .filter((columna) => columna.exportable !== false)
    .map((columna) => ({
      etiqueta: columna.label,
      valor: (item: T): ValorCelda => {
        if (columna.valorExportacion) return columna.valorExportacion(item);
        const contenido = columna.render(item);
        if (contenido === null || contenido === undefined || typeof contenido === "boolean") {
          return "";
        }
        if (typeof contenido === "string" || typeof contenido === "number") return contenido;
        const clave = `${titulo}:${columna.key}`;
        if (import.meta.env.DEV && !columnasAvisadas.has(clave)) {
          columnasAvisadas.add(clave);
          console.warn(
            `[exportación] La columna "${columna.label}" de "${titulo}" renderiza JSX y no declara valorExportacion: se exporta vacía.`,
          );
        }
        return "";
      },
    }));

export const DataTable = <T,>({
  items,
  columns,
  getRowKey,
  exportarItems,
  exportarTitulo = "Listado",
  exportarFiltros = [],
  exportarNombreArchivo,
  hideTableOnMobile = false,
  minW,
}: DataTableProps<T>) => {
  const exportar = (formato: FormatoExportacion) =>
    exportarListado({
      formato,
      titulo: exportarTitulo,
      columnas: aColumnasExportables(columns, exportarTitulo),
      datos: exportarItems ?? [],
      filtros: exportarFiltros,
      nombreBase: exportarNombreArchivo,
    });

  return (
    <>
      {exportarItems && (
        <Box mb={3}>
          <ExportarMenu
            onExportar={exportar}
            cantidad={exportarItems.length}
            etiqueta={`Exportar ${exportarTitulo.toLocaleLowerCase("es")}`}
          />
        </Box>
      )}
      <Box
        overflowX="auto"
        width="100%"
        minW={0}
        display={hideTableOnMobile ? { base: "none", md: "block" } : undefined}
      >
        <Table.Root variant="line" size="md" width="100%" minW={minW}>
          <Table.Header>
            <Table.Row>
              {columns.map((col) => (
                <Table.ColumnHeader
                  key={col.key}
                  textAlign={col.align}
                  w={col.w}
                  maxW={col.maxW}
                  whiteSpace={col.truncate ? "nowrap" : undefined}
                >
                  {col.label}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={getRowKey(item)}>
                {columns.map((col) => {
                  const contenido = col.render(item);
                  return (
                    <Table.Cell
                      key={col.key}
                      textAlign={col.align}
                      textTransform="capitalize"
                      w={col.w}
                      maxW={col.maxW}
                      whiteSpace={col.truncate ? "nowrap" : undefined}
                      overflow={col.truncate ? "hidden" : undefined}
                      textOverflow={col.truncate ? "ellipsis" : undefined}
                      title={col.truncate ? textOf(contenido) : undefined}
                    >
                      {contenido}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </>
  );
};
