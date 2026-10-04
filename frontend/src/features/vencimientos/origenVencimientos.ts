import type { ReactNode } from "react";
import type { ElementoLimpieza } from "../elementosLimpieza/types";
import { BASE_URL } from "./utils";
import type { CategoriaVencimiento } from "./types";

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
  registro?: ElementoLimpieza;
};

export type ConfigOrigen = {
  /** Endpoint del registro de origen, para traer la ficha completa. */
  endpoint: (entidadId: number) => string;
  /** Nombre de la entidad, para los títulos. */
  etiqueta: string;
  aFicha: (registro: ElementoLimpieza) => FichaOrigen;
};

const oSinAsignar = (v: string | undefined | null) => v ?? "Sin asignar";

/**
 * Configuración por categoría.
 *
 * Deliberadamente parcial: solo `elemento_limpieza` tiene provider en el
 * backend (`backend/src/vencimientos/providers.py`), así que las otras tres no
 * llegan a la lista. Cuando entren E3/E4/E5 alcanza con agregar la entrada
 * acá: el botón de renovar, la ficha del detalle y los tests ya consultan todo
 * por `categoria`.
 */
export const ORIGEN_VENCIMIENTOS: Partial<
  Record<CategoriaVencimiento, ConfigOrigen>
> = {
  elemento_limpieza: {
    endpoint: (entidadId) => `${BASE_URL}/elementos-limpieza/${entidadId}`,
    etiqueta: "Elementos de limpieza",
    aFicha: (registro) => ({
      titulo: `${registro.codigo} — ${registro.nombre}`,
      campos: [
        { label: "Código", valor: registro.codigo },
        { label: "Nombre", valor: registro.nombre },
        { label: "Tipo", valor: registro.tipo?.nombre ?? "—" },
        { label: "Sector", valor: oSinAsignar(registro.sector?.nombre) },
        { label: "Equipo", valor: oSinAsignar(registro.equipo?.nombre) },
        {
          label: "Frecuencia de recambio",
          valor: registro.frecuencia_recambio_dias
            ? `${registro.frecuencia_recambio_dias} días`
            : "Sin frecuencia",
        },
      ],
      registro,
    }),
  },
};

/** Si la categoría tiene ficha de origen para mostrar en el detalle. */
export const tieneOrigen = (categoria: CategoriaVencimiento) =>
  categoria in ORIGEN_VENCIMIENTOS;

/** Nombre de la entidad de origen, para títulos. */
export const etiquetaOrigen = (categoria: CategoriaVencimiento) =>
  ORIGEN_VENCIMIENTOS[categoria]?.etiqueta ?? categoria;