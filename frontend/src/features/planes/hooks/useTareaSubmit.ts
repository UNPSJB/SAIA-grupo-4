import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import type { TareaFormInput, TareaFormValues } from "../validationSchema";
import type { TareaPOES } from "../types";
import { planesApi, type TareaPOESCreatePayload } from "./planApi";
import { armarPayload } from "../utils/formTransformers";
import type { UseTareaFormStateReturn } from "./useTareaFormState";

interface UseTareaSubmitArgs {
  modo: "crear" | "modificar" | "ver";
  planId?: number;
  tarea?: TareaPOES;
  onGuardado?: (tarea: TareaPOES) => void;
  formMethods: ReturnType<
    typeof useForm<TareaFormInput, unknown, TareaFormValues>
  >;
  estadoRecursos: Pick<
    UseTareaFormStateReturn,
    | "consumos"
    | "diluciones"
    | "cantidades"
    | "setErroresConsumo"
    | "setErroresCantidad"
  >;
  setSuccess: Dispatch<SetStateAction<boolean>>;
}

/**
 * Hook que encapsula todo el flujo de guardado del formulario de tarea.
 *
 * React Hook Form + Zod ya valida el shape del formulario, pero los detalles por
 * recurso (consumo de insumo y cantidad de elemento) viven fuera del esquema,
 * así que acá se validan antes de armar el payload.
 */
export const useTareaSubmit = ({
  modo,
  planId,
  tarea,
  onGuardado,
  formMethods,
  estadoRecursos,
  setSuccess,
}: UseTareaSubmitArgs) => {
  const { handleSubmit, clearErrors, setError } = formMethods;

  const {
    consumos,
    diluciones,
    cantidades,
    setErroresConsumo,
    setErroresCantidad,
  } = estadoRecursos;

  /**
   * Valida los consumos: cada insumo seleccionado necesita una dosis numérica
   * mayor a 0. Los errores se marcan por insumo y además se levanta un error
   * general para que el usuario sepa dónde mirar.
   */
  const validarConsumos = (ids: number[]): string | undefined => {
    const errores: Record<string, string> = {};

    ids.forEach((id) => {
      const texto = (consumos[String(id)] ?? "").trim();
      const numero = Number(texto);
      if (!texto || !Number.isFinite(numero) || numero <= 0) {
        errores[String(id)] =
          "El consumo es obligatorio y debe ser un número mayor a 0.";
      }
    });

    if (Object.keys(errores).length === 0) {
      setErroresConsumo({});
      return undefined;
    }

    setErroresConsumo(errores);
    return "Falta indicar el consumo en los insumos químicos seleccionados.";
  };

  /**
   * Valida las cantidades: cada elemento seleccionado necesita un entero >= 1.
   * Si el usuario no tocó el campo se asume "1", que es el valor con el que
   * aparecen las cantidades recién marcadas.
   */
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
    return "Falta indicar la cantidad en los elementos de limpieza seleccionados.";
  };

  return handleSubmit(
    // Callback de éxito: el esquema de Zod ya validó los campos del formulario.
    async (values) => {
      clearErrors("root");

      const errorConsumos = validarConsumos(values.insumos_quimicos ?? []);
      if (errorConsumos) {
        setError("root", { type: "manual", message: errorConsumos });
        return;
      }

      const errorCantidades = validarCantidades(values.elementos_limpieza ?? []);
      if (errorCantidades) {
        setError("root", { type: "manual", message: errorCantidades });
        return;
      }

      try {
        const payload: TareaPOESCreatePayload = armarPayload(values, {
          consumos,
          diluciones,
          cantidades,
        });

        if (modo === "crear") {
          if (!planId) {
            setError("root", {
              message: "No se pudo determinar el plan de la tarea.",
            });
            return;
          }
          const creada = await planesApi.crearTarea(planId, payload);
          setSuccess(true);
          onGuardado?.(creada);
        } else if (tarea) {
          const actualizada = await planesApi.modificarTarea(tarea.id, payload);
          setSuccess(true);
          onGuardado?.(actualizada);
        }
      } catch (e) {
        setError("root", {
          message:
            e instanceof Error
              ? e.message
              : "Ocurrió un error al guardar la tarea.",
        });
      }
    },
    // Callback de error: el esquema de Zod rechazó el formulario.
    () => {
      setError("root", {
        type: "manual",
        message:
          "Hay campos incompletos o incorrectos. Por favor, revisá las secciones marcadas en rojo más arriba.",
      });
    },
  );
};
