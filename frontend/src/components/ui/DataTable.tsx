import type { ReactNode } from "react";
import { Box, Table } from "@chakra-ui/react";

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
}

interface DataTableProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  getRowKey: (item: T) => string | number;
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

export const DataTable = <T,>({
  items,
  columns,
  getRowKey,
  minW,
}: DataTableProps<T>) => (
  // El wrapper es el que scrollea, así que el desborde de una tabla ancha
  // queda contenido acá en vez de empujar al ListadoContainer y abrir un
  // scrollbar horizontal de página.
  <Box overflowX="auto" width="100%" minW={0}>
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
);
