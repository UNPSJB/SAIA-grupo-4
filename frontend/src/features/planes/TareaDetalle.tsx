import { Badge } from "@chakra-ui/react";
import { FiCalendar, FiEye, FiList, FiTag, FiTool } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { PlanCatalogs, TareaPOES } from "./types";
import {
  colorFrecuencia,
  formatFrecuencia,
  formatMomento,
  getDestinoDetalle,
  getDestinoLabel,
  getElementosLabel,
  getInsumosLabel,
  labelsDias,
  parsearDetalleFrecuencia,
} from "./utils";

interface TareaDetalleProps {
  tarea: TareaPOES;
  catalogs: PlanCatalogs;
  onCerrar: () => void;
}

export const TareaDetalle = ({ tarea, catalogs, onCerrar }: TareaDetalleProps) => {
  const detalle = parsearDetalleFrecuencia(
    tarea.frecuencia,
    tarea.detalle_frecuencia,
  );

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Identificación y Destino",
      icono: FiTag,
      items: [
        { label: "Nombre", valor: tarea.nombre },
        { label: "Destino", valor: getDestinoLabel(tarea, catalogs) },
        {
          label: "Detalle del destino",
          valor: getDestinoDetalle(tarea, catalogs),
        },
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
        { label: "Momento", valor: formatMomento(tarea.tipo_poes) },
        {
          label: "Frecuencia",
          valor: (
            <Badge colorPalette={colorFrecuencia[tarea.frecuencia]}>
              {formatFrecuencia(tarea)}
            </Badge>
          ),
        },
        ...(tarea.frecuencia === "semanal" ||
        tarea.frecuencia === "dias_especificos"
          ? [
              {
                label: "Día(s)",
                valor: labelsDias(detalle.dias),
              },
            ]
          : []),
        ...(tarea.frecuencia === "mensual" && detalle.dia_mes
          ? [{ label: "Día del mes", valor: String(detalle.dia_mes) }]
          : []),
      ],
    },
    {
      titulo: "Guía y Procedimiento",
      icono: FiList,
      items:
        tarea.metodo.split("\n").filter(Boolean).length > 0
          ? tarea.metodo
              .split("\n")
              .filter(Boolean)
              .map((paso, i) => ({ label: `Paso ${i + 1}`, valor: paso }))
          : [{ label: "Sin pasos", valor: "—" }],
    },
    {
      titulo: "Recursos Requeridos",
      icono: FiTool,
      items: [
        {
          label: "Insumos químicos",
          valor: getInsumosLabel(tarea, catalogs),
        },
        {
          label: "Elementos de limpieza",
          valor: getElementosLabel(tarea, catalogs),
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