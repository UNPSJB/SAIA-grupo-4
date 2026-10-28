import { Box, HStack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface DetalleItemProps {
  label: string;
  children: ReactNode;
}

export const DetalleItem = ({ label, children }: DetalleItemProps) => (
  <HStack align='baseline' gap={2} w="full" minW="0">
    {/* Solo renderiza la viñeta y los dos puntos si el label tiene texto */}
    {label && (
      <>
        <Text as='span' color='fg.muted' flexShrink={0}>•</Text>
        <Text as='span' fontWeight='semibold' flexShrink={0}>{label}:</Text>
      </>
    )}
    
    {/* Box con minW=0 permite que componentes y textos largos se ajusten al ancho del modal */}
    <Box flex="1" minW="0" overflowWrap="anywhere" wordBreak="break-word">
      {children}
    </Box>
  </HStack>
);