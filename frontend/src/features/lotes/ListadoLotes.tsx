import { Badge, Box, Button, Card, HStack, Text, VStack } from "@chakra-ui/react";
import { FiEye } from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  type ColumnDef,
} from "../../components/ui";
import type { FiltroAplicado } from "../../utils/exportacion";
import type { Lote } from "./types";

interface ListadoLotesProps {
  lotes: Lote[];
  exportLotes?: Lote[];
  /** Filtros aplicados en la página, para el encabezado del PDF. */
  exportFiltros?: FiltroAplicado[];
  loading?: boolean;
  onVer: (lote: Lote) => void;
  mostrarOperador?: boolean;
  hayFiltrosActivos?: boolean;
}

const formatearFechaSoloDia = (fechaIso: string) => {
  if (!fechaIso) return "—";
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  if (anio && mes && dia) return `${dia}/${mes}/${anio}`;
  return fechaIso;
};

export const ListadoLotes = ({
  lotes,
  exportLotes = lotes,
  exportFiltros = [],
  loading = false,
  onVer,
  mostrarOperador = true,
  hayFiltrosActivos = false,
}: ListadoLotesProps) => {
  if (loading) {
    return <LoadingState message="Cargando listado de lotes..." />;
  }

  if (lotes.length === 0) {
    return (
      <AlertMessage
        type="info"
        message={
          hayFiltrosActivos
            ? "No se encontraron lotes que coincidan con los filtros aplicados."
            : "Todavía no hay lotes de producción registrados."
        }
      />
    );
  }

  const columnas: ColumnDef<Lote>[] = [
    {
      key: "codigo_lote",
      label: "Código Lote",
      valorExportacion: (l) => l.codigo_lote,
      render: (l) => (
        <Badge colorPalette="green" variant="subtle">
          {l.codigo_lote}
        </Badge>
      )
    },
    {
      key: "producto",
      label: "Producto",
      valorExportacion: (l) => l.producto_nombre || `Producto #${l.producto_id}`,
      render: (l) => (
        <Badge colorPalette="purple" variant="subtle">
          {l.producto_nombre || `Producto #${l.producto_id}`}
        </Badge>
      ),
    },
    {
      key: "receta",
      label: "Receta",
      render: (l) => l.receta_codigo,
    },
    {
      key: "cantidad",
      label: "Cantidad",
      render: (l) => `${l.cantidad_producida} ${l.unidad_medida_simbolo || ""}`.trim(),
    },
    {
      key: "fecha_elaboracion",
      label: "Elaboración",
      render: (l) =>
        new Date(l.fecha_elaboracion).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
    },
    {
      key: "fecha_vencimiento",
      label: "Vencimiento",
      render: (l) => formatearFechaSoloDia(l.fecha_vencimiento),
    },
  ];

  if (mostrarOperador) {
    columnas.push({
      key: "operador",
      label: "Operador",
      render: (l) => l.operador_nombre || `ID #${l.operador_id}`,
    });
  }

  columnas.push({
    key: "acciones",
    label: "Acciones",
    align: "end",
    exportable: false,
    render: (l) => (
      <RowActions>
        <RowActionButton
          icon={FiEye}
          label="Ver detalle"
          colorPalette="yellow"
          onClick={() => onVer(l)}
        />
      </RowActions>
    ),
  });

  return (
    <>
      {/* Vista de escritorio / tablet */}
      <Box>
        <DataTable
          items={lotes}
          exportItems={exportLotes}
          exportTitle="Lotes de producción"
          exportFilters={exportFiltros}
          hideTableOnMobile
          columns={columnas}
          getRowKey={(l) => l.id}
        />
      </Box>

      {/* Vista móvil: tarjetas apiladas idénticas a Recetas y Documentos */}
      <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={3}>
        {lotes.map((l) => (
          <Card.Root key={l.id} variant="outline">
            <Card.Body gap={2}>
              <HStack justify="space-between" align="flex-start" gap={2}>
                <Text fontWeight="bold" color="green.700" truncate>
                  {l.codigo_lote}
                </Text>
                <Badge colorPalette="purple" variant="subtle" flexShrink={0}>
                  {l.receta_codigo}
                </Badge>
              </HStack>

              <Text fontWeight="semibold" fontSize="md">
                {l.producto_nombre || `Producto #${l.producto_id}`}
              </Text>

              <Text fontSize="xs" color="gray.600">
                Cantidad: <strong>{l.cantidad_producida} {l.unidad_medida_simbolo || ""}</strong>
                {" · "}
                Elaboración: <strong>{new Date(l.fecha_elaboracion).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}</strong>
                {" · "}
                Vencimiento: <strong>{formatearFechaSoloDia(l.fecha_vencimiento)}</strong>
                {mostrarOperador && l.operador_nombre && (
                  <> · Operador: <strong>{l.operador_nombre}</strong></>
                )}
              </Text>

              <Button
                mt={1}
                colorPalette="yellow"
                variant="outline"
                w="100%"
                onClick={() => onVer(l)}
              >
                <FiEye /> Ver detalle
              </Button>
            </Card.Body>
          </Card.Root>
        ))}
      </VStack>
    </>
  );
};
