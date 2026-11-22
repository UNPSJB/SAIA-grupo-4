import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
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
import { useIndicadoresPublicos } from "../features/vistaPublica/hooks/useIndicadoresPublicos";
import { IndicadoresPublicosPrintView } from "../features/vistaPublica/IndicadoresPublicosPrintView";
import { nombreArchivoIndicadoresPublicos } from "../features/vistaPublica/nombreArchivoInforme";
import type { IndicadoresPublicos } from "../features/vistaPublica/types";
import { imprimirInforme } from "../utils/imprimirInforme";

function construirUrlPublica(token: string): string {
  return `${PUBLIC_APP_URL}/publico/${encodeURIComponent(token)}`;
}

// Solo se imprime si la vista está activa y hay al menos una sección habilitada
function obtenerIndicadoresImprimibles(
  respuesta: { activo: boolean; indicadores?: IndicadoresPublicos | null } | null,
): IndicadoresPublicos | null {
  const indicadores = respuesta?.activo ? respuesta.indicadores : null;
  if (!indicadores) return null;

  const { metricas, vencimientos, incidentes } = indicadores;
  const hayVencimientos =
    vencimientos?.porcentaje_al_dia != null ||
    (vencimientos?.por_categoria?.length ?? 0) > 0;

  return metricas || hayVencimientos || incidentes ? indicadores : null;
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
  // Los mismos indicadores que ve un visitante con el enlace: son los que se imprimen
  const { data: respuestaPublica, recargar: recargarIndicadores } =
    useIndicadoresPublicos(estado?.token);
  const indicadoresImprimibles = obtenerIndicadoresImprimibles(respuestaPublica);
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

    void actualizar(true).then((ok) => ok && recargarIndicadores());
  };

  const confirmarDesactivacion = () => {
    setConfirmarDesactivar(false);
    void actualizar(false).then((ok) => ok && recargarIndicadores());
  };

  const toggleIndicador = (clave: string, activo: boolean) => {
    setSeleccion((anterior) => ({ ...anterior, [clave]: activo }));
  };

  const guardarSeleccion = () => {
    if (!estado) return;

    const activos = estado.indicadores
      .filter((indicador) => seleccion[indicador.clave] ?? indicador.activo)
      .map((indicador) => indicador.clave);

    void guardarIndicadores(activos).then((ok) => ok && recargarIndicadores());
  };

  if (loading && !estado) {
    return <LoadingState message='Cargando vista pública...' />;
  }

  if (!estado) {
    return (
      <Box w='full' py={4}>
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
      </Box>
    );
  }

  const url = construirUrlPublica(estado.token);

  return (
    <Box w='full'>
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

          <EnlacePublicoCard
            url={url}
            activo={estado.activo}
            onImprimir={
              estado.activo && indicadoresImprimibles
                ? () =>
                    imprimirInforme(
                      nombreArchivoIndicadoresPublicos(indicadoresImprimibles),
                    )
                : undefined
            }
          />

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

      <AlertConfirm
        open={confirmarDesactivar}
        title='Desactivar vista pública'
        message='El enlace dejará de mostrar indicadores de inmediato. El token se conserva para cuando vuelvas a activarla. ¿Continuar?'
        loading={guardando}
        onConfirm={confirmarDesactivacion}
        onCancel={() => setConfirmarDesactivar(false)}
      />

      {/* Informe imprimible: oculto en pantalla, solo aparece al imprimir */}
      {estado.activo && indicadoresImprimibles && (
        <IndicadoresPublicosPrintView indicadores={indicadoresImprimibles} />
      )}
    </Box>
  );
}
