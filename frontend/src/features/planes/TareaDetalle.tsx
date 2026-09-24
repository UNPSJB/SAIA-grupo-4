import { Badge } from "@chakra-ui/react";
import { FiCalendar, FiEye, FiList, FiTag, FiTool } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { TareaLimpieza } from "./types";
import {
  formatFrecuencia,
  formatMomento,
  getDestinoDetalle,
  getDestinoLabel,
} from "./utils";
import { DIAS_SEMANA } from "./constants";

interface TareaDetalleProps {
  tarea: TareaLimpieza;
  onCerrar: () => void;
}

export const TareaDetalle = ({ tarea, onCerrar }: TareaDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Identificación y Destino",
      icono: FiTag,
      items: [
        { label: "Nombre", valor: tarea.nombre },
        { label: "Destino", valor: getDestinoLabel(tarea) },
        { label: "Detalle del destino", valor: getDestinoDetalle(tarea) },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={tarea.activo ? "green" : "red"}>
              {tarea.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
    {
      titulo: "Momento Operativo y Frecuencia",
      icono: FiCalendar,
      items: [
        { label: "Momento", valor: formatMomento(tarea.momento) },
        { label: "Frecuencia", valor: formatFrecuencia(tarea) },
        ...(tarea.periodicidad === "semanal" ||
        tarea.periodicidad === "dias-especificos"
          ? [
              {
                label: "Día(s)",
                valor:
                  tarea.dias
                    .map((d) => DIAS_SEMANA.find((x) => x.value === d)?.label ?? d)
                    .join(", ") || "—",
              },
            ]
          : []),
        ...(tarea.periodicidad === "mensual" && tarea.dia_mes
          ? [{ label: "Día del mes", valor: String(tarea.dia_mes) }]
          : []),
      ],
    },
    {
      titulo: "Guía y Procedimiento",
      icono: FiList,
      items:
        tarea.pasos.length > 0
          ? tarea.pasos.map((paso, i) => ({
              label: `Paso ${i + 1}`,
              valor: paso,
            }))
          : [{ label: "Sin pasos", valor: "—" }],
    },
    {
      titulo: "Recursos Requeridos",
      icono: FiTool,
      items: [
        {
          label: "Insumos químicos",
          valor: tarea.quimicos.join(", ") || "—",
        },
        {
          label: "Elementos de limpieza",
          valor: tarea.elementos.join(", ") || "—",
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Tarea POES'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};