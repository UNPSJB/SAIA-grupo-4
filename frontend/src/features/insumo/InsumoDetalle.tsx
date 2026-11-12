import { Badge } from "@chakra-ui/react";
import { FiBox, FiEye } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Insumo } from "./types";

interface InsumoDetalleProps {
  insumo: Insumo;
  onCerrar: () => void;
}

export const InsumoDetalle = ({ insumo, onCerrar }: InsumoDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Insumo",
      icono: FiBox,
      items: [
        { label: "Nombre", valor: insumo.nombre },
        {
          label: "Unidad de medida",
          valor: `${insumo.unidad_medida.nombre} (${insumo.unidad_medida.simbolo})`,
        },
        {
          label: "Consumo acumulado",
          valor: `${Number(insumo.consumo ?? 0).toLocaleString("es-AR", {
            maximumFractionDigits: 3,
          })} ${insumo.unidad_medida.simbolo}`,
        },
        { label: "Categoría", valor: insumo.categoria },
        { label: "Descripción", valor: insumo.descripcion || "—" },
        ...(insumo.densidad_g_ml != null
          ? [{ label: "Densidad", valor: `${insumo.densidad_g_ml} g/ml` }]
          : []),
        ...(insumo.peso_unitario_g != null
          ? [{ label: "Peso unitario promedio", valor: `${insumo.peso_unitario_g} g` }]
          : []),
        ...(insumo.denominacion_rotulo
          ? [{ label: "Denominación rótulo (CAA)", valor: insumo.denominacion_rotulo }]
          : []),
        ...(insumo.clase_funcional
          ? [{ label: "Clase funcional", valor: insumo.clase_funcional }]
          : []),
        ...(insumo.numero_ins
          ? [{ label: "Número INS", valor: insumo.numero_ins }]
          : []),
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={insumo.disponible ? "green" : "red"}>
              {insumo.disponible ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Insumo'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
