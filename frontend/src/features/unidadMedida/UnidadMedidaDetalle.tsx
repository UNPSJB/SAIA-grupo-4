import { Badge } from "@chakra-ui/react";
import { FiEye } from "react-icons/fi";
import { FaRuler } from "react-icons/fa";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { UnidadMedida } from "./types";

interface UnidadMedidaDetalleProps {
  unidad: UnidadMedida;
  onCerrar: () => void;
}

export const UnidadMedidaDetalle = ({
  unidad,
  onCerrar,
}: UnidadMedidaDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos de la Unidad de Medida",
      icono: FaRuler,
      items: [
        { label: "Nombre", valor: unidad.nombre },
        { label: "Símbolo", valor: unidad.simbolo },
        { label: "Tipo de magnitud", valor: unidad.tipo_magnitud },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={unidad.disponible ? "green" : "red"}>
              {unidad.disponible ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Unidad de Medida'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};