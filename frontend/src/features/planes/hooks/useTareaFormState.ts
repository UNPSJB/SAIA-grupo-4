import { useCallback, useState } from "react";
import type { TareaPOES } from "../types";
import {
  conservarSolo,
  inicializarCantidades,
  inicializarConsumos,
  inicializarDiluciones,
} from "../utils/resourceHelpers";

type ModoForm = "crear" | "modificar" | "ver";

interface UseTareaFormStateArgs {
  modo: ModoForm;
  tarea?: TareaPOES;
}

/**
 * Estado que el formulario no puede manejar con react-hook-form: los detalles
 * por recurso (consumo, dilución y cantidad) viven en diccionarios indexados
 * por id, porque su forma depende de cuántos recursos haya seleccionados y de
 * cuáles, algo que el esquema del formulario no modela.
 */
export interface UseTareaFormStateReturn {
  consumos: Record<string, string>;
  diluciones: Record<string, string>;
  cantidades: Record<string, string>;
  erroresConsumo: Record<string, string>;
  erroresCantidad: Record<string, string>;
  actualizarConsumo: (id: number, texto: string) => void;
  actualizarDilucion: (id: number, texto: string) => void;
  actualizarCantidad: (id: number, texto: string) => void;
  /** Descarta los detalles de insumos que ya no están seleccionados */
  aplicarSeleccionInsumos: (ids: number[]) => void;
  /**
   * Descarta las cantidades de los elementos deseleccionados y deja "1" en los
   * recién agregados, para que siempre haya un valor válido que enviar.
   */
  aplicarSeleccionElementos: (ids: number[]) => void;
  setErroresConsumo: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setErroresCantidad: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  /** Vacía todo el estado de recursos (se usa al cambiar de destino) */
  resetearEstadoRecursos: () => void;
}

export const useTareaFormState = ({
  modo,
  tarea,
}: UseTareaFormStateArgs): UseTareaFormStateReturn => {
  const esEdicion = modo === "modificar" || modo === "ver";

  // Consumo (dosis) por insumo. Solo se precarga lo que venga con dosis definida.
  const [consumos, setConsumos] = useState<Record<string, string>>(() =>
    esEdicion ? inicializarConsumos(tarea?.insumos_quimicos ?? []) : {},
  );

  // Dilución por insumo. Es opcional, por eso se precarga también vacía.
  const [diluciones, setDiluciones] = useState<Record<string, string>>(() =>
    esEdicion ? inicializarDiluciones(tarea?.insumos_quimicos ?? []) : {},
  );

  // Cantidad requerida por elemento de limpieza.
  const [cantidades, setCantidades] = useState<Record<string, string>>(() =>
    esEdicion ? inicializarCantidades(tarea?.elementos_limpieza ?? []) : {},
  );

  const [erroresConsumo, setErroresConsumo] = useState<Record<string, string>>(
    {},
  );
  const [erroresCantidad, setErroresCantidad] = useState<
    Record<string, string>
  >({});

  // Editar un valor borra su error: el error solo sirve para señalar qué
  // corregir, no para persisting.
  const actualizarConsumo = useCallback((id: number, texto: string) => {
    setConsumos((prev) => ({ ...prev, [String(id)]: texto }));
    setErroresConsumo((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
  }, []);

  const actualizarDilucion = useCallback((id: number, texto: string) => {
    setDiluciones((prev) => ({ ...prev, [String(id)]: texto }));
  }, []);

  const actualizarCantidad = useCallback((id: number, texto: string) => {
    setCantidades((prev) => ({ ...prev, [String(id)]: texto }));
    setErroresCantidad((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
  }, []);

  const aplicarSeleccionInsumos = useCallback((ids: number[]) => {
    setConsumos((prev) => conservarSolo(prev, ids));
    setDiluciones((prev) => conservarSolo(prev, ids));
    setErroresConsumo({});
  }, []);

  const aplicarSeleccionElementos = useCallback((ids: number[]) => {
    setCantidades((prev) => {
      const next = conservarSolo(prev, ids);
      ids.forEach((id) => {
        if (!next[String(id)]) next[String(id)] = "1";
      });
      return next;
    });
    setErroresCantidad({});
  }, []);

  const resetearEstadoRecursos = useCallback(() => {
    setConsumos({});
    setDiluciones({});
    setCantidades({});
    setErroresConsumo({});
    setErroresCantidad({});
  }, []);

  return {
    consumos,
    diluciones,
    cantidades,
    erroresConsumo,
    erroresCantidad,
    actualizarConsumo,
    actualizarDilucion,
    actualizarCantidad,
    aplicarSeleccionInsumos,
    aplicarSeleccionElementos,
    setErroresConsumo,
    setErroresCantidad,
    resetearEstadoRecursos,
  };
};
