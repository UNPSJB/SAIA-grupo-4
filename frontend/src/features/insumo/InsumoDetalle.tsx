import { Badge } from "@chakra-ui/react";
import { FiBox, FiEye } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Insumo } from "./types";

interface InsumoDetalleProps {
  insumo: Insumo;
  onCerrar: () => void;
}

export const InsumoDetalle = ({ insumo, onCerrar }: InsumoDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Insumo",
      icono: FiBox,
      items: [
        { label: "Nombre", valor: insumo.nombre },
        {
          label: "Unidad de medida",
          valor: `${insumo.unidad_medida.nombre} (${insumo.unidad_medida.simbolo})`,
        },
        { label: "Categoría", valor: insumo.categoria },
        { label: "Descripción", valor: insumo.descripcion || "—" },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={insumo.disponible ? "green" : "red"}>
              {insumo.disponible ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Insumo'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
