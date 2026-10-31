import { Box, Button, HStack, IconButton } from "@chakra-ui/react";
import { FiFilter, FiRefreshCw } from "react-icons/fi";
import type { ReactNode } from "react";

interface FiltrosBarProps {
  /** Controles de filtro. Cada uno se hace cargo de su propio estado. */
  children: ReactNode;
  /** Aplica el filtro. El listado solo consulta cuando se llama, no al cambiar un control. */
  onAplicar: () => void;
  /** Vuelve todos los controles a su valor por defecto. */
  onLimpiar: () => void;
  /** Habilita el botón "Limpiar" solo cuando hay algo aplicado. */
  hayFiltrosActivos: boolean;
  /** Deshabilita "Filtrar" mientras corre la consulta. */
  loading?: boolean;
  /** Texto del botón principal. Por defecto "Filtrar". */
  textoAplicar?: string;
  /** Oculta "Filtrar", para listados donde todos los controles se aplican solos (ej. solo búsqueda). */
  ocultarAplicar?: boolean;
}

/**
 * Barra de filtros compacta para los listados.
 * (mismo comentario de antes)
 */
export const FiltrosBar = ({
  children,
  onAplicar,
  onLimpiar,
  hayFiltrosActivos,
  loading = false,
  textoAplicar = "Filtrar",
  ocultarAplicar = false,
}: FiltrosBarProps) => (
  <Box w='100%'>
    {/* Caja de filtros: solo los controles */}
    <HStack
        wrap='wrap'
        columnGap={5}
        rowGap={3}
        align='center'
        p={2}
        borderWidth='1px'
        borderRadius='md'
        bg='white'
      >
        {children}
    {/* Botones dentro de la caja: a la derecha si entran, y si no, bajan juntos */}
      <HStack ml='auto' gap={2} flexShrink={0}>
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

        {!ocultarAplicar && (
          <Button
            size='sm'
            colorPalette='green'
            onClick={onAplicar}
            loading={loading}
          >
            {!loading && <FiFilter />} {textoAplicar}
          </Button>
        )}
      </HStack>
    </HStack>
  </Box>
);