import { Badge } from "@chakra-ui/react";
import { FiDroplet, FiEye } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { InsumoQuimico } from "./types";

interface InsumoQuimicoDetalleProps {
  insumoQuimico: InsumoQuimico;
  onCancelar: () => void;
}

const formatearConsumo = (consumo: number) =>
  Number(consumo).toLocaleString("es-AR", {
    maximumFractionDigits: 3,
  });

export const InsumoQuimicoDetalle = ({
  insumoQuimico,
  onCancelar,
}: InsumoQuimicoDetalleProps) => {
  const asociadoA = insumoQuimico.equipo
    ? `Equipo: ${insumoQuimico.equipo.nombre}`
    : insumoQuimico.sector
      ? `Sector: ${insumoQuimico.sector.nombre}`
      : "Sin asignar";

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Insumo Químico",
      icono: FiDroplet,
      items: [
        { label: "Nombre", valor: insumoQuimico.nombre },
        { label: "Tipo", valor: insumoQuimico.tipo },
        {
          label: "Consumo",
          valor: `${formatearConsumo(insumoQuimico.consumo)} ${insumoQuimico.unidad_medida.simbolo}`,
        },
        { label: "Asociado a", valor: asociadoA },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={insumoQuimico.activo ? "green" : "red"}>
              {insumoQuimico.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Insumo Químico'
      icon={FiEye}
      onClose={onCancelar}
      secciones={secciones}
    />
  );
};
