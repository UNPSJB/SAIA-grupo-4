import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../auth/apiFetch";

export interface Insumo {
  id: number;
  nombre: string;
  disponible: boolean;
  unidad_medida?: {
    simbolo: string;
  };
}

export const useInsumos = () => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const fetchInsumos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/insumos/");
      if (!res.ok) throw new Error("Error al obtener insumos");
      const data = await res.json();
      const disponibles = Array.isArray(data) ? data.filter((i: Insumo) => i.disponible) : [];
      setInsumos(disponibles);
    } catch {
      setError("No se pudo cargar el maestro de insumos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsumos();
  }, [fetchInsumos]);

  return { insumos, loading, error, refetch: fetchInsumos };
};