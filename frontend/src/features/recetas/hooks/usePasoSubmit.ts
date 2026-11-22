import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import type {
  PasoRecetaFormInput,
  PasoRecetaFormValues,
} from "../validationSchema";
import type { PasoReceta, PasoRecetaCreatePayload } from "../types";
import { recetasApi } from "./recetaApi";
import type { UsePasoFormStateReturn } from "./usePasoFormState";
import {
  convertirEntreUnidades,
  type InfoUnidadInsumo,
} from "../utils/unidadesPaso";

interface UsePasoSubmitArgs {
  modo: "crear" | "modificar" | "ver";
  recetaId?: number;
  paso?: PasoReceta;
  pasosExistentes?: PasoReceta[];
  onGuardado?: (paso: PasoReceta) => void;
  formMethods: ReturnType<
    typeof useForm<PasoRecetaFormInput, unknown, PasoRecetaFormValues>
  >;
  estadoRecursos: Pick<
    UsePasoFormStateReturn,
    | "consumos"
    | "unidadesSeleccionadas"
    | "cantidades"
    | "setErroresConsumo"
    | "setErroresCantidad"
  >;
  infoUnidadesPorInsumo?: Record<number, InfoUnidadInsumo>;
  setSuccess: Dispatch<SetStateAction<boolean>>;
  /** Avisa qué campos fallaron para que el formulario pueda saltar al paso correcto. */
  onValidationError?: (campos: string[]) => void;
}

/**
 * Encapsula la validación y envío del formulario de PasoReceta.
 * Combina la validación estructural de Zod con la validación de los inputs
 * dinámicos de insumos (cantidad_consumo_estimada > 0) y equipos (cantidad >= 1).
 */
export const MENSAJE_ERROR_CAMPOS =
  "Hay campos incompletos o incorrectos. Por favor, revisá las secciones marcadas en rojo más arriba.";

export const usePasoSubmit = ({
  modo,
  recetaId,
  paso,
  pasosExistentes,
  onGuardado,
  formMethods,
  estadoRecursos,
  infoUnidadesPorInsumo,
  setSuccess,
  onValidationError,
}: UsePasoSubmitArgs) => {
  const { handleSubmit, clearErrors, setError } = formMethods;
  const {
    consumos,
    unidadesSeleccionadas,
    cantidades,
    setErroresConsumo,
    setErroresCantidad,
  } = estadoRecursos;

  const validarConsumos = (ids: number[]): string | undefined => {
    const errores: Record<string, string> = {};

    ids.forEach((id) => {
      const texto = (consumos[String(id)] ?? "").trim().replace(",", ".");
      const numero = Number(texto);
      if (!texto || !Number.isFinite(numero) || numero <= 0) {
        errores[String(id)] =
          "El consumo estimado es obligatorio y debe ser un número mayor a 0.";
      }
    });

    if (Object.keys(errores).length === 0) {
      setErroresConsumo({});
      return undefined;
    }

    setErroresConsumo(errores);
    return "Falta indicar el consumo estimado en los insumos seleccionados.";
  };

  const validarCantidades = (ids: number[]): string | undefined => {
    const errores: Record<string, string> = {};

    ids.forEach((id) => {
      const texto = (cantidades[String(id)] ?? "1").trim();
      const numero = Number(texto);
      if (!texto || !Number.isInteger(numero) || numero < 1) {
        errores[String(id)] =
          "La cantidad es obligatoria y debe ser un número entero mayor o igual a 1.";
      }
    });

    if (Object.keys(errores).length === 0) {
      setErroresCantidad({});
      return undefined;
    }

    setErroresCantidad(errores);
    return "Falta indicar una cantidad válida en los equipos seleccionados.";
  };

  return handleSubmit(
    async (values) => {
      clearErrors("root");

      const numeroOrden = Number(values.numero_orden);
      const pasoDuplicado = pasosExistentes?.some((p) => {
        if (modo === "modificar" && paso?.id) {
          return p.id !== paso.id && p.numero_orden === numeroOrden;
        }
        return p.numero_orden === numeroOrden;
      });

      if (pasoDuplicado) {
        setError("numero_orden", {
          type: "manual",
          message: `Ya existe un paso con el número de orden ${numeroOrden} en esta receta.`,
        });
        setError("root", {
          type: "manual",
          message: MENSAJE_ERROR_CAMPOS,
        });
        onValidationError?.(["numero_orden"]);
        return;
      }

      const errorConsumos = validarConsumos(values.insumos ?? []);
      if (errorConsumos) {
        setError("root", { type: "manual", message: MENSAJE_ERROR_CAMPOS });
        onValidationError?.(["insumos"]);
        return;
      }

      const errorCantidades = validarCantidades(values.equipos ?? []);
      if (errorCantidades) {
        setError("root", { type: "manual", message: MENSAJE_ERROR_CAMPOS });
        onValidationError?.(["equipos"]);
        return;
      }

      const payload: PasoRecetaCreatePayload = {
        numero_orden: values.numero_orden,
        titulo: values.titulo.trim(),
        instrucciones: values.instrucciones.trim(),
        insumos: (values.insumos ?? []).map((id) => {
          const valorIngresado = Number(
            (consumos[String(id)] ?? "").trim().replace(",", "."),
          );
          const info = infoUnidadesPorInsumo?.[id];
          const unidadElegida =
            unidadesSeleccionadas?.[String(id)] ?? info?.unidadDefault;
          const cantidadBase =
            info && unidadElegida
              ? convertirEntreUnidades(
                  valorIngresado,
                  unidadElegida,
                  info.simboloBase,
                )
              : valorIngresado;

          return {
            insumo_id: id,
            cantidad_consumo_estimada: cantidadBase,
          };
        }),
        equipos: (values.equipos ?? []).map((id) => ({
          equipo_id: id,
          cantidad: Math.max(
            1,
            Number.parseInt((cantidades[String(id)] ?? "1").trim(), 10) || 1,
          ),
        })),
      };

      try {
        if (modo === "crear") {
          if (!recetaId) {
            setError("root", {
              message: "No se pudo determinar la receta del paso.",
            });
            return;
          }
          const creado = await recetasApi.agregarPaso(recetaId, payload);
          setSuccess(true);
          onGuardado?.(creado);
        } else if (paso) {
          const actualizado = await recetasApi.modificarPaso(paso.id, payload);
          setSuccess(true);
          onGuardado?.(actualizado);
        }
      } catch (e) {
        const mensaje =
          e instanceof Error
            ? e.message
            : "Ocurrió un error al guardar el paso de la receta.";
        if (
          mensaje.toLowerCase().includes("número de orden") ||
          mensaje.toLowerCase().includes("numero de orden") ||
          mensaje.toLowerCase().includes("numero_orden")
        ) {
          setError("numero_orden", {
            type: "manual",
            message: mensaje,
          });
          setError("root", {
            type: "manual",
            message: MENSAJE_ERROR_CAMPOS,
          });
          onValidationError?.(["numero_orden"]);
        } else {
          setError("root", {
            message: mensaje,
          });
        }
      }
    },
    (formErrors) => {
      onValidationError?.(Object.keys(formErrors));
      setError("root", {
        type: "manual",
        message: MENSAJE_ERROR_CAMPOS,
      });
    },
  );
};
