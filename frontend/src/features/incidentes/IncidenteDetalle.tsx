import { useState } from "react";
import { Badge, Box, Button } from "@chakra-ui/react";
import { FiEye, FiClock } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Incidente } from "./types";
import { HistorialIncidente } from "./HistorialIncidente";

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
};

export const IncidenteDetalle = ({
  incidente,
  onCancelar,
}: IncidenteDetalleProps) => {
  const [verHistorial, setVerHistorial] = useState(false);

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
              {incidente.abierto ? "Abierto" : "Cerrado"}
            </Badge>
          ),
        },
        ...(!incidente.abierto
          ? [
              { label: "Acción correctiva", valor: incidente.accion_correctiva ?? "-" },
              {
                label: "Fecha de cierre",
                valor: incidente.fecha_cierre ? formatearFecha(incidente.fecha_cierre) : "-",
              },
              {
                label: "Responsable del cierre",
                valor: incidente.responsable_cierre
                  ? `${incidente.responsable_cierre.nombre} ${incidente.responsable_cierre.apellido}`
                  : "-",
              },
            ]
          : []),
      ],
    },
    {
      titulo: "Historial",
      icono: FiClock,
      items: [
        {
          label: "",
          valor: (
            <Box>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVerHistorial((v) => !v)}
              >
                {verHistorial ? "Ocultar historial" : "Ver historial"}
              </Button>
              {verHistorial && (
                <Box mt={3}>
                  <HistorialIncidente incidenteId={incidente.id} />
                </Box>
              )}
            </Box>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title="Detalle del Incidente"
      icon={FiEye}
      onClose={onCancelar}
      secciones={secciones}
    />
  );
};