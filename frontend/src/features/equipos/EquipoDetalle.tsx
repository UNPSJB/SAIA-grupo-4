import { Badge } from "@chakra-ui/react";
import { FiEye, FiThermometer } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Equipo } from "./types";

interface EquipoDetalleProps {
  equipo: Equipo;
  onCerrar: () => void;
}

export const EquipoDetalle = ({ equipo, onCerrar }: EquipoDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Equipo",
      icono: FiThermometer,
      items: [
        { label: "Nombre", valor: equipo.nombre },
        { label: "Marca", valor: equipo.marca },
        { label: "Número de serie", valor: equipo.numero_serie },
        { label: "Categoría", valor: equipo.categoria },
        { label: "Sector", valor: equipo.sector.nombre },
        { label: "Ubicación", valor: equipo.ubicacion || "—" },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={equipo.activo ? "green" : "red"}>
              {equipo.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Equipo'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};