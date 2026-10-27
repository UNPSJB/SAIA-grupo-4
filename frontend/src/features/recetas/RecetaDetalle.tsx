import { Badge } from "@chakra-ui/react";
import { FiClock, FiEye, FiList } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import { ESTADOS_RECETA } from "./constants";
import type { Receta } from "./types";

interface RecetaDetalleProps {
  receta: Receta;
  onCerrar: () => void;
}

const formatearFecha = (fecha?: string) => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const RecetaDetalle = ({ receta, onCerrar }: RecetaDetalleProps) => {
  const estado = ESTADOS_RECETA[receta.estado];
  const pasos = receta.pasos ?? [];

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos de la Receta",
      icono: FiClock,
      items: [
        { label: "Código", valor: receta.codigo_receta },
        { label: "Nombre", valor: receta.nombre_receta },
        { label: "Producto ID", valor: receta.producto_id },
        {
          label: "Rendimiento estándar",
          valor: receta.rendimiento_estandar,
        },
        {
          label: "Tiempo estimado total",
          valor:
            receta.tiempo_estimado_total != null
              ? `${receta.tiempo_estimado_total} min`
              : "—",
        },
        {
          label: "Estado",
          valor: <Badge colorPalette={estado.color}>{estado.texto}</Badge>,
        },
        {
          label: "Fecha",
          valor: formatearFecha(receta.fecha_creacion),
        },
        {
          label: "Creado por",
          valor: receta.usuario_creador_nombre || "—",
        },
        {
          label: "Observaciones",
          valor: receta.observaciones || "—",
        },
      ],
    },
    {
      titulo: "Pasos",
      icono: FiList,
      items: [
        {
          label: "Pasos",
          valor:
            pasos.length > 0
              ? `${pasos.length} paso(s) registrado(s)`
              : "Sin pasos asociados",
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title="Detalle de Receta"
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
