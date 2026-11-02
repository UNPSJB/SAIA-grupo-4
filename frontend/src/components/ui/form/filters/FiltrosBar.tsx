import { Box, Button, Flex, HStack } from "@chakra-ui/react";
import { FiFilter, FiRefreshCw } from "react-icons/fi";
import type { ReactNode } from "react";

interface FiltrosBarProps {
  /** Controles de filtro. Cada uno se hace cargo de su propio estado. */
  children: ReactNode;
  /** Aplica los filtros que no se ejecutan en vivo. */
  onAplicar: () => void;
  /** Vuelve todos los controles a su valor por defecto y limpia la consulta. */
  onLimpiar: () => void;
  /** Habilita el botón "Limpiar" cuando hay filtros cargados. */
  hayFiltrosActivos: boolean;
  /** Deshabilita "Filtrar" mientras corre la consulta. */
  loading?: boolean;
  /** Texto del botón principal. Por defecto "Filtrar". */
  textoAplicar?: string;
}

/**
 * Barra de filtros compacta para los listados.
 * Los controles pueden aplicar su cambio en vivo (búsqueda) o esperar a "Filtrar" (selects).
 */
export const FiltrosBar = ({
  children,
  onAplicar,
  onLimpiar,
  hayFiltrosActivos,
  loading = false,
  textoAplicar = "Filtrar",
}: FiltrosBarProps) => (
  <Box w='100%'>
    <Flex
      direction={{ base: "column", md: "row" }}
      align={{ base: "stretch", md: "center" }}
      gap={3}
      p={{ base: 3, md: 4 }}
      borderWidth='1px'
      borderColor='gray.200'
      borderRadius='xl'
      boxShadow='sm'
      bg='white'
      role='search'
      aria-label='Filtros del listado'
    >
      {/* Los controles pueden ocupar varias filas sin arrastrar a los botones. */}
      <Flex flex='1' minW={0} wrap='wrap' columnGap={5} rowGap={3} align='center'>
        {children}
      </Flex>

      {/* Acciones en una columna propia: en desktop nunca bajan debajo de los campos. */}
      <HStack
        gap={2}
        flexShrink={0}
        justify={{ base: "flex-end", md: "flex-start" }}
      >
        <Button
          size='sm'
          variant='ghost'
          colorPalette='green'
          onClick={onLimpiar}
          disabled={!hayFiltrosActivos}
          title='Limpiar filtros'
        >
          <FiRefreshCw /> Limpiar
        </Button>

        <Button
          size='sm'
          colorPalette='green'
          onClick={onAplicar}
          loading={loading}
        >
          {!loading && <FiFilter />} {textoAplicar}
        </Button>
      </HStack>
    </Flex>
  </Box>
);
