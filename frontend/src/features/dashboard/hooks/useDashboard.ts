import { useState, useEffect, useCallback } from "react";
import { getDashboard } from "./dashboardApi";
import type { DashboardResponse } from "../types";

interface UseDashboardParams {
  desde?: string;
  hasta?: string;
}

export function useDashboard(params: UseDashboardParams = {}) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getDashboard(params);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [params.desde, params.hasta]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboard,
  };
}
