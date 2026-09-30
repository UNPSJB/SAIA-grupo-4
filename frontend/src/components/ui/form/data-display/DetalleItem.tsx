import { HStack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface DetalleItemProps {
  label: string;
  children: ReactNode;
}

export const DetalleItem = ({ label, children }: DetalleItemProps) => (
  <HStack align='baseline' gap={2} w="full">
    {/* Solo renderiza la viñeta y los dos puntos si el label tiene texto */}
    {label && (
      <>
        <Text as='span' color='fg.muted'>•</Text>
        <Text as='span' fontWeight='semibold'>{label}:</Text>
      </>
    )}
    
    {/* flex="1" ayuda a que componentes grandes como tu TareaDesplegable ocupen todo el ancho */}
    <Text as='span' flex="1">{children}</Text>
  </HStack>
);