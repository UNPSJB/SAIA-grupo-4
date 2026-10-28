import { Box, Heading, Icon, VStack } from "@chakra-ui/react";
import type { ElementType, ReactNode } from "react";

interface DetalleSectionProps {
  title: string;
  icon?: ElementType;
  children: ReactNode;
}

export const DetalleSection = ({ title, icon, children }: DetalleSectionProps) => (
  <Box
    width='100%'
    borderWidth='1px'
    borderColor='border.subtle'
    borderRadius='md'
    p={4}
    minW="0"
    overflow="hidden"
  >
    <Heading
      size='sm'
      textTransform='uppercase'
      color='green'
      display='flex'
      alignItems='center'
      gap={2}
      mb={3}
    >
      {icon && <Icon as={icon} />}
      {title}
    </Heading>
    <VStack align='stretch' w="full" gap={1.5} minW="0">
      {children}
    </VStack>
  </Box>
);