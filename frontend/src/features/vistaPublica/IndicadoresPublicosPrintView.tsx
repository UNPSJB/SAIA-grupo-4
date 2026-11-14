import { Text } from "@chakra-ui/react";
import { InformePrintLayout } from "../../components/print/InformePrintLayout";
import { formatearFecha } from "../../utils/fecha";
import { IndicadoresPublicosView } from "./IndicadoresPublicosView";
import type { IndicadoresPublicos } from "./types";

interface IndicadoresPublicosPrintViewProps {
  /** Los mismos indicadores que devuelve GET /publico/{token}/indicadores. */
  indicadores: IndicadoresPublicos;
}

/**
 * Informe imprimible de la vista pública.
 *
 * Está oculto en pantalla y solo aparece al imprimir (lo maneja InformePrintLayout).
 * Reutiliza IndicadoresPublicosView en modo impresión: una sola columna para A4,
 * sin sombras ni animaciones y con los colores de las barras de progreso.
 * Como el backend solo envía las secciones habilitadas, el informe incluye solo esas.
 */
export function IndicadoresPublicosPrintView({
  indicadores,
}: IndicadoresPublicosPrintViewProps) {
  const periodo = `${formatearFecha(indicadores.periodo.desde)} al ${formatearFecha(indicadores.periodo.hasta)}`;

  return (
    <InformePrintLayout titulo="Indicadores de buenas prácticas" periodo={periodo}>
      <IndicadoresPublicosView indicadores={indicadores} impresion />

      <Text
        fontSize="2xs"
        color="gray.500"
        mt={4}
        pt={2}
        borderTopWidth="1px"
        borderColor="gray.200"
      >
        Indicadores agregados. No incluyen datos internos ni identifican al
        personal.
      </Text>
    </InformePrintLayout>
  );
}
