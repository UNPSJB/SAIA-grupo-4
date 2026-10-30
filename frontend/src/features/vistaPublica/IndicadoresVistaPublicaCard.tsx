import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Icon,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiAlertTriangle, FiSliders } from "react-icons/fi";
import type { IndicadorCatalogo } from "./types";

interface IndicadoresVistaPublicaCardProps {
  indicadores: IndicadorCatalogo[];
  seleccion: Record<string, boolean>;
  guardando: boolean;
  onToggle: (clave: string, activo: boolean) => void;
  onGuardar: () => void;
}

export function IndicadoresVistaPublicaCard({
  indicadores,
  seleccion,
  guardando,
  onToggle,
  onGuardar,
}: IndicadoresVistaPublicaCardProps) {
  const estaActivo = (indicador: IndicadorCatalogo) =>
    seleccion[indicador.clave] ?? indicador.activo;

  const activos = indicadores.filter(estaActivo).length;
  const hayCambios = indicadores.some(
    (indicador) => estaActivo(indicador) !== indicador.activo,
  );

  return (
    <Card.Root shadow='md'>
      <Card.Header>
        <Flex
          align={{ base: "flex-start", sm: "center" }}
          justify='space-between'
          direction={{ base: "column", sm: "row" }}
          gap={2}
        >
          <HStack gap={2}>
            <Icon as={FiSliders} color='green.600' boxSize={5} />
            <Text as='h2' fontSize='lg' fontWeight='semibold' color='gray.800'>
              Indicadores a mostrar
            </Text>
          </HStack>
          <Badge colorPalette='green' variant='subtle'>
            {activos} de {indicadores.length} activos
          </Badge>
        </Flex>
      </Card.Header>

      <Card.Body>
        <VStack align='stretch' gap={4}>
          <Text fontSize='sm' color='gray.600'>
            Elegí qué indicadores se publican en el enlace. Los cambios se
            aplican de inmediato a la vista pública.
          </Text>

          <VStack align='stretch' gap={2}>
            {indicadores.map((indicador) => {
              const activo = estaActivo(indicador);

              return (
                <Box
                  key={indicador.clave}
                  p={3}
                  borderRadius='lg'
                  borderWidth='1px'
                  borderColor={indicador.sensible ? "orange.200" : "gray.200"}
                  bg={indicador.sensible ? "orange.50" : "white"}
                >
                  <Flex align='center' justify='space-between' gap={4}>
                    <Box>
                      <HStack gap={2} wrap='wrap'>
                        <Text fontWeight='semibold' color='gray.800'>
                          {indicador.nombre}
                        </Text>
                        {indicador.sensible && (
                          <Badge colorPalette='orange' variant='subtle'>
                            <Icon as={FiAlertTriangle} boxSize={3} />
                            Dato sensible
                          </Badge>
                        )}
                        {!indicador.por_defecto && (
                          <Badge colorPalette='gray' variant='subtle'>
                            Apagado por defecto
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize='sm' color='gray.600' mt={1}>
                        {indicador.descripcion}
                      </Text>
                    </Box>

                    <Switch.Root
                      checked={activo}
                      disabled={guardando}
                      colorPalette={indicador.sensible ? "orange" : "green"}
                      onCheckedChange={(details) =>
                        onToggle(indicador.clave, details.checked)
                      }
                      aria-label={`Mostrar ${indicador.nombre}`}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Flex>

                  {indicador.sensible && (
                    <Text fontSize='xs' color='orange.700' mt={2}>
                      Al activarlo se publican solo totales agregados de
                      incidentes. Verificá que no exponga información que no
                      querés compartir.
                    </Text>
                  )}
                </Box>
              );
            })}
          </VStack>

          <Flex justify='flex-end'>
            <Button
              colorPalette='green'
              loading={guardando}
              disabled={!hayCambios || guardando}
              onClick={onGuardar}
            >
              Guardar cambios
            </Button>
          </Flex>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
