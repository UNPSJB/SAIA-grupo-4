import { useState, useEffect, useMemo, useCallback } from "react";
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

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!documentoId) return;
    let active = true;
    // Todos los setState viven en callbacks asíncronos (patrón de useListadoData)
    fetch(`http://127.0.0.1:8000/documentos/${documentoId}`)
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
  }, [documentoId, reloadKey, errorMessage]);

  // Versiones de la más reciente a la más antigua (el backend no garantiza orden)
  const versiones = useMemo(
    () =>
      [...(documento?.versiones ?? [])].sort((a, b) =>
        b.fecha_subida.localeCompare(a.fecha_subida),
      ),
    [documento],
  );

  return { documento, versiones, loading, error, reload };
};
