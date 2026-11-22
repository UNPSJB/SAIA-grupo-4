import { Badge, Box, Button, Card, HStack, Text, VStack } from "@chakra-ui/react";
import { FiEye } from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  TextoSinValor,
  type ColumnDef,
} from "../../components/ui";
import type { FiltroAplicado } from "../../utils/exportacion";
import type { Lote } from "./types";

interface ListadoLotesProps {
  lotes: Lote[];
  exportarLotes?: Lote[];
  /** Filtros aplicados en la página, para el encabezado del PDF. */
  exportarFiltros?: FiltroAplicado[];
  loading?: boolean;
  onVer: (lote: Lote) => void;
  mostrarOperador?: boolean;
  hayFiltrosActivos?: boolean;
  /** Código de lote de insumo buscado: si viene, se muestra la coincidencia bajo el producto. */
  codigoLoteInsumoFiltro?: string;
}

// Lotes cuyo producto no tiene vida útil cargada no tienen vencimiento.
const SIN_ESPECIFICAR = "Sin especificar";

const formatearFechaSoloDia = (fechaIso: string) => {
  if (!fechaIso) return "—";
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  if (anio && mes && dia) return `${dia}/${mes}/${anio}`;
  return fechaIso;
};

interface CoincidenciaLoteInsumo {
  codigo: string;
  insumoNombre: string;
}

/**
 * Busca en los consumos del lote de producción los lotes de insumo cuyo código
 * coincide con el buscado (exacto, sin distinguir mayúsculas, igual que el backend).
 */
const obtenerCoincidencias = (
  lote: Lote,
  codigoBuscado: string,
): CoincidenciaLoteInsumo[] => {
  const buscado = codigoBuscado.trim().toLowerCase();
  if (!buscado) return [];

  const vistos = new Set<number>();
  const coincidencias: CoincidenciaLoteInsumo[] = [];

  for (const consumo of lote.consumos_insumos ?? []) {
    for (const detalle of consumo.detalles_lotes ?? []) {
      if (detalle.codigo_lote_insumo.trim().toLowerCase() !== buscado) continue;
      if (vistos.has(detalle.lote_insumo_id)) continue;
      vistos.add(detalle.lote_insumo_id);
      coincidencias.push({
        codigo: detalle.codigo_lote_insumo,
        insumoNombre: consumo.insumo_nombre,
      });
    }
  }
  return coincidencias;
};

const IndicadorCoincidencia = ({
  coincidencias,
}: {
  coincidencias: CoincidenciaLoteInsumo[];
}) => {
  if (coincidencias.length === 0) return null;
  return (
    <VStack align="flex-start" gap={0.5} mt={0.5}>
      {coincidencias.map((c) => (
        <Text
          key={`${c.insumoNombre}-${c.codigo}`}
          fontSize="xs"
          color="blue.600"
          fontWeight="medium"
        >
          Coincidencia: Lote &ldquo;{c.codigo}&rdquo; ({c.insumoNombre})
        </Text>
      ))}
    </VStack>
  );
};

export const ListadoLotes = ({
  lotes,
  exportarLotes = lotes,
  exportarFiltros = [],
  loading = false,
  onVer,
  mostrarOperador = true,
  hayFiltrosActivos = false,
  codigoLoteInsumoFiltro = "",
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
        <Box>
          <Badge colorPalette="purple" variant="subtle">
            {l.producto_nombre || `Producto #${l.producto_id}`}
          </Badge>
          <IndicadorCoincidencia
            coincidencias={obtenerCoincidencias(l, codigoLoteInsumoFiltro)}
          />
        </Box>
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
      valorExportacion: (l) =>
        l.fecha_vencimiento ? formatearFechaSoloDia(l.fecha_vencimiento) : SIN_ESPECIFICAR,
      render: (l) =>
        l.fecha_vencimiento ? (
          formatearFechaSoloDia(l.fecha_vencimiento)
        ) : (
          <TextoSinValor>{SIN_ESPECIFICAR}</TextoSinValor>
        ),
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
          exportarItems={exportarLotes}
          exportarTitulo="Lotes de producción"
          exportarFiltros={exportarFiltros}
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

              <IndicadorCoincidencia
                coincidencias={obtenerCoincidencias(l, codigoLoteInsumoFiltro)}
              />

              <Text fontSize="xs" color="gray.600">
                Cantidad: <strong>{l.cantidad_producida} {l.unidad_medida_simbolo || ""}</strong>
                {" · "}
                Elaboración: <strong>{new Date(l.fecha_elaboracion).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}</strong>
                {" · "}
                Vencimiento:{" "}
                {l.fecha_vencimiento ? (
                  <strong>{formatearFechaSoloDia(l.fecha_vencimiento)}</strong>
                ) : (
                  <TextoSinValor>{SIN_ESPECIFICAR}</TextoSinValor>
                )}
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