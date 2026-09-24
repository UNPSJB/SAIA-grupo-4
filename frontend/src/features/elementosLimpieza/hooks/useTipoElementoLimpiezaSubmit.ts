import { useCallback, useState } from "react";
import type { TipoElementoLimpieza } from "../types";

interface UseTipoElementoLimpiezaSubmitOptions {
  onSuccess?: (tipoCreado: TipoElementoLimpieza) => void;
}

export const useTipoElementoLimpiezaSubmit = ({ onSuccess }: UseTipoElementoLimpiezaSubmitOptions = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const crear = useCallback(async (nombre: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/tipos-elemento-limpieza/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });

      if (!res.ok) {
        let bodyRes: any = null;
        try { bodyRes = await res.json(); } catch {}
        setError(typeof bodyRes?.detail === "string" ? bodyRes.detail : "No se pudo crear el tipo.");
        return null;
      }

      const nuevoTipo: TipoElementoLimpieza = await res.json();
      onSuccess?.(nuevoTipo);
      return nuevoTipo;
    } catch {
      setError("Ocurrió un error de red al crear el tipo.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess]);

  return { crear, isSubmitting, error };
};