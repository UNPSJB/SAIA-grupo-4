import { cloneElement, type ReactElement } from "react";
import { Flex } from "@chakra-ui/react";
import { ResponsiveContainer } from "recharts";
import type { TamanoFijo } from "./types";

interface ContenedorGraficoProps {
  /** Gráfico de Recharts (PieChart, BarChart...). */
  children: ReactElement<{ width?: number; height?: number }>;
  /** Alto que usa en pantalla, donde el ancho se adapta a la tarjeta. */
  altoPantalla: number;
  /** Si se pasa, el gráfico se dibuja con este tamaño exacto (modo impresión). */
  fixedSize?: TamanoFijo;
}

/**
 * Decide cómo se dimensiona un gráfico de Recharts.
 *
 * - En pantalla usa ResponsiveContainer, que mide la tarjeta y adapta el ancho.
 * - En impresión el informe está oculto (display: none) hasta que se imprime, así
 *   que ResponsiveContainer mediría 0 y el gráfico saldría vacío. Por eso recibe
 *   un tamaño fijo y se lo pasa directo al gráfico, centrado en la tarjeta.
 */
export function ContenedorGrafico({ children, altoPantalla, fixedSize }: ContenedorGraficoProps) {
  if (fixedSize) {
    return (
      <Flex justify="center" w="full">
        {cloneElement(children, { width: fixedSize.width, height: fixedSize.height })}
      </Flex>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={altoPantalla}>
      {children}
    </ResponsiveContainer>
  );
}
