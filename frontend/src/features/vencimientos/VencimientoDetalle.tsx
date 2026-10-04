import { FiAlertCircle, FiInfo } from "react-icons/fi";
import { Badge } from "@chakra-ui/react";
import { DetalleModal } from "../../components/layout";
import type { SeccionDetalle } from "../../components/layout";
import {
  AlertMessage,
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  LoadingState,
  SemaforoFecha,
} from "../../components/ui";
import { useOrigenVencimiento } from "./hooks/useOrigenVencimiento";
import { etiquetaOrigen, tieneOrigen } from "./origenVencimientos";
import { COLOR_CATEGORIA } from "./utils";
import type { Vencimiento } from "./types";

type Props = {
  vencimiento: Vencimiento;
  onCerrar: () => void;
};

/**
 * Detalle de un vencimiento, en la misma vista del listado.
 *
 * No navega al módulo de origen: muestra la fila consolidada y, si la categoría
 * tiene ficha, también el registro de origen. Así el usuario no pierde el
 * contexto de la tabla ni el lugar de la lista desde el que miraba.
 *
 * El modal abre al instante con lo consolidado y la sección del origen se
 * completa sola cuando llega el request, en vez de esperar antes de abrir.
 */
export const VencimientoDetalle = ({ vencimiento, onCerrar }: Props) => {
  const { ficha, loading, error } = useOrigenVencimiento(vencimiento);

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Vencimiento",
      icono: FiAlertCircle,
      items: [
        {
          label: "Categoría",
          valor: (
            <Badge
              colorPalette={COLOR_CATEGORIA[vencimiento.categoria]}
              variant='subtle'
            >
              {vencimiento.entidad}
            </Badge>
          ),
        },
        { label: "Concepto", valor: vencimiento.concepto },
        { label: "Detalle", valor: vencimiento.detalle ?? "—" },
        {
          label: "Fecha",
          valor: (
            <SemaforoFecha
              estado={vencimiento.estado}
              fecha={vencimiento.fecha_vencimiento}
              diasRestantes={vencimiento.dias_restantes}
            />
          ),
        },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={COLOR_ESTADO[vencimiento.estado]}>
              {ETIQUETA_ESTADO[vencimiento.estado]}
            </Badge>
          ),
        },
      ],
    },
  ];

  // Ficha del módulo de origen: sección opcional, con su propio estado para no
  // bloquear el modal mientras llega.
  if (tieneOrigen(vencimiento.categoria)) {
    secciones.push({
      titulo: etiquetaOrigen(vencimiento.categoria),
      items: loading
        ? [
            {
              label: "Cargando",
              valor: <LoadingState message='Cargando el registro...' />,
            },
          ]
        : error
          ? [{ label: "Registro", valor: <AlertMessage type='error' message={error} /> }]
          : [
              { label: "Registro", valor: ficha?.titulo ?? "—" },
              ...(ficha?.campos ?? []),
            ],
    });
  }

  return (
    <DetalleModal
      open
      title={`Detalle de ${vencimiento.concepto}`}
      icon={FiInfo}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};