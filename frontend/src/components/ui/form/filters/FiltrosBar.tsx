import { Button, HStack } from "@chakra-ui/react";
import { FiFilter, FiRefreshCw } from "react-icons/fi";
import type { ReactNode } from "react";

interface FiltrosBarProps {
  /** Controles de filtro. Cada uno se hace cargo de su propio estado. */
  children: ReactNode;
  /** Aplica el filtro. El listado solo consulta cuando se llama, no al cambiar un control. */
  onAplicar: () => void;
  /** Vuelve todos los controles a su valor por defecto. */
  onLimpiar: () => void;
  /** Muestra el botón "Limpiar" solo cuando hay algo aplicado. */
  hayFiltrosActivos: boolean;
  /** Deshabilita "Filtrar" mientras corre la consulta. */
  loading?: boolean;
  /** Texto del botón principal. Por defecto "Filtrar". */
  textoAplicar?: string;
}

/**
 * Barra de filtros compacta para los listados.
 *
 * A diferencia de un formulario con labels visibles, los controles van sueltos
 * en una fila y el botón "Filtrar" es el que dispara la consulta. Así el
 * listado no pide datos en cada tecla ni en cada cambio de un desplegable, que
 * es el mismo criterio que usa el historial de checklists.
 *
 * Los controles van como `children` y no se conocen acá: cada listado compone
 * los que necesita (`FiltroSelect`, `FiltroTexto`, ...), así que el mismo
 * componente sirve para vencimientos, personal, equipos o documentación.
 */
export const FiltrosBar = ({
  children,
  onAplicar,
  onLimpiar,
  hayFiltrosActivos,
  loading = false,
  textoAplicar = "Filtrar",
}: FiltrosBarProps) => (
  <HStack
    gap={2}
    align='center'
    p={2}
    borderWidth='1px'
    borderRadius='md'
    bg='white'
  >
    {children}

    <Button
      size='sm'
      colorPalette='green'
      onClick={onAplicar}
      loading={loading}
    >
      {!loading && <FiFilter />} {textoAplicar}
    </Button>

    {hayFiltrosActivos && (
      <Button size='sm' variant='ghost' colorPalette='gray' onClick={onLimpiar}>
        <FiRefreshCw /> Limpiar
      </Button>
    )}
  </HStack>
);
