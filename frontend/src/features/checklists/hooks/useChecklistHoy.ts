import { BASE_URL } from "../../../config";

import { apiFetch } from "../../../features/auth/apiFetch";
import { useCallback, useEffect, useState } from "react";
import type { EjecucionTarea } from "../types";

const ENDPOINT_CHECKLISTS_HOY = `${BASE_URL}/checklists/hoy`;

// Lista las ejecuciones de tareas del día. El endpoint genera las ejecuciones
// faltantes y cierra las vencidas, así que se recarga después de cada completado.
export const useChecklistHoy = () => {
  const [ejecuciones, setEjecuciones] = useState<EjecucionTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    apiFetch(ENDPOINT_CHECKLISTS_HOY)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((json: EjecucionTarea[]) => {
        if (!active) return;
        setEjecuciones(json);
        setError("");
      })
      .catch(() => {
        if (active) {
          setEjecuciones([]);
          setError("No se pudo cargar el checklist del día.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { ejecuciones, loading, error, reload };
};
