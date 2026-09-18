import type { ReactNode } from "react";
import { Table } from "@chakra-ui/react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  getRowKey: (item: T) => string | number;
}

export const DataTable = <T,>({
  items,
  columns,
  getRowKey,
}: DataTableProps<T>) => (
  <Table.Root variant="line" size="md">
    <Table.Header>
      <Table.Row>
        {columns.map((col) => (
          <Table.ColumnHeader key={col.key} textAlign={col.align}>
            {col.label}
          </Table.ColumnHeader>
        ))}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {items.map((item) => (
        <Table.Row key={getRowKey(item)}>
          {columns.map((col) => (
            <Table.Cell key={col.key} textAlign={col.align} textTransform="capitalize">
              {col.render(item)}
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </Table.Body>
  </Table.Root>
);