import { useCallback, useEffect, useState } from "react";
import type { FiltrosReceta, Receta } from "../types";
import { recetasApi } from "./recetaApi";

export const useRecetaData = (filtros?: FiltrosReceta) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recetas, setRecetas] = useState<Receta[]>([]);

  const filtrosClave = JSON.stringify(filtros ?? {});

  const cargar = useCallback(async (filtrosOverride?: FiltrosReceta) => {
    setLoading(true);
    setError(null);
    try {
      const recetasData = await recetasApi.listarRecetas(filtrosOverride ?? filtros);
      setRecetas(recetasData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar recetas");
    } finally {
      setLoading(false);
    }
  }, [filtrosClave]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return {
    loading,
    error,
    recetas,
    recargar: cargar,
  };
};
