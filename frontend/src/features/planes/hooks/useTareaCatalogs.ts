import { useMemo } from "react";
import type {
  ElementoLimpiezaCatalogo,
  InsumoQuimicoCatalogo,
  OpcionRecurso,
  PlanCatalogs,
} from "../types";
import { getOrigenRecurso } from "../utils";

interface UseTareaCatalogsArgs {
  /** Catálogos globales cargados desde la API (personal, equipos, sectores, insumos, elementos) */
  catalogs: PlanCatalogs;
  /** Recursos ya filtrados por destino (los devuelve useRecursosTarea) */
  recursosInsumos: InsumoQuimicoCatalogo[];
  recursosElementos: ElementoLimpiezaCatalogo[];
  esModoModificar: boolean;
  esModoVer: boolean;
  tareaEquipoId?: number;
  tareaSectorId?: number;
}

/**
 * Deriva las opciones de los desplegables del formulario de tarea.
 *
 * - Equipos y sectores salen de los catálogos globales, filtrando por `activo`.
 *   Al editar/ver se conserva el equipo o sector actual aunque esté inactivo,
 *   para que el destino de la tarea siga siendo visible.
 * - Insumos y elementos salen de los recursos ya filtrados por destino
 *   (los entrega useRecursosTarea, que aplica herencia/aislamiento del backend),
 *   se deduplican por id y se les etiqueta el origen (Equipo/Sector/General).
 */
export const useTareaCatalogs = ({
  catalogs,
  recursosInsumos,
  recursosElementos,
  esModoModificar,
  esModoVer,
  tareaEquipoId,
  tareaSectorId,
}: UseTareaCatalogsArgs) => {
  const esEdicion = esModoModificar || esModoVer;

  const opcionesEquipos = useMemo(
    () =>
      catalogs.equipos
        .filter((e) => e.activo || (esEdicion && tareaEquipoId === e.id))
        .map((e) => ({
          label: `${e.nombre} (${
            e.sector?.nombre ?? "Sin sector"
          }${e.ubicacion ? " / " + e.ubicacion : ""})`,
          value: String(e.id),
        })),
    [catalogs.equipos, esEdicion, tareaEquipoId],
  );

  const opcionesSectores = useMemo(
    () =>
      catalogs.sectores
        .filter((s) => s.activo || (esEdicion && tareaSectorId === s.id))
        .map((s) => ({ label: s.nombre, value: String(s.id) })),
    [catalogs.sectores, esEdicion, tareaSectorId],
  );

  // Deduplicar por id: el backend puede devolver el mismo recurso por
  // herencia de sector y por asignación directa al equipo.
  const opcionesInsumos = useMemo<OpcionRecurso[]>(
    () =>
      Array.from(new Map(recursosInsumos.map((i) => [i.id, i])).values()).map(
        (i) => ({
          label: i.nombre,
          value: String(i.id),
          badge: getOrigenRecurso(i),
        }),
      ),
    [recursosInsumos],
  );

  const opcionesElementos = useMemo<OpcionRecurso[]>(
    () =>
      Array.from(
        new Map(recursosElementos.map((el) => [el.id, el])).values(),
      ).map((el) => ({
        label: el.nombre,
        value: String(el.id),
        badge: getOrigenRecurso(el),
      })),
    [recursosElementos],
  );

  return {
    opcionesEquipos,
    opcionesSectores,
    opcionesInsumos,
    opcionesElementos,
  };
};
