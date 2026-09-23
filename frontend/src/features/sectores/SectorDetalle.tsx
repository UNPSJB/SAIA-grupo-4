import { Badge } from "@chakra-ui/react";
import { FiEye, FiMap } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Sector } from "./types";

interface SectorDetalleProps {
  sector: Sector;
  onCerrar: () => void;
}

export const SectorDetalle = ({ sector, onCerrar }: SectorDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Sector",
      icono: FiMap,
      items: [
        { label: "Nombre", valor: sector.nombre },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={sector.activo ? "green" : "red"}>
              {sector.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Sector'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};