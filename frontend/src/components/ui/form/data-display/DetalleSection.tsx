import { Box, Heading, Icon, SimpleGrid } from "@chakra-ui/react";
import type { ElementType, ReactNode } from "react";

interface DetalleSectionProps {
  title: string;
  icon?: ElementType;
  children: ReactNode;
  /** En escritorio los ítems se distribuyen en una o dos columnas. */
  columns?: 1 | 2;
}

export const DetalleSection = ({
  title,
  icon,
  children,
  columns = 2,
}: DetalleSectionProps) => (
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
    <SimpleGrid
      columns={{ base: 1, md: columns }}
      gap={3}
      alignItems='start'
    >
      {children}
    </SimpleGrid>
  </Box>
);