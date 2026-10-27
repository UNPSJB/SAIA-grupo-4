import { useEffect, useMemo, useState } from "react";
import type { CheckboxGroupOption } from "../../../components/ui";
import type { Equipo } from "../../equipos/types";
import type { Insumo } from "../../insumo/types";
import type { PasoReceta } from "../types";
import { recetasApi } from "./recetaApi";

interface UsePasoCatalogsArgs {
  modo: "crear" | "modificar" | "ver";
  paso?: PasoReceta;
}

/**
 * Carga en paralelo los catálogos de insumos (/insumos/) y equipos (/equipos/)
 * y construye las opciones para los CheckboxGroupField junto con el mapa de
 * unidades de medida por insumo.
 */
export const usePasoCatalogs = ({ modo, paso }: UsePasoCatalogsArgs) => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const esEdicion = modo === "modificar" || modo === "ver";

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [insumosData, equiposData] = await Promise.all([
          recetasApi.obtenerInsumos(),
          recetasApi.obtenerEquipos(),
        ]);
        if (!active) return;
        setInsumos(insumosData);
        setEquipos(equiposData);
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los catálogos de insumos y equipos.",
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

  const idsInsumosDelPaso = useMemo(
    () => new Set((paso?.insumos ?? []).map((i) => i.insumo_id)),
    [paso],
  );

  const idsEquiposDelPaso = useMemo(
    () => new Set((paso?.equipos ?? []).map((e) => e.equipo_id)),
    [paso],
  );

  const opcionesInsumos = useMemo<CheckboxGroupOption[]>(() => {
    const filtrados = insumos.filter(
      (i) => i.disponible || (esEdicion && idsInsumosDelPaso.has(i.id)),
    );

    const opciones: CheckboxGroupOption[] = filtrados.map((i) => ({
      label: i.nombre,
      value: String(i.id),
    }));

    // Respaldo por si algún insumo asociado al paso no vino en el catálogo general
    if (esEdicion && paso?.insumos) {
      const vistos = new Set(filtrados.map((i) => i.id));
      paso.insumos.forEach((pi) => {
        if (!vistos.has(pi.insumo_id)) {
          opciones.push({
            label: pi.insumo?.nombre ?? `Insumo #${pi.insumo_id}`,
            value: String(pi.insumo_id),
          });
        }
      });
    }

    return opciones;
  }, [insumos, esEdicion, idsInsumosDelPaso, paso]);

  const unidadesPorInsumo = useMemo<Record<number, string>>(() => {
    const mapa: Record<number, string> = {};
    insumos.forEach((i) => {
      mapa[i.id] =
        i.unidad_medida?.simbolo || i.unidad_medida?.nombre || "";
    });
    if (paso?.insumos) {
      paso.insumos.forEach((pi) => {
        if (!mapa[pi.insumo_id] && pi.insumo?.unidad_medida) {
          mapa[pi.insumo_id] = pi.insumo.unidad_medida;
        }
      });
    }
    return mapa;
  }, [insumos, paso]);

  const opcionesEquipos = useMemo<CheckboxGroupOption[]>(() => {
    const filtrados = equipos.filter(
      (e) => e.activo || (esEdicion && idsEquiposDelPaso.has(e.id)),
    );

    const opciones: CheckboxGroupOption[] = filtrados.map((e) => ({
      label: e.nombre,
      value: String(e.id),
    }));

    if (esEdicion && paso?.equipos) {
      const vistos = new Set(filtrados.map((e) => e.id));
      paso.equipos.forEach((pe) => {
        if (!vistos.has(pe.equipo_id)) {
          opciones.push({
            label: pe.equipo?.nombre ?? `Equipo #${pe.equipo_id}`,
            value: String(pe.equipo_id),
          });
        }
      });
    }

    return opciones;
  }, [equipos, esEdicion, idsEquiposDelPaso, paso]);

  return {
    opcionesInsumos,
    opcionesEquipos,
    unidadesPorInsumo,
    loading,
    error,
  };
};
