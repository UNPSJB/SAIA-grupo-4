import {
  Badge,
  Box,
  Flex,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiBox, FiClock, FiEye, FiLayers, FiUser } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Lote } from "./types";

interface LoteDetalleProps {
  lote: Lote;
  onCerrar: () => void;
}

const formatearFechaSoloDia = (fechaIso: string) => {
  if (!fechaIso) return "—";
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  if (anio && mes && dia) return `${dia}/${mes}/${anio}`;
  return fechaIso;
};

export const LoteDetalle = ({ lote, onCerrar }: LoteDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Información General del Lote",
      icono: FiBox,
      items: [
        {
          label: "Código de Lote",
          valor: (
            <Badge colorPalette="green" fontSize="sm">
              {lote.codigo_lote}
            </Badge>
          ),
        },
        {
          label: "Producto",
          valor: (
            <Badge colorPalette="purple" variant="subtle">
              {lote.producto_nombre || `Producto #${lote.producto_id}`}
            </Badge>
          ),
        },
        {
          label: "Cantidad Producida",
          valor: `${lote.cantidad_producida} ${lote.unidad_medida_simbolo || ""}`.trim(),
        },
        {
          label: "Receta",
          valor: `${lote.receta_codigo} - ${lote.receta_nombre}`,
        },
      ],
    },
    {
      titulo: "Auditoría y Trazabilidad",
      icono: FiClock,
      items: [
        {
          label: "Operador Responsable",
          valor: (
            <HStack gap={1.5}>
              <FiUser size={14} color="#4A5568" />
              <Text as="span">{lote.operador_nombre || `Operador #${lote.operador_id}`}</Text>
            </HStack>
          ),
        },
        {
          label: "Fecha Elaboración",
          valor: new Date(lote.fecha_elaboracion).toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        {
          label: "Fecha Vencimiento",
          valor: formatearFechaSoloDia(lote.fecha_vencimiento),
        },
      ],
    },
    {
      titulo: "Consumo de Insumos (Teórico vs. Real)",
      icono: FiLayers,
      items: [
        {
          label: "",
          valor:
            lote.consumos_insumos && lote.consumos_insumos.length > 0 ? (
              <VStack align="stretch" gap={2} w="100%">
                {lote.consumos_insumos.map((c) => {
                  const desvio =
                    Math.round(
                      (c.cantidad_real_utilizada - c.cantidad_teorica) * 100,
                    ) / 100;
                  return (
                    <Box
                      key={c.id}
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                      w="100%"
                    >
                      <Flex justify="space-between" align="center" mb={1.5} wrap="wrap" gap={1}>
                        <HStack gap={2}>
                          <Text fontWeight="bold" fontSize="sm" color="gray.800">
                            {c.insumo_nombre}
                          </Text>
                          <Badge size="xs" colorPalette="gray" variant="surface">
                            {c.unidad_medida_simbolo}
                          </Badge>
                        </HStack>
                        {desvio === 0 ? (
                          <Badge colorPalette="gray" variant="subtle" size="sm">
                            Sin desvío
                          </Badge>
                        ) : (
                          <Badge
                            colorPalette={desvio > 0 ? "orange" : "blue"}
                            size="sm"
                          >
                            {desvio > 0 ? `+${desvio}` : desvio} {c.unidad_medida_simbolo}
                          </Badge>
                        )}
                      </Flex>
                      <HStack justify="space-between" fontSize="xs" color="gray.600" wrap="wrap" gap={2}>
                        <Text>
                          Teórico estimado:{" "}
                          <Text as="span" fontWeight="semibold" color="gray.700">
                            {c.cantidad_teorica} {c.unidad_medida_simbolo}
                          </Text>
                        </Text>
                        <Text>
                          Consumo real:{" "}
                          <Text as="span" fontWeight="bold" color="green.700">
                            {c.cantidad_real_utilizada} {c.unidad_medida_simbolo}
                          </Text>
                        </Text>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Text color="gray.500" fontSize="xs">
                Sin consumos de insumos registrados
              </Text>
            ),
        },
      ],
    },
  ];

  if (lote.observaciones) {
    secciones.push({
      titulo: "Observaciones",
      icono: FiEye,
      items: [{ label: "Notas", valor: lote.observaciones }],
    });
  }

  return (
    <DetalleModal
      open
      title={`Detalle de Lote: ${lote.codigo_lote}`}
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
