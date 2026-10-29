import { Badge, Card, Flex, Spinner, Switch, Text, VStack } from "@chakra-ui/react";

interface EstadoVistaPublicaCardProps {
  activo: boolean;
  guardando: boolean;
  onToggle: (activo: boolean) => void;
}

export function EstadoVistaPublicaCard({
  activo,
  guardando,
  onToggle,
}: EstadoVistaPublicaCardProps) {
  return (
    <Card.Root shadow='md'>
      <Card.Header>
        <Flex
          align={{ base: "flex-start", sm: "center" }}
          justify='space-between'
          direction={{ base: "column", sm: "row" }}
          gap={2}
        >
          <Text as='h2' fontSize='lg' fontWeight='semibold' color='gray.800'>
            Estado de la vista pública
          </Text>
          <Badge colorPalette={activo ? "green" : "gray"} variant='subtle'>
            {activo ? "Activa" : "Desactivada"}
          </Badge>
        </Flex>
      </Card.Header>
      <Card.Body>
        <VStack align='stretch' gap={3}>
          <Flex align='center' gap={3} wrap='wrap'>
            <Switch.Root
              checked={activo}
              disabled={guardando}
              colorPalette='green'
              onCheckedChange={(details) => onToggle(details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
              <Switch.Label>Vista pública activa</Switch.Label>
            </Switch.Root>
            {guardando && <Spinner size='sm' color='green.500' />}
          </Flex>

          <Text fontSize='sm' color='gray.600'>
            Mientras está activa, cualquier persona con el enlace puede ver los
            indicadores agregados. Al desactivarla, el acceso se corta de
            inmediato.
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
