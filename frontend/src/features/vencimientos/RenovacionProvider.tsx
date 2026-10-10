import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FormModal } from "../../components/layout/FormModal";
import { AlertMessage, LoadingState } from "../../components/ui";
import { useOrigenVencimiento } from "./hooks/useOrigenVencimiento";
import { RenovarVencimiento } from "./RenovarVencimiento";
import { RenovacionContext } from "./hooks/useRenovacion";
import type { Vencimiento } from "./types";

/**
  Dueño del modal de renovación.
 
  Vive fuera del árbol del NavBar a propósito: se abre desde la campana, que
  está adentro de un Popover que se cierra en el mismo tick.
 */
const SALIDA_POPOVER_MS = 250;

export const RenovacionProvider = ({ children }: { children: ReactNode }) => {
  const [aRenovar, setARenovar] = useState<Vencimiento | null>(null);
  const [modalListo, setModalListo] = useState(false);
  const [versionGuardado, setVersionGuardado] = useState(0);
  const timer = useRef<number | null>(null);

  // La ficha arranca apenas se llama `abrir`, asi que la peticion al backend se solapa con la espera
  const { ficha, loading, error } = useOrigenVencimiento(aRenovar);

  const cerrar = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setModalListo(false);
    setARenovar(null);
  }, []);

  const abrir = useCallback((v: Vencimiento) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    // Siempre arranca cerrado: un timer viejo no puede dejar `modalListo` en
    // true y hacer que la proxima apertura se saltee la espera.
    setModalListo(false);
    setARenovar(v);
    timer.current = window.setTimeout(
      () => setModalListo(true),
      SALIDA_POPOVER_MS,
    );
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const notificarGuardado = useCallback(
    () => setVersionGuardado((n) => n + 1),
    [],
  );

  return (
    <RenovacionContext.Provider
      value={{ abrir, cerrar, versionGuardado, notificarGuardado }}
    >
      {children}

      {aRenovar && (
        <FormModal
          open={modalListo}
          onClose={cerrar}
          closeOnInteractOutside={false}
        >
          {loading && <LoadingState message='Cargando el elemento...' />}
          {!loading && error && <AlertMessage type='error' message={error} />}
          {!loading && !error && ficha?.registro && (
            <RenovarVencimiento
              categoria={aRenovar.categoria}
              elemento={ficha.registro}
              onCancelar={cerrar}
              onGuardado={() => {
                cerrar();
                notificarGuardado();
              }}
            />
          )}
        </FormModal>
      )}
    </RenovacionContext.Provider>
  );
};
