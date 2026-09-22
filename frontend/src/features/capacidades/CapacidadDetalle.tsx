import { Badge } from "@chakra-ui/react";
import { FiEye, FiAward } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Capacidad } from "./types";

interface CapacidadDetalleProps {
  capacidad: Capacidad;
  onCerrar: () => void;
}

export const CapacidadDetalle = ({ capacidad, onCerrar }: CapacidadDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos de la Capacidad",
      icono: FiAward,
      items: [
        { label: "Nombre", valor: capacidad.nombre },
        { label: "Descripción", valor: capacidad.descripcion || "—" },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={capacidad.activo ? "green" : "red"}>
              {capacidad.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Capacidad'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};