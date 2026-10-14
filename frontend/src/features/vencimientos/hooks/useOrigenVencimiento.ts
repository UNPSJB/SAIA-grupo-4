import { apiFetch } from "../../../features/auth/apiFetch";
import { useEffect, useState } from "react";
import { ORIGEN_VENCIMIENTOS, type FichaOrigen } from "../origenVencimientos";
import type { Vencimiento } from "../types";

/**
 * Ficha del registro de origen de una fila, con caché entre filas.
 *
 * El modal de detalle y el de renovar piden exactamente lo mismo, así que abrir
 * uno después del otro no vuelve a golpear el backend. La clave es el `id`
 * consolidado de la fila (`categoria:entidad_id`), que ya es único.
 *
 * `loading` se deriva de si la clave está resuelta, en vez de setearse dentro
 * del effect. Los setState quedan adentro de las callbacks de `fetch`, que es
 * donde React no marca el patrón como anti-efecto.
 */
export const useOrigenVencimiento = (vencimiento: Vencimiento | null) => {
  // La ficha se cachea por fila (`id`). Los errores NO se guardan como si fueran
  // una ficha: si una carga falla (p. ej. por red) y se vuelve a abrir el modal
  // para esa fila, se reintenta en vez de quedar pegado hasta recargar.
  const [fichas, setFichas] = useState<Record<string, FichaOrigen>>({});
  const [errores, setErrores] = useState<Record<string, true>>({});

  const id = vencimiento?.id ?? null;
  const entidadId = vencimiento?.entidad_id;
  const config = vencimiento
    ? ORIGEN_VENCIMIENTOS[vencimiento.categoria]
    : undefined;

  useEffect(() => {
    if (!id || !config || entidadId === undefined) return;
    // Ya tenemos la ficha de esta fila: no se vuelve a pedir.
    if (fichas[id]) return;

    let activo = true;

    apiFetch(config.endpoint(entidadId))
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((registro) => {
        if (!activo) return;
        const ficha = config.aFicha(registro);
        setFichas((f) => ({ ...f, [id]: ficha }));
      })
      .catch(() => {
        if (!activo) return;
        setErrores((e) => ({ ...e, [id]: true }));
      });

    return () => {
      activo = false;
    };
  }, [id, entidadId, config, fichas]);

  const ficha = id ? fichas[id] ?? null : null;
  const error =
    id && !ficha && errores[id]
      ? "No se pudo cargar el registro de origen."
      : "";

  // Solo hay algo que esperar si la fila pide ficha: sin config la categoría no
  // tiene módulo de origen asociado y el modal cae al modo solo-consolidado.
  const loading = !!id && !!config && !ficha && !errores[id];

  return { ficha, loading, error };
};
