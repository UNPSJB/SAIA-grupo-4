import { useState, useEffect, useMemo, useCallback } from "react";
import { BASE_URL } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type { DocumentoDetalle } from "../types";

interface UseDocumentoDetalleOptions {
  documentoId?: number;
  errorMessage?: string;
}

// Detalle de UN documento (con todas sus versiones) para las vistas de
// historial y visor. Mismo patrón de fetch/estado que useListadoData.
export const useDocumentoDetalle = ({
  documentoId,
  errorMessage = "No se pudo cargar el documento.",
}: UseDocumentoDetalleOptions = {}) => {
  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);
  const [loading, setLoading] = useState(!!documentoId);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Un id ausente o no numérico (p. ej. `/documentos/abc` -> NaN) no se pide al
  // backend y se reporta como error, en vez de dejar la vista vacía sin aviso.
  const idValido =
    typeof documentoId === "number" &&
    Number.isInteger(documentoId) &&
    documentoId > 0;

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!idValido) return;
    let active = true;
    // Todos los setState viven en callbacks asíncronos (patrón de useListadoData)
    apiFetch(`${BASE_URL}/documentos/${documentoId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        return res.json();
      })
      .then((json: DocumentoDetalle) => {
        if (active) {
          setDocumento(json);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(errorMessage);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [documentoId, reloadKey, errorMessage, idValido]);

  // Versiones de la más reciente a la más antigua (el backend no garantiza orden)
  const versiones = useMemo(
    () =>
      [...(documento?.versiones ?? [])].sort((a, b) =>
        b.fecha_subida.localeCompare(a.fecha_subida),
      ),
    [documento],
  );

  // Si el id venía informado pero no es válido, se muestra el error sin intentar
  // la petición; si no se informó id, se mantiene el estado neutro.
  const idInvalido = documentoId !== undefined && !idValido;

  return {
    documento,
    versiones,
    loading: idValido ? loading : false,
    error: idInvalido ? errorMessage : error,
    reload,
  };
};
