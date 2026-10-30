import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiGlobe, FiRefreshCw, FiShield } from "react-icons/fi";
import { AlertConfirm, AlertMessage, LoadingState } from "../components/ui";
import { PUBLIC_APP_URL } from "../config";
import { EnlacePublicoCard } from "../features/vistaPublica/EnlacePublicoCard";
import { EstadoVistaPublicaCard } from "../features/vistaPublica/EstadoVistaPublicaCard";
import { IndicadoresVistaPublicaCard } from "../features/vistaPublica/IndicadoresVistaPublicaCard";
import { useVistaPublicaConfig } from "../features/vistaPublica/hooks/useVistaPublicaConfig";

function construirUrlPublica(token: string): string {
  return `${PUBLIC_APP_URL}/publico/${encodeURIComponent(token)}`;
}

export default function VistaPublicaPage() {
  const {
    estado,
    loading,
    guardando,
    guardandoIndicadores,
    error,
    mensaje,
    cargar,
    actualizar,
    guardarIndicadores,
  } = useVistaPublicaConfig();
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(false);
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!estado) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeleccion(
      Object.fromEntries(
        estado.indicadores.map((indicador) => [
          indicador.clave,
          indicador.activo,
        ]),
      ),
    );
  }, [estado]);

  const handleToggle = (nuevoEstado: boolean) => {
    if (!nuevoEstado) {
      setConfirmarDesactivar(true);
      return;
    }

    void actualizar(true);
  };

  const confirmarDesactivacion = () => {
    setConfirmarDesactivar(false);
    void actualizar(false);
  };

  const toggleIndicador = (clave: string, activo: boolean) => {
    setSeleccion((anterior) => ({ ...anterior, [clave]: activo }));
  };

  const guardarSeleccion = () => {
    if (!estado) return;

    const activos = estado.indicadores
      .filter((indicador) => seleccion[indicador.clave] ?? indicador.activo)
      .map((indicador) => indicador.clave);

    void guardarIndicadores(activos);
  };

  if (loading && !estado) {
    return <LoadingState message='Cargando vista pública...' />;
  }

  if (!estado) {
    return (
      <Container maxW='container.xl' py={8}>
        <VStack align='stretch' gap={4}>
          <AlertMessage
            type='error'
            message={error ?? "No se pudo cargar la vista pública."}
          />
          <Box>
            <Button onClick={() => void cargar()} colorPalette='green'>
              <FiRefreshCw />
              Reintentar
            </Button>
          </Box>
        </VStack>
      </Container>
    );
  }

  const url = construirUrlPublica(estado.token);

  return (
    <Box bg='gray.50' minH='100vh' py={{ base: 4, md: 8 }}>
      <Container maxW='container.xl'>
        <VStack align='stretch' gap={6}>
          <Box>
            <HStack gap={2} mb={1}>
              <Icon as={FiGlobe} color='green.600' boxSize={6} />
              <Text
                as='h1'
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight='extrabold'
                color='gray.800'
              >
                Vista pública
              </Text>
            </HStack>
            <Text fontSize='sm' color='gray.500'>
              Compartí indicadores agregados de cumplimiento, vencimientos e
              incidentes sin exponer datos internos.
            </Text>
          </Box>

          {error && <AlertMessage type='error' message={error} />}
          {mensaje && <AlertMessage type='success' message={mensaje} />}

          <EstadoVistaPublicaCard
            activo={estado.activo}
            guardando={guardando}
            onToggle={handleToggle}
          />

          <EnlacePublicoCard url={url} activo={estado.activo} />

          <IndicadoresVistaPublicaCard
            indicadores={estado.indicadores}
            seleccion={seleccion}
            guardando={guardandoIndicadores}
            onToggle={toggleIndicador}
            onGuardar={guardarSeleccion}
          />

          <Card.Root
            shadow='md'
            borderLeft='4px solid'
            borderLeftColor='green.500'
          >
            <Card.Body>
              <HStack align='flex-start' gap={3}>
                <Icon as={FiShield} color='green.600' boxSize={5} mt={0.5} />
                <Box>
                  <Text fontWeight='semibold' color='gray.800'>
                    Privacidad de la vista pública
                  </Text>
                  <Text fontSize='sm' color='gray.600' mt={1}>
                    Solo se publican métricas agregadas de tareas,
                    vencimientos e incidentes habilitados. Los indicadores de
                    incidentes están apagados por defecto y, si se activan,
                    solo exponen totales globales. No se exponen
                    identificadores internos, detalles ni enlaces a otras
                    secciones del sistema.
                  </Text>
                </Box>
              </HStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>

      <AlertConfirm
        open={confirmarDesactivar}
        title='Desactivar vista pública'
        message='El enlace dejará de mostrar indicadores de inmediato. El token se conserva para cuando vuelvas a activarla. ¿Continuar?'
        loading={guardando}
        onConfirm={confirmarDesactivacion}
        onCancel={() => setConfirmarDesactivar(false)}
      />
    </Box>
  );
}
