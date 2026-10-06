import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Icon,
  IconButton,
  Popover,
  Portal,
  Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheck, FiRefreshCw, FiTarget } from "react-icons/fi";
import {
  AlertMessage,
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  LoadingState,
} from "../ui";
import { useNotificaciones } from "../../features/vencimientos/hooks/useNotificaciones";
import { renovacionDe } from "../../features/vencimientos/renovacionVencimientos";
import { useRenovacion } from "../../features/vencimientos/hooks/useRenovacion";
import type { Vencimiento } from "../../features/vencimientos/types";

/**
 * Filas en el popover. El encabezado muestra el total real, asi que con
 * sesenta pendientes el numero no miente: solo la lista se acorta.
 */
const MAXIMO_FILAS = 10;

/**
 * Leyenda de urgencia de la fila.
 *
 * `leyendaDe` del semaforo no sirve tal cual: para los dias que ya pasaron
 * devuelve solo "(Vencido)" sin cuanto tiempo, y el popover necesita
 * "Vencido hace 9 dias". Se compone aca en vez de extender la funcion, porque
 * `SemaforoFecha` la usa en el tablero y no queremos tocar esa pantalla.
 */
const urgencia = (v: Vencimiento): string => {
  if (v.dias_restantes < 0) {
    const d = Math.abs(v.dias_restantes);
    return `Vencido hace ${d} ${d === 1 ? "día" : "días"}`;
  }
  if (v.dias_restantes === 0) return "Vence hoy";
  return `Vence en ${v.dias_restantes} ${
    v.dias_restantes === 1 ? "día" : "días"
  }`;
};

interface FilaProps {
  vencimiento: Vencimiento;
  onIrAlDetalle: () => void;
  onResolver: () => void;
}

/** Una fila de la lista. No exportada: `react-refresh` lo exige asi. */
const FilaNotificacion = ({
  vencimiento,
  onIrAlDetalle,
  onResolver,
}: FilaProps) => {
  const entrada = renovacionDe(vencimiento.categoria);

  return (
    <Box
      display='flex'
      alignItems='center'
      gap={3}
      py={2}
      px={3}
      borderBottomWidth='1px'
      _hover={{ bg: "gray.50" }}
      cursor='pointer'
      onClick={onIrAlDetalle}
    >
      <Badge
        colorPalette={COLOR_ESTADO[vencimiento.estado]}
        variant='subtle'
        w='72px'
        justifyContent='center'
        flexShrink={0}
      >
        {ETIQUETA_ESTADO[vencimiento.estado]}
      </Badge>

      <Box flex='1' minW={0}>
        <Text fontSize='sm' fontWeight='semibold' truncate>
          {vencimiento.concepto}
        </Text>
        <Text fontSize='xs' color='gray.500' truncate>
          {urgencia(vencimiento)}
        </Text>
      </Box>

      {entrada && (
        // stopPropagation: la accion correctiva es explicita, no un efecto
        // lateral de querer navegar al detalle.
        <Button
          size='xs'
          variant='outline'
          colorPalette={entrada.colorPalette}
          onClick={(e) => {
            e.stopPropagation();
            onResolver();
          }}
        >
          <Icon as={FiCheck} /> Resolver
        </Button>
      )}
    </Box>
  );
};

/**
 * Campana de notificaciones y alertas, en el encabezado del NavBar.
 *
 * El badge cuenta vencidos + proximos y no tiene estado de "leido": baja solo
 * cuando la fila sale de la ventana, que es cuando dejo de estar pendiente.
 * Abrir el popover no cambia nada.
 *
 * Para resolver delega en `<RenovacionProvider>` (App.tsx): el modal usa el
 * mismo `RenovarVencimiento` que el tablero, asi la escritura del recambio y
 * sus validaciones quedan en una sola implementacion, pero el Dialog no se
 * monta aca al lado del Popover, que se cierra en el mismo tick.
 */
export const CampanaNotificaciones = () => {
  const { pendientes, total, inicial, error, recargar } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const navegar = useNavigate();

  // El modal vive en <RenovacionProvider> (App.tsx), fuera de este arbol.
  const { abrir, versionGuardado } = useRenovacion();

  // La renovacion se guarda desde ese modal global, asi que no hay navegacion
  // que dispare el refresque por ruta. Este contador es el que le avisa al
  // badge que hay una fila menos pendiente. `recargar` es estable
  // (useCallback con deps vacias en useListadoData), asi que no hay loop.
  useEffect(() => {
    if (versionGuardado === 0) return;
    recargar();
  }, [versionGuardado, recargar]);

  const visibles = pendientes.slice(0, MAXIMO_FILAS);

  return (
    <>
      <Popover.Root
        open={abierto}
        onOpenChange={(e) => setAbierto(e.open)}
        positioning={{ placement: "bottom-start" }}
        // No devuelve el foco al botón de la campana al cerrarse: el foco
        // tiene que quedarse en el Dialog recién abierto, sin saltar por un
        // frame al encabezado y volver.
        restoreFocus={false}
      >
        <Popover.Trigger asChild>
          <IconButton
            aria-label={
              total > 0
                ? `Notificaciones y alertas, ${total} pendientes`
                : "Notificaciones y alertas"
            }
            variant='ghost'
            color='white'
            position='relative'
            _hover={{ bg: "whiteAlpha.200" }}
          >
            <Icon as={FiBell} />
            {total > 0 && (
              <Badge
                colorPalette='red'
                variant='solid'
                position='absolute'
                top='-4px'
                right='-8px'
                borderRadius='full'
                fontSize='0.6rem'
                px='4px'
                pointerEvents='none'
              >
                {total > 99 ? "99+" : total}
              </Badge>
            )}
          </IconButton>
        </Popover.Trigger>

        {/*
          El sidebar es `position: sticky` con `overflowX: hidden`
          (SideBar.tsx), asi que recorta todo descendiente posicionado:
          sin Portal el popover sale cortado. Mismo remedio que FormModal.tsx:23.
        */}
        <Portal>
          <Popover.Positioner>
            <Popover.Content w='min(92vw, 390px)'>
              <Box
                display='flex'
                alignItems='center'
                gap={2}
                px={3}
                py={2}
                bg='green.600'
                color='white'
                flexShrink={0}
              >
                <Icon as={FiBell} boxSize={4} />
                <Text
                  fontSize='sm'
                  fontWeight='bold'
                  flex='1'
                  textTransform='uppercase'
                >
                  Notificaciones y alertas
                  {total > 0 ? ` (${total} pendientes)` : ""}
                </Text>
                <IconButton
                  aria-label='Actualizar notificaciones'
                  size='xs'
                  variant='ghost'
                  color='white'
                  _hover={{ bg: "whiteAlpha.300" }}
                  onClick={recargar}
                >
                  <Icon as={FiRefreshCw} />
                </IconButton>
              </Box>

              {/*
                El tope va en este Box y no en Content: Content ya trae
                `maxHeight: var(--available-height)` del recipe y un maxH ahi lo
                pisaria. `minH={0}` es obligatorio, si no el min-height:auto del
                flex gana sobre max-height y la lista queda sin tope.
              */}
              <Box flex='1' minH={0} maxH='440px' overflowY='auto'>
                {inicial && (
                  <LoadingState message='Cargando notificaciones...' />
                )}

                {!inicial && error && (
                  <AlertMessage type='error' message={error} />
                )}

                {!inicial && !error && pendientes.length === 0 && (
                  <AlertMessage
                    type='info'
                    message='No hay vencimientos pendientes.'
                  />
                )}

                {!inicial &&
                  !error &&
                  visibles.map((v) => (
                    <FilaNotificacion
                      key={v.id}
                      vencimiento={v}
                      onIrAlDetalle={() => {
                        setAbierto(false);
                        navegar(v.ruta_detalle);
                      }}
                      onResolver={() => {
                        setAbierto(false);
                        abrir(v);
                      }}
                    />
                  ))}

                {!inicial && !error && pendientes.length > MAXIMO_FILAS && (
                  <Text fontSize='xs' color='gray.500' px={3} py={2}>
                    Mostrando {MAXIMO_FILAS} de {pendientes.length}. El resto
                    está en el tablero.
                  </Text>
                )}
              </Box>

              <Box px={3} py={2} borderTopWidth='1px' flexShrink={0}>
                <Button
                  w='100%'
                  size='sm'
                  colorPalette='green'
                  onClick={() => {
                    setAbierto(false);
                    navegar("/vencimientos");
                  }}
                >
                  <Icon as={FiTarget} /> Ver Tablero Consolidado
                </Button>
              </Box>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    </>
  );
};
