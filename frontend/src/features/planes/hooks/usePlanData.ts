import { useEffect, useState } from "react";
import type { PlanPoe, TareaLimpieza } from "../types";
import { mockPlanes, tareasPorPlan } from "../mockData";

export const usePlanData = () => {
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState<PlanPoe[]>([]);
  const [tareasPorPlanData, setTareasPorPlanData] = useState<
    Record<number, TareaLimpieza[]>
  >({});
  const [planVigente, setPlanVigente] = useState<PlanPoe | null>(null);
  const [tareasVigentes, setTareasVigentes] = useState<TareaLimpieza[]>([]);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (!active) return;
      setPlanes(mockPlanes);
      setTareasPorPlanData(tareasPorPlan);
      const vigente =
        mockPlanes.find((p) => p.estado === "vigente") ?? null;
      setPlanVigente(vigente);
      setTareasVigentes(vigente ? tareasPorPlan[vigente.id] ?? [] : []);
      setLoading(false);
    }, 400);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  const getTareasDePlan = (planId: number) =>
    tareasPorPlanData[planId] ?? [];

  return { loading, planes, tareasPorPlan: tareasPorPlanData, planVigente, tareasVigentes, getTareasDePlan };
};