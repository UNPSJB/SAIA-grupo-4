import { VStack } from "@chakra-ui/react";
import type { ElementType, ReactNode } from "react";
import { FormModal } from "../layout/FormModal";
import { DetalleItem } from "../ui/DetalleItem";
import { DetalleSection } from "../ui/DetalleSection";

export type SeccionDetalle = {
  titulo: string;
  icono?: ElementType;
  items: Array<{ label: string; valor: ReactNode }>;
};

interface DetalleModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  secciones: SeccionDetalle[];
  icon?: ElementType;
}

export const DetalleModal = ({
  open,
  title,
  onClose,
  secciones,
  icon,
}: DetalleModalProps) => (
  <FormModal open={open} title={title} titleIcon={icon} onClose={onClose}>
    <VStack gap={4} align='stretch'>
      {secciones.map((seccion) => (
        <DetalleSection
          key={seccion.titulo}
          title={seccion.titulo}
          icon={seccion.icono}
        >
          {seccion.items.map((item) => (
            <DetalleItem key={item.label} label={item.label}>
              {item.valor}
            </DetalleItem>
          ))}
        </DetalleSection>
      ))}
    </VStack>
  </FormModal>
);
