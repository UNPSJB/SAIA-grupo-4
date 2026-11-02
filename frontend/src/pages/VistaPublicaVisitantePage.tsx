import { useEffect } from "react";
import type { ElementType } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertCircle,
  FiLink,
  FiLock,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import { useParams } from "react-router-dom";
import { AlertMessage, LoadingState } from "../components/ui";
import { IndicadoresPublicosView } from "../features/vistaPublica/IndicadoresPublicosView";
import { useIndicadoresPublicos } from "../features/vistaPublica/hooks/useIndicadoresPublicos";
import type { IndicadoresPublicos } from "../features/vistaPublica/types";
import { formatearFecha } from "../utils/fecha";

function EstadoCard({
  icon,
  title,
  message,
  iconColor = "green.600",
}: {
  icon: ElementType;
  title: string;
  message: string;
  iconColor?: string;
}) {
  return (
    <Card.Root maxW='2xl' mx='auto' shadow='md'>
      <Card.Body>
        <VStack
          align='center'
          gap={4}
          py={{ base: 6, md: 10 }}
          textAlign='center'
        >
          <Icon as={icon} boxSize={10} color={iconColor} />
          <Text as='h2' fontSize='xl' fontWeight='bold' color='gray.800'>
            {title}
          </Text>
          <Text fontSize='sm' color='gray.600' maxW='md'>
            {message}
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

// La respuesta pública omite las secciones que el administrador apagó. Si solo
// llega el período, no hay ningún indicador habilitado para mostrar.
function tieneIndicadores(indicadores: IndicadoresPublicos): boolean {
  const vencimientos = indicadores.vencimientos;
  const hayVencimientos =
    vencimientos != null &&
    (vencimientos.porcentaje_al_dia != null ||
      (vencimientos.por_categoria?.length ?? 0) > 0);

  return Boolean(
    indicadores.metricas || indicadores.incidentes || hayVencimientos,
  );
}

export default function VistaPublicaPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const { data, loading, error, noEncontrada, recargar } =
    useIndicadoresPublicos(token);
  const enlaceInvalido = !token;

  useEffect(() => {
    document.title = "Vista pública | SAIA-4";
    return () => {
      document.title = "SAIA-4 | Gestión de Inocuidad";
    };
  }, []);

  return (
    <Box bg='gray.50' minH='100vh'>
      <Box
        as='header'
        bg='green.600'
        color='white'
        py={4}
        px={{ base: 4, md: 6 }}
      >
        <Container maxW='container.xl' px={0}>
          <HStack gap={3} align='center'>
            <Icon as={FiShield} boxSize={{ base: 7, md: 8 }} />
            <Box>
              <Text
                as='h1'
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight='bold'
              >
                SAIA-4
              </Text>
              <Text fontSize={{ base: "xs", md: "sm" }} color='whiteAlpha.800'>
                Vista pública de buenas prácticas
              </Text>
            </Box>
          </HStack>
        </Container>
      </Box>

      <Box py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <Container maxW='container.xl' px={0}>
          {enlaceInvalido && (
            <EstadoCard
              icon={FiLink}
              iconColor='orange.500'
              title='Enlace inválido'
              message='El enlace no contiene un token válido. Verificá el código QR o el enlace compartido.'
            />
          )}

          {!enlaceInvalido && loading && !data && (
            <LoadingState message='Cargando indicadores...' color='green.600' />
          )}

          {!enlaceInvalido && !loading && noEncontrada && (
            <EstadoCard
              icon={FiAlertCircle}
              iconColor='orange.500'
              title='Vista no encontrada'
              message='La vista pública no existe o el enlace ya no es válido.'
            />
          )}

          {!enlaceInvalido && !data && !loading && error && !noEncontrada && (
            <VStack align='stretch' gap={4} maxW='2xl' mx='auto'>
              <AlertMessage type='error' message={error} />
              <Box textAlign='center'>
                <Button onClick={recargar} colorPalette='green'>
                  <FiRefreshCw />
                  Reintentar
                </Button>
              </Box>
            </VStack>
          )}

          {!enlaceInvalido && data && !data.activo && (
            <EstadoCard
              icon={FiLock}
              iconColor='gray.500'
              title='Vista pública desactivada'
              message={
                data.mensaje ??
                "La vista pública está desactivada en este momento."
              }
            />
          )}

          {!enlaceInvalido &&
            data &&
            data.activo &&
            data.indicadores &&
            tieneIndicadores(data.indicadores) && (
            <VStack align='stretch' gap={6}>
              <Box>
                <Text
                  as='h2'
                  fontSize={{ base: "xl", md: "2xl" }}
                  fontWeight='extrabold'
                  color='gray.800'
                >
                  Indicadores de buenas prácticas
                </Text>
                <Text fontSize='sm' color='gray.500' mt={1}>
                  Período:{" "}
                  {formatearFecha(data.indicadores.periodo.desde)} al{" "}
                  {formatearFecha(data.indicadores.periodo.hasta)}
                </Text>
              </Box>

              <IndicadoresPublicosView indicadores={data.indicadores} />

              <Flex
                justify='space-between'
                align={{ base: "flex-start", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                gap={2}
                borderTopWidth='1px'
                borderColor='gray.200'
                pt={4}
              >
                <Text fontSize='xs' color='gray.500'>
                  Indicadores agregados. No incluyen datos internos ni
                  identifican al personal.
                </Text>
                <Button size='sm' variant='ghost' onClick={recargar}>
                  <FiRefreshCw />
                  Actualizar
                </Button>
              </Flex>
            </VStack>
          )}

          {!enlaceInvalido &&
            data &&
            data.activo &&
            data.indicadores &&
            !tieneIndicadores(data.indicadores) && (
            <EstadoCard
              icon={FiAlertCircle}
              iconColor='gray.500'
              title='Sin indicadores habilitados'
              message='El administrador no habilitó indicadores para esta vista pública.'
            />
          )}

          {!enlaceInvalido && data && data.activo && !data.indicadores && (
            <EstadoCard
              icon={FiAlertCircle}
              iconColor='orange.500'
              title='Sin indicadores disponibles'
              message='No se pudieron obtener los indicadores de la vista pública.'
            />
          )}

          {!enlaceInvalido && data && error && (
            <Box mt={4}>
              <AlertMessage type='warning' message={error} />
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
