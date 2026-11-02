import { VStack } from "@chakra-ui/react";
import type { ElementType, ReactNode } from "react";
import { FormModal } from "../layout/FormModal";
import { DetalleItem } from "../ui/form/data-display/DetalleItem";
import { DetalleSection } from "../ui/form/data-display/DetalleSection";

export type SeccionDetalle = {
  titulo: string;
  icono?: ElementType;
  /** Fuerza la cantidad de columnas de la sección en escritorio. */
  columnas?: 1 | 2;
  items: Array<{
    label: string;
    valor: ReactNode;
    /** El ítem ocupa todo el ancho de la sección. */
    fullWidth?: boolean;
  }>;
};

interface DetalleModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  secciones: SeccionDetalle[];
  icon?: ElementType;
  maxW?: string;
}

export const DetalleModal = ({
  open,
  title,
  onClose,
  secciones,
  icon,
  maxW = "4xl",
}: DetalleModalProps) => (
  <FormModal
    open={open}
    title={title}
    titleIcon={icon}
    showClose
    onClose={onClose}
    maxW={maxW}
  >
    <VStack gap={4} align='stretch' w="full" minW="0">
      {secciones.map((seccion) => (
        <DetalleSection
          key={seccion.titulo}
          title={seccion.titulo}
          icon={seccion.icono}
          columns={seccion.columnas ?? (seccion.items.length > 1 ? 2 : 1)}
        >
          {seccion.items.map((item, index) => (
            <DetalleItem
              key={`${item.label}-${index}`}
              label={item.label}
              fullWidth={item.fullWidth}
            >
              {item.valor}
            </DetalleItem>
          ))}
        </DetalleSection>
      ))}
    </VStack>
  </FormModal>
);
