import { useCallback, useState } from "react";
import type { PasoEquipo, PasoInsumo, PasoReceta } from "../types";

type ModoForm = "crear" | "modificar" | "ver";

interface UsePasoFormStateArgs {
  modo: ModoForm;
  paso?: PasoReceta;
}

const conservarSolo = <T,>(
  prev: Record<string, T>,
  ids: number[],
): Record<string, T> => {
  const permitidos = ids.map(String);
  return Object.fromEntries(
    Object.entries(prev).filter(([id]) => permitidos.includes(id)),
  );
};

const inicializarConsumos = (insumos: PasoInsumo[]): Record<string, string> =>
  Object.fromEntries(
    insumos
      .filter(
        (i) =>
          i.cantidad_consumo_estimada !== undefined &&
          i.cantidad_consumo_estimada !== null,
      )
      .map((i) => [String(i.insumo_id), String(i.cantidad_consumo_estimada)]),
  );

const inicializarCantidades = (equipos: PasoEquipo[]): Record<string, string> =>
  Object.fromEntries(
    equipos.map((e) => [String(e.equipo_id), String(e.cantidad ?? 1)]),
  );

export interface UsePasoFormStateReturn {
  consumos: Record<string, string>;
  cantidades: Record<string, string>;
  erroresConsumo: Record<string, string>;
  erroresCantidad: Record<string, string>;
  actualizarConsumo: (id: number, texto: string) => void;
  actualizarCantidad: (id: number, texto: string) => void;
  aplicarSeleccionInsumos: (ids: number[]) => void;
  aplicarSeleccionEquipos: (ids: number[]) => void;
  setErroresConsumo: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setErroresCantidad: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

/**
 * Gestiona el estado local de los recursos dinámicos del paso:
 * - `consumos`: cantidad_consumo_estimada por insumo_id seleccionado.
 * - `cantidades`: cantidad requerida por equipo_id seleccionado.
 */
export const usePasoFormState = ({
  modo,
  paso,
}: UsePasoFormStateArgs): UsePasoFormStateReturn => {
  const esEdicion = modo === "modificar" || modo === "ver";

  const [consumos, setConsumos] = useState<Record<string, string>>(() =>
    esEdicion ? inicializarConsumos(paso?.insumos ?? []) : {},
  );

  const [cantidades, setCantidades] = useState<Record<string, string>>(() =>
    esEdicion ? inicializarCantidades(paso?.equipos ?? []) : {},
  );

  const [erroresConsumo, setErroresConsumo] = useState<Record<string, string>>(
    {},
  );
  const [erroresCantidad, setErroresCantidad] = useState<
    Record<string, string>
  >({});

  const actualizarConsumo = useCallback((id: number, texto: string) => {
    setConsumos((prev) => ({ ...prev, [String(id)]: texto }));
    setErroresConsumo((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
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
    setErroresConsumo({});
  }, []);

  const aplicarSeleccionEquipos = useCallback((ids: number[]) => {
    setCantidades((prev) => {
      const next = conservarSolo(prev, ids);
      ids.forEach((id) => {
        if (!next[String(id)]) next[String(id)] = "1";
      });
      return next;
    });
    setErroresCantidad({});
  }, []);

  return {
    consumos,
    cantidades,
    erroresConsumo,
    erroresCantidad,
    actualizarConsumo,
    actualizarCantidad,
    aplicarSeleccionInsumos,
    aplicarSeleccionEquipos,
    setErroresConsumo,
    setErroresCantidad,
  };
};
