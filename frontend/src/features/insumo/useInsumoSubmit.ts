import { useCallback } from "react";

interface SubmitOptions<T> {
  endpoint: string; // URL base (ej: "http://127.0.0.1:8000/insumos/")
  method?: "POST" | "PUT"; // método HTTP
  id?: number | string; // solo para PUT
  body?: Record<string, unknown>; // override del body (ej: { disponible: true })
  validar?: boolean; // si es false, omite la validación del formulario
  onInactivo?: (insumo_id: number) => void; // cuando el insumo existe pero está inactivo (409)
  onSuccess?: (data?: T) => void;
}

/**
 * Hook que devuelve una función de envío genérica para los formularios de insumo.
 * Encapsula la validación, el llamado a la API y el manejo de estados comunes.
 */
export const useInsumoSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  validar = true,
  onInactivo,
  onSuccess,
}: SubmitOptions<any>) => {
  return useCallback(
    async (
      e: React.FormEvent<HTMLFormElement>,
      datos: {
        nombre: string;
        unidad_medida: string;
        categoria: string;
        descripcion: string;
      },
      setDatos: React.Dispatch<
        React.SetStateAction<{
          nombre: string;
          unidad_medida: string;
          categoria: string;
          descripcion: string;
        }>
      >,
      setErrores: React.Dispatch<
        React.SetStateAction<{
          nombre?: string;
          unidad_medida?: string;
          categoria?: string;
          descripcion?: string;
          otros?: string;
        }>
      >,
      setLoading: React.Dispatch<React.SetStateAction<boolean>>,
      setSuccess: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
      e.preventDefault();
      const nuevosErrores: {
        nombre?: string;
        unidad_medida?: string;
        categoria?: string;
        descripcion?: string;
        otros?: string;
      } = {};

      setSuccess(false);
      // ---- Validación (solo aplica al flujo de formulario) ----
      if (validar) {
        if (!datos.nombre.trim()) {
          nuevosErrores.nombre = "Por favor, ingrese un nombre valido";
        } else {
          const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,50}$/.test(
            datos.nombre,
          );
          if (!nombreValido) {
            nuevosErrores.nombre =
              "El nombre solo debe contener letras mayusculas o minusculas";
          }
        }
        if (!datos.unidad_medida.trim()) {
          nuevosErrores.unidad_medida =
            "Por favor, ingrese una unidad de medida";
        }
        if (!datos.categoria.trim()) {
          nuevosErrores.categoria = "Por favor, ingrese una categoria";
        }

        if (Object.keys(nuevosErrores).length > 0) {
          setErrores(nuevosErrores);
          return;
        }
      }

      // ---- Envío ----
      setLoading(true);
      try {
        const payload = body ?? {
          nombre: datos.nombre.toLocaleLowerCase(),
          unidad_medida: datos.unidad_medida,
          categoria: datos.categoria,
          descripcion: datos.descripcion,
        };

        const url = id ? `${endpoint}${id}/` : endpoint;
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          if (res.status === 409) {
            try {
              const bodyRes = await res.json();
              const insumoId = bodyRes?.detail?.insumo_id;
              if (typeof insumoId === "number") {
                onInactivo?.(insumoId);
                return;
              }
            } catch {
              // fallthrough: se trata como error genérico
            }
          }
          throw new Error(`Error ${res.status}`);
        }

        // ---- Éxito ----
        setDatos({ nombre: "", unidad_medida: "", categoria: "", descripcion: "" });
        setErrores({});
        setSuccess(true);
        onSuccess?.();
      } catch (err: any) {
        const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? "";
        let mensajeError = "Ocurrió un error inesperado";

        switch (errorCode) {
          case "400":
            mensajeError = "El insumo ya existe.";
            break;
          case "404":
            mensajeError = "Insumo no existe.";
            break;
          case "500":
            mensajeError = "Error interno del servidor.";
            break;
          default:
            mensajeError = `Error ${errorCode || "desconocido"}`;
        }
        nuevosErrores.otros = mensajeError;
        setErrores(nuevosErrores);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, method, id, body, validar, onInactivo, onSuccess],
  );
};
