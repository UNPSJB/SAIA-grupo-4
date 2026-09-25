import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { FiEdit3, FiSave, FiTool, FiXCircle } from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  SubmitButton,
  TextField,
} from "../../components/ui";
import {
  planSchema,
  type PlanFormInput,
  type PlanFormValues,
} from "./validationSchema";
import type { PlanPOES } from "./types";
import { planesApi } from "./hooks/planApi";
import { useAuth } from "../auth/useAuth";

interface PlanFormProps {
  modo?: "crear" | "modificar";
  plan?: PlanPOES;
  onCancelar?: () => void;
  onGuardado?: (plan: PlanPOES) => void;
  enModal?: boolean;
}

export const PlanForm = ({
  modo = "modificar",
  plan,
  onCancelar,
  onGuardado,
  enModal = false,
}: PlanFormProps) => {
  const esModoCrear = modo === "crear";

  const { usuario } = useAuth();

  const defaultValues: PlanFormInput = {
    nombre: plan?.nombre ?? "",
    objetivo: plan?.objetivo ?? "",
    // En modo crear "Elaborado por" no se elige: siempre es la persona logueada.
    elaborado_por_id: esModoCrear ? usuario?.personaId : undefined,
  };

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormInput, unknown, PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    try {
      if (esModoCrear) {
        if (!values.elaborado_por_id) {
          setError("elaborado_por_id", {
            message: "No se pudo determinar quién elabora el plan",
          });
          return;
        }
        const creado = await planesApi.crearPlan({
          nombre: values.nombre.trim(),
          objetivo: values.objetivo?.trim() || undefined,
          elaborado_por_id: values.elaborado_por_id,
        });
        setSuccess(true);
        onGuardado?.(creado);
      } else {
        if (!plan) return;
        const modificado = await planesApi.modificarPlan(plan.id, {
          nombre: values.nombre.trim(),
          objetivo: values.objetivo?.trim() || undefined,
        });
        setSuccess(true);
        onGuardado?.(modificado);
      }
    } catch (e) {
      setError("root", {
        message:
          e instanceof Error ? e.message : "Ocurrió un error al guardar el plan.",
      });
    }
  });

  return (
    <FormContainer modal={enModal}>
      <FormHeader
        title={esModoCrear ? "Nuevo Plan" : "Modificar Plan"}
        icon={esModoCrear ? FiTool : FiEdit3}
      />
      <form onSubmit={onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label='Nombre del Plan'
            defaultValue={defaultValues.nombre}
            placeholder='Ej. Plan de Limpieza y Sanitización'
            error={errors.nombre?.message}
            {...register("nombre")}
          />
          <TextField
            label='Objetivo (Opcional)'
            defaultValue={defaultValues.objetivo}
            placeholder='Objetivo del plan de limpieza'
            error={errors.objetivo?.message}
            {...register("objetivo")}
          />
          {esModoCrear && (
            <TextField
              label='Elaborado por'
              value={
                usuario
                  ? `${usuario.nombre} ${usuario.apellido}`
                  : "Sin asignar"
              }
              disabled
            />
          )}

          <FormActions>
            <SubmitButton
              text={esModoCrear ? "Guardar Plan" : "Guardar"}
              icon={FiSave}
              loading={isSubmitting}
              type='submit'
              colorPalette='green'
            />
            <CancelButton
              text='Cancelar'
              icon={FiXCircle}
              onClick={onCancelar}
              colorPalette='red'
              variant='outline'
            />
          </FormActions>

          {errors.root?.message && (
            <AlertMessage type='error' message={errors.root.message} />
          )}
          {success && (
            <AlertMessage
              type='success'
              message={
                esModoCrear
                  ? "Plan creado exitosamente."
                  : "Plan modificado exitosamente."
              }
            />
          )}
        </VStack>
      </form>
    </FormContainer>
  );
};