import { FiEye } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Incidente } from "./types";
import { Badge } from "@chakra-ui/react";

interface IncidenteDetalleProps {
  incidente: Incidente;
  onCancelar: () => void;
}

const formatearFecha = (fecha: string) => {
  const fechaObj = new Date(fecha);
  return fechaObj.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const IncidenteDetalle = ({ 
    incidente,
     onCancelar,
}: IncidenteDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Incidente",
      icono: FiEye,
      items: [
        { label: "Título", valor: incidente.titulo },
        { label: "Descripción", valor: incidente.descripcion },
        { label: "Fecha y Hora de Reporte", valor: formatearFecha(incidente.fecha_hora_reporte) },
        { label: "Reportante", valor: `${incidente.reportante.nombre} ${incidente.reportante.apellido}` },
        { 
          label: "Estado",
          valor: (
            <Badge colorPalette={incidente.abierto ? "green" : "red"}>
              {incidente.abierto ? "Abierto" : "Cerrado" }
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle del Incidente'
      icon={FiEye}
      onClose={onCancelar}
      secciones={secciones}
    />
  );
};