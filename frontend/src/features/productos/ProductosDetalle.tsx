import { Badge } from "@chakra-ui/react";
import { FiPackage, FiEye } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Producto } from "./types";

interface DetalleProps {
  producto: Producto;
  onCerrar: () => void;
}

export const ProductoDetalle = ({ producto, onCerrar }: DetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Producto",
      icono: FiPackage,
      items: [
        { label: "Nombre", valor: producto.nombre },
        {
          label: "Unidad de medida",
          valor: `${producto.unidad_medida.nombre} (${producto.unidad_medida.simbolo})`,
        },
        { label: "Descripción", valor: producto.descripcion },
        {
          label: "Vida útil",
          valor: producto.dias_vida_util != null ? `${producto.dias_vida_util} días` : "No especificada",
        },
        {
          label: "Envasado en ausencia del cliente",
          valor: (
            <Badge colorPalette={producto.envasado_ausencia_cliente ? "green" : "gray"}>
              {producto.envasado_ausencia_cliente ? "Sí" : "No"}
            </Badge>
          ),
        },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={producto.activo ? "green" : "red"}>
              {producto.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Producto'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};