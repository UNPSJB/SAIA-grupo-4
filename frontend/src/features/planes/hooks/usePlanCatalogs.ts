import { useEffect, useState } from "react";
import type { PlanCatalogs } from "../types";
import { planesApi } from "./planApi";

const CATALOGOS_VACIOS: PlanCatalogs = {
  personas: [],
  equipos: [],
  sectores: [],
  insumosQuimicos: [],
  elementosLimpieza: [],
};

export const usePlanCatalogs = () => {
  const [catalogs, setCatalogs] = useState<PlanCatalogs>(CATALOGOS_VACIOS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [personas, equipos, sectores, insumos, elementos] =
          await Promise.all([
            planesApi.obtenerPersonal(),
            planesApi.obtenerEquipos(),
            planesApi.obtenerSectores(),
            planesApi.obtenerInsumosQuimicos(),
            planesApi.obtenerElementosLimpieza(),
          ]);
        if (!active) return;
        setCatalogs({
          personas,
          equipos,
          sectores,
          insumosQuimicos: insumos,
          elementosLimpieza: elementos,
        });
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los catálogos.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { catalogs, loading, error };
};