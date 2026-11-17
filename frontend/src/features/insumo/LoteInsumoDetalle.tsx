import { Badge } from "@chakra-ui/react";
import { FiEye, FiPackage, FiSlash } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import { COLOR_ESTADO_LOTE, ETIQUETA_ESTADO_LOTE } from "./estadoLote";
import type { Insumo, LoteInsumo } from "./types";

interface LoteInsumoDetalleProps {
  lote: LoteInsumo;
  insumo: Insumo;
  onCerrar: () => void;
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" sin pasar por Date, para evitar desfases por zona horaria.
const formatearFechaSoloDia = (fechaIso: string) => {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
};

const formatearFechaHora = (fechaIso: string | null) =>
  fechaIso
    ? new Date(fechaIso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const LoteInsumoDetalle = ({
  lote,
  insumo,
  onCerrar,
}: LoteInsumoDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Lote",
      icono: FiPackage,
      items: [
        { label: "Insumo", valor: insumo.nombre },
        { label: "Código de lote", valor: lote.codigo_lote },
        {
          label: "Fecha de vencimiento",
          valor: formatearFechaSoloDia(lote.fecha_vencimiento),
        },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={COLOR_ESTADO_LOTE[lote.estado]}>
              {ETIQUETA_ESTADO_LOTE[lote.estado]}
            </Badge>
          ),
        },
      ],
    },
  ];

  // Solo los lotes inhabilitados tienen datos de auditoría para mostrar.
  if (!lote.activo) {
    const persona = lote.usuario_inhabilitacion;
    secciones.push({
      titulo: "Inhabilitación",
      icono: FiSlash,
      items: [
        { label: "Motivo", valor: lote.motivo_inhabilitacion || "—" },
        {
          label: "Inhabilitado por",
          valor: persona ? `${persona.nombre} ${persona.apellido}` : "—",
        },
        {
          label: "Fecha y hora",
          valor: formatearFechaHora(lote.fecha_inhabilitacion),
        },
      ],
    });
  }

  return (
    <DetalleModal
      open
      title='Detalle de Lote'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};