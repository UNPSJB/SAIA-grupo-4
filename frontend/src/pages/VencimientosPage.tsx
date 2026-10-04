import { useState } from "react";
import { FormModal } from "../components/layout";
import { AlertMessage, LoadingState } from "../components/ui";
import { ListadoVencimientos } from "../features/vencimientos/ListadoVencimientos";
import { RenovarVencimiento } from "../features/vencimientos/RenovarVencimiento";
import { VencimientoDetalle } from "../features/vencimientos/VencimientoDetalle";
import { useOrigenVencimiento } from "../features/vencimientos/hooks/useOrigenVencimiento";
import type { Vencimiento } from "../features/vencimientos/types";

// Dueña del estado de los modales, como el resto de las páginas del proyecto.
// "Ver detalle" abre acá mismo en vez de navegar al módulo de origen, para no
// sacar al usuario del tablero; el registro de origen se muestra como segunda
// sección del modal.
export default function VencimientosPage() {
  const [detalle, setDetalle] = useState<Vencimiento | null>(null);
  const [aRenovar, setARenovar] = useState<Vencimiento | null>(null);

  // El registro de origen se pide una vez y queda cacheado por fila, así que
  // abrir el detalle y después renovar no vuelve a golpear el backend.
  const { ficha, loading, error } = useOrigenVencimiento(aRenovar);

  // Cada renovación guardada lo sube para que el listado vuelva a pedir los
  // vencimientos: la fila tiene que mostrar la fecha nueva.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <ListadoVencimientos
        onVerDetalle={setDetalle}
        onRenovar={setARenovar}
        refreshKey={refreshKey}
      />

      {detalle && (
        <VencimientoDetalle
          vencimiento={detalle}
          onCerrar={() => setDetalle(null)}
        />
      )}

      {aRenovar && (
        <FormModal open onClose={() => setARenovar(null)}>
          {loading && <LoadingState message='Cargando el elemento...' />}
          {!loading && error && <AlertMessage type='error' message={error} />}
          {!loading && !error && ficha?.registro && (
            <RenovarVencimiento
              categoria={aRenovar.categoria}
              elemento={ficha.registro}
              onCancelar={() => setARenovar(null)}
              onGuardado={() => {
                setARenovar(null);
                setRefreshKey((k) => k + 1);
              }}
            />
          )}
        </FormModal>
      )}
    </>
  );
}