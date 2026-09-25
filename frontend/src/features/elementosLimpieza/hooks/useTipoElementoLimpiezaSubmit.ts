import { useCallback, useState } from "react";
import type { TipoElementoLimpieza } from "../types";

interface UseTipoElementoLimpiezaSubmitOptions {
  onSuccess?: (tipoCreado: TipoElementoLimpieza) => void;
}

export const useTipoElementoLimpiezaSubmit = ({ onSuccess }: UseTipoElementoLimpiezaSubmitOptions = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const crear = useCallback(async (nombre: string, prefijo: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/tipos-elemento-limpieza/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, prefijo }),
      });

      if (!res.ok) {
        let bodyRes: any = null;
        try { bodyRes = await res.json(); } catch {}

        let mensajeError = "No se pudo crear el tipo.";
        if (bodyRes?.detail) {
          if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
          else if (Array.isArray(bodyRes.detail) && bodyRes.detail[0]?.msg) {
            mensajeError = bodyRes.detail[0].msg.replace(/^Value error,\s*/, "");
          }
          else if (typeof bodyRes.detail.code === "string") mensajeError = bodyRes.detail.code;
        }
        setError(mensajeError);
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