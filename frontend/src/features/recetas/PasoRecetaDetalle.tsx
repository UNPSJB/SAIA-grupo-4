import { Text } from "@chakra-ui/react";
import { FiEye, FiFileText, FiTag, FiTool } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { PasoReceta } from "./types";

interface PasoRecetaDetalleProps {
  paso: PasoReceta;
  onCerrar: () => void;
}

export const PasoRecetaDetalle = ({
  paso,
  onCerrar,
}: PasoRecetaDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Identificación del Paso",
      icono: FiTag,
      items: [
        {
          label: "Número de orden",
          valor: String(paso.numero_orden),
        },
        { label: "Título del paso", valor: paso.titulo },
      ],
    },
    {
      titulo: "Instrucciones y Procedimiento",
      icono: FiFileText,
      items: [
        {
          label: "",
          valor: (
            <Text
              fontSize="sm"
              color="gray.700"
              whiteSpace="pre-wrap"
              wordBreak="break-word"
              overflowWrap="anywhere"
              w="full"
            >
              {paso.instrucciones}
            </Text>
          ),
        },
      ],
    },
    {
      titulo: "Recursos Requeridos",
      icono: FiTool,
      items: [
        {
          label: "Insumos teóricos",
          valor: (
            <Text as="span" wordBreak="break-word" overflowWrap="anywhere">
              {paso.insumos && paso.insumos.length > 0
                ? paso.insumos
                    .map(
                      (i) =>
                        `${i.insumo?.nombre ?? `Insumo #${i.insumo_id}`} (${i.cantidad_consumo_estimada}${
                          i.insumo?.unidad_medida ? ` ${i.insumo.unidad_medida}` : ""
                        })`,
                    )
                    .join(", ")
                : "Sin insumos teóricos"}
            </Text>
          ),
        },
        {
          label: "Equipos utilizados",
          valor: (
            <Text as="span" wordBreak="break-word" overflowWrap="anywhere">
              {paso.equipos && paso.equipos.length > 0
                ? paso.equipos
                    .map(
                      (e) =>
                        `${e.equipo?.nombre ?? `Equipo #${e.equipo_id}`} (x${e.cantidad})`,
                    )
                    .join(", ")
                : "Sin equipos asociados"}
            </Text>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title="Detalle del Paso"
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};

export default PasoRecetaDetalle;
