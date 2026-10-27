import { useCallback, useEffect, useState } from "react";
import type { Receta } from "../types";
import { recetasApi } from "./recetaApi";

export const useRecetaData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recetas, setRecetas] = useState<Receta[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const recetasData = await recetasApi.listarRecetas();
      setRecetas(recetasData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar recetas");
    } finally {
      setLoading(false);
    }
  }, []);

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
