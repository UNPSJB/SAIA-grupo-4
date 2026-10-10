import type { ReactNode } from "react";
import type { ElementoLimpieza } from "../elementosLimpieza/types";
import type { Equipo } from "../equipos/types";
import { BASE_URL } from "./utils";
import type { CategoriaVencimiento } from "./types";

/**
 * Registro crudo que devuelve el módulo de origen de una categoría.
 *
 * Es una unión porque el tablero no sabe de qué módulo viene la fila: cada
 * `aFicha` recibe lo que devolvió su endpoint y lo estrecha a su propio tipo.
 */
export type RegistroOrigen = ElementoLimpieza | Equipo;

/**
 * Ficha del registro de origen de un vencimiento, ya normalizada para mostrar.
 *
 * El tablero es una vista agregada: la fila consolidada trae 10 campos y nada
 * del registro de origen. Para el detalle y para renovar hay que ir a buscarlo,
 * y cada módulo lo expone distinto. Este tipo es el contrato intermedio para
 * que el tablero no tenga que saber de cada módulo.
 */
export type FichaOrigen = {
  /** Nombre legible de la entidad, con su código si tiene. */
  titulo: string;
  campos: Array<{ label: string; valor: ReactNode }>;
  /** Registro crudo, para el formulario de renovación. */
  registro?: RegistroOrigen;
};

export type ConfigOrigen = {
  /** Endpoint del registro de origen, para traer la ficha completa. */
  endpoint: (entidadId: number) => string;
  /** Nombre de la entidad, para los títulos. */
  etiqueta: string;
  aFicha: (registro: RegistroOrigen) => FichaOrigen;
};

const oSinAsignar = (v: string | undefined | null) => v ?? "Sin asignar";

/**
 * Configuración por categoría.
 *
 * Deliberadamente parcial: solo las categorías que ya tienen provider en el
 * backend (`backend/src/vencimientos/providers.py`) llegan a la lista, así que
 * las que no están acá nunca se consultan. Sumar una entrada es todo lo que
 * hace falta: el botón de renovar, la ficha del detalle y los tests ya
 * consultan todo por `categoria`.
 */
export const ORIGEN_VENCIMIENTOS: Partial<
  Record<CategoriaVencimiento, ConfigOrigen>
> = {
  elemento_limpieza: {
    endpoint: (entidadId) => `${BASE_URL}/elementos-limpieza/${entidadId}`,
    etiqueta: "Elementos de limpieza",
    aFicha: (registro) => {
      const r = registro as ElementoLimpieza;
      return {
        titulo: `${r.codigo} — ${r.nombre}`,
        campos: [
          { label: "Código", valor: r.codigo },
          { label: "Nombre", valor: r.nombre },
          { label: "Tipo", valor: r.tipo?.nombre ?? "—" },
          { label: "Sector", valor: oSinAsignar(r.sector?.nombre) },
          { label: "Equipo", valor: oSinAsignar(r.equipo?.nombre) },
          {
            label: "Frecuencia de recambio",
            valor: r.frecuencia_recambio_dias
              ? `${r.frecuencia_recambio_dias} días`
              : "Sin frecuencia",
          },
        ],
        registro: r,
      };
    },
  },
  equipo: {
    endpoint: (entidadId) => `${BASE_URL}/equipos/${entidadId}`,
    etiqueta: "Equipos",
    aFicha: (registro) => {
      const r = registro as Equipo;
      return {
        titulo: `${r.nombre} (${r.marca} - ${r.numero_serie})`,
        campos: [
          { label: "Nombre", valor: r.nombre },
          { label: "Marca", valor: r.marca },
          { label: "Número de serie", valor: r.numero_serie },
          { label: "Categoría", valor: r.categoria },
          { label: "Sector", valor: oSinAsignar(r.sector?.nombre) },
          { label: "Ubicación", valor: oSinAsignar(r.ubicacion) },
          {
            label: "Frecuencia de calibración",
            valor: r.frecuencia_calibracion_dias
              ? `${r.frecuencia_calibracion_dias} días`
              : "Sin frecuencia",
          },
          {
            label: "Última calibración",
            valor: r.fecha_ultima_calibracion ?? "—",
          },
        ],
        registro: r,
      };
    },
  },
};

/** Si la categoría tiene ficha de origen para mostrar en el detalle. */
export const tieneOrigen = (categoria: CategoriaVencimiento) =>
  categoria in ORIGEN_VENCIMIENTOS;

/** Nombre de la entidad de origen, para títulos. */
export const etiquetaOrigen = (categoria: CategoriaVencimiento) =>
  ORIGEN_VENCIMIENTOS[categoria]?.etiqueta ?? categoria;