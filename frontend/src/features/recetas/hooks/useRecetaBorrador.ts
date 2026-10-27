import { useCallback, useEffect, useState } from "react";
import type { Receta } from "../types";
import {
  obtenerBorradorRecetaOpcional,
  recetasApi,
} from "./recetaApi";

/**
 * Carga el borrador solicitado (si se pasa un id) o el borrador más reciente.
 * Se usa en /nueva-receta para replicar el comportamiento de /nuevo-plan.
 */
export const useRecetaBorrador = (recetaId?: number) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receta, setReceta] = useState<Receta | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (recetaId && !Number.isNaN(recetaId)) {
        const data = await recetasApi.obtenerReceta(recetaId);
        if (data.estado !== "BORRADOR") {
          throw new Error("La receta seleccionada no está en estado BORRADOR.");
        }
        setReceta(data);
      } else {
        setReceta(await obtenerBorradorRecetaOpcional());
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el borrador.",
      );
      setReceta(null);
    } finally {
      setLoading(false);
    }
  }, [recetaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return {
    loading,
    error,
    receta,
    recargar: cargar,
  };
};
