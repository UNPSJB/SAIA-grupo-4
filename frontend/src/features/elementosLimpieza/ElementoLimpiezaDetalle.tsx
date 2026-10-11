import { Badge } from "@chakra-ui/react";
import { FiEye, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { MdOutlineCleaningServices } from "react-icons/md";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { ElementoLimpieza } from "./types";

interface ElementoLimpiezaDetalleProps {
  elemento: ElementoLimpieza;
  onCerrar: () => void;
}

const formatearFecha = (fechaStr?: string | null) => {
  if (!fechaStr) return "—";
  const fecha = new Date(fechaStr);
  if (Number.isNaN(fecha.getTime())) return fechaStr;
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Próximo recambio = último recambio + frecuencia en días. Sin uno de los dos
// datos no hay fecha que calcular.
const calcularProximoRecambio = (elemento: ElementoLimpieza) => {
  if (!elemento.fecha_ultimo_recambio || !elemento.frecuencia_recambio_dias) {
    return "—";
  }
  const fecha = new Date(elemento.fecha_ultimo_recambio);
  if (Number.isNaN(fecha.getTime())) return "—";
  fecha.setDate(fecha.getDate() + elemento.frecuencia_recambio_dias);
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const ElementoLimpiezaDetalle = ({
  elemento,
  onCerrar,
}: ElementoLimpiezaDetalleProps) => {
  const asignadoA = elemento.sector ? (
    <Badge colorPalette='blue' variant='subtle'>
      Sector: {elemento.sector.nombre}
    </Badge>
  ) : elemento.equipo ? (
    <Badge colorPalette='purple' variant='subtle'>
      Equipo: {elemento.equipo.nombre}
    </Badge>
  ) : (
    "Sin asignar"
  );

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Elemento",
      icono: MdOutlineCleaningServices,
      items: [
        { label: "Código", valor: elemento.codigo },
        { label: "Nombre", valor: elemento.nombre },
        { label: "Tipo", valor: elemento.tipo?.nombre ?? "—" },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={elemento.activo ? "green" : "red"}>
              {elemento.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
    {
      titulo: "Ubicación",
      icono: FiMapPin,
      items: [{ label: "Asignado a", valor: asignadoA }],
    },
    {
      titulo: "Recambio",
      icono: FiRefreshCw,
      items: [
        {
          label: "Frecuencia",
          valor: elemento.frecuencia_recambio_dias
            ? `${elemento.frecuencia_recambio_dias} días`
            : "—",
        },
        {
          label: "Último recambio",
          valor: formatearFecha(elemento.fecha_ultimo_recambio),
        },
        {
          label: "Próximo recambio",
          valor: calcularProximoRecambio(elemento),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Elemento de Limpieza'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
