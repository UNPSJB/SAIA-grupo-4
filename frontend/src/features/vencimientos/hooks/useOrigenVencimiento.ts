import { apiFetch } from "../../../features/auth/apiFetch";
import { useEffect, useState } from "react";
import { ORIGEN_VENCIMIENTOS, type FichaOrigen } from "../origenVencimientos";
import type { Vencimiento } from "../types";

/** Resultado de traer la ficha de una fila. Un solo estado para los dos casos:
 *  así no queda un error viejo pegado después de que la carga funcione. */
type Resultado = { ficha: FichaOrigen } | { error: true };

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
  const [resultados, setResultados] = useState<Record<string, Resultado>>({});

  const id = vencimiento?.id ?? null;
  const entidadId = vencimiento?.entidad_id;
  const config = vencimiento
    ? ORIGEN_VENCIMIENTOS[vencimiento.categoria]
    : undefined;

  useEffect(() => {
    if (!id || !config || entidadId === undefined) return;
    // Ya resuelta (con ficha o con error): no se vuelve a pedir.
    if (resultados[id]) return;

    let activo = true;

    apiFetch(config.endpoint(entidadId))
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((registro) => {
        if (!activo) return;
        const ficha = config.aFicha(registro);
        setResultados((r) => ({ ...r, [id]: { ficha } }));
      })
      .catch(() => {
        if (!activo) return;
        setResultados((r) => ({ ...r, [id]: { error: true } }));
      });

    return () => {
      activo = false;
    };
  }, [id, entidadId, config, resultados]);

  const resultado = id ? resultados[id] : undefined;
  const ficha = resultado && "ficha" in resultado ? resultado.ficha : null;
  const error =
    resultado && "error" in resultado
      ? "No se pudo cargar el registro de origen."
      : "";

  // Solo hay algo que esperar si la fila pide ficha: sin config la categoría no
  // tiene módulo de origen asociado y el modal cae al modo solo-consolidado.
  const loading = !!id && !!config && !resultado;

  return { ficha, loading, error };
};
