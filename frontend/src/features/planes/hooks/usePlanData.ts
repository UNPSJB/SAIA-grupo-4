import { useCallback, useEffect, useState } from "react";
import type { PlanPOES } from "../types";
import {
  obtenerActivoOpcional,
  obtenerBorradorOpcional,
  planesApi,
} from "./planApi";

export const usePlanData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState<PlanPOES | null>(null);
  const [planVigente, setPlanVigente] = useState<PlanPOES | null>(null);
  const [planes, setPlanes] = useState<PlanPOES[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [borradorData, vigenteData, planesData] = await Promise.all([
          obtenerBorradorOpcional(),
          obtenerActivoOpcional(),
          planesApi.listarPlanes(),
        ]);
        if (!active) return;
        setBorrador(borradorData);
        setPlanVigente(vigenteData);
        setPlanes(planesData);
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los planes.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return {
    loading,
    error,
    borrador,
    planVigente,
    planes,
    reload,
  };
};