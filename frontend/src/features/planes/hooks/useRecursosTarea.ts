import { useEffect, useState } from "react";
import type {
  DestinoTipo,
  ElementoLimpiezaCatalogo,
  InsumoQuimicoCatalogo,
} from "../types";
import { planesApi } from "./planApi";

type ModoForm = "crear" | "modificar" | "ver";

interface UseRecursosTareaArgs {
  destinoTipo: DestinoTipo | undefined;
  equipoId?: number | string;
  sectorId?: number | string;
  modo: ModoForm;
  insumosSeleccionados: number[];
  elementosSeleccionados: number[];
}

const aNumero = (valor: number | string | undefined) => {
  if (valor === undefined || valor === null || valor === "") return undefined;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const aIds = (serializado: string) =>
  serializado ? serializado.split(",").map(Number) : [];

const agregarFaltantes = async <T extends { id: number }>(
  idsSeleccionados: number[],
  cargados: T[],
  obtenerTodos: () => Promise<T[]>,
): Promise<T[]> => {
  const cargadosIds = cargados.map((r) => r.id);
  const faltantes = idsSeleccionados.filter((id) => !cargadosIds.includes(id));
  if (faltantes.length === 0) return [];
  const todos = await obtenerTodos();
  return todos.filter((r) => faltantes.includes(r.id));
};

export const useRecursosTarea = ({
  destinoTipo,
  equipoId,
  sectorId,
  modo,
  insumosSeleccionados,
  elementosSeleccionados,
}: UseRecursosTareaArgs) => {
  const [insumos, setInsumos] = useState<InsumoQuimicoCatalogo[]>([]);
  const [elementos, setElementos] =
    useState<ElementoLimpiezaCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const equipo = aNumero(equipoId);
  const sector = aNumero(sectorId);
  const esEdicion = modo === "modificar" || modo === "ver";

  // Se serializan para no disparar los efectos por una referencia nueva en cada render.
  const idsInsumos = insumosSeleccionados.join(",");
  const idsElementos = elementosSeleccionados.join(",");

  // El backend aplica las reglas de herencia (insumos) y aislamiento (elementos)
  // según el destino, así que acá no hay filtrado: solo se le pregunta por el destino.
  useEffect(() => {
    let active = true;

    (async () => {
      if (!destinoTipo || (equipo === undefined && sector === undefined)) {
        setInsumos([]);
        setElementos([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const esEquipo = destinoTipo === "equipo";
        const [insumosFiltrados, elementosFiltrados] = await Promise.all([
          esEquipo
            ? planesApi.obtenerInsumosPorEquipo(equipo!)
            : planesApi.obtenerInsumosPorSector(sector!),
          esEquipo
            ? planesApi.obtenerElementosPorEquipo(equipo!)
            : planesApi.obtenerElementosPorSector(sector!),
        ]);

        if (!active) return;
        setInsumos(insumosFiltrados);
        setElementos(elementosFiltrados);
      } catch (e) {
        if (!active) return;
        setInsumos([]);
        setElementos([]);
        setError(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los recursos del destino.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [destinoTipo, equipo, sector]);

  // Al editar, la tarea puede tener recursos ya asociados que la consulta por
  // destino no trae (por ejemplo, un elemento de sector en una tarea de equipo).
  // Se recuperan del catálogo completo para poder visualizarlos.
  useEffect(() => {
    const seleccionadosInsumos = aIds(idsInsumos);
    const seleccionadosElementos = aIds(idsElementos);
    if (!esEdicion) return;
    if (!seleccionadosInsumos.length && !seleccionadosElementos.length) return;

    let active = true;

    (async () => {
      try {
        const [insumosExtra, elementosExtra] = await Promise.all([
          agregarFaltantes(
            seleccionadosInsumos,
            insumos,
            planesApi.obtenerInsumosQuimicos,
          ),
          agregarFaltantes(
            seleccionadosElementos,
            elementos,
            planesApi.obtenerElementosLimpieza,
          ),
        ]);

        if (!active) return;
        if (insumosExtra.length) {
          setInsumos((prev) => [...prev, ...insumosExtra]);
        }
        if (elementosExtra.length) {
          setElementos((prev) => [...prev, ...elementosExtra]);
        }
      } catch {
        // Es un complemento: si falla no debe romper el formulario.
      }
    })();

    return () => {
      active = false;
    };
  }, [esEdicion, idsInsumos, idsElementos, insumos, elementos]);

  return { insumos, elementos, loading, error };
};
