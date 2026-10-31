import { Badge, Text } from "@chakra-ui/react";
import { FiBox, FiEye, FiLayers } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import { useInsumos } from "../insumo/hooks/useInsumos";
import type { Lote } from "./types";

interface LoteDetalleProps {
  lote: Lote;
  onCerrar: () => void;
}

export const LoteDetalle = ({ lote, onCerrar }: LoteDetalleProps) => {
  const { insumos } = useInsumos();

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Información del Lote",
      icono: FiBox,
      items: [
        { label: "ID Lote", valor: <Badge colorPalette="green">#{lote.id}</Badge> },
        { label: "Producto", valor: lote.producto?.nombre ?? `ID: ${lote.producto_id}` },
        { label: "Fecha de Producción", valor: lote.fecha ?? "—" },
        { label: "Cantidad Producida", valor: <strong>{lote.cantidad}</strong> },
      ],
    },
    {
      titulo: "Insumos Utilizados",
      icono: FiLayers,
      items:
        Array.isArray(lote.insumos_asociados) && lote.insumos_asociados.length > 0
          ? lote.insumos_asociados.map((item) => {
              const insumoEncontrado = insumos.find((i) => i.id === item.insumo_id);
              const nombreInsumo =
                item.insumo?.nombre ?? insumoEncontrado?.nombre ?? `Insumo #${item.insumo_id}`;
              const unidad =
                item.insumo?.unidad_medida?.simbolo ??
                insumoEncontrado?.unidad_medida?.simbolo ??
                "u.";

              return {
                label: nombreInsumo,
                valor: (
                  <Text as="span" fontWeight="medium">
                    {item.cantidad} {unidad}
                  </Text>
                ),
              };
            })
          : [{ label: "Insumos", valor: <Text color="gray.500">Sin insumos asociados</Text> }],
    },
  ];

  return (
    <DetalleModal
      open
      title={`Detalle de Lote #${lote.id}`}
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};