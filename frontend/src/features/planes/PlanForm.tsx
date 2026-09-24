import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import {
  FiEdit3,
  FiSave,
  FiTool,
  FiXCircle,
} from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  SubmitButton,
  TextField,
} from "../../components/ui";
import { planSchema, type PlanFormValues } from "./validationSchema";
import type { PlanPoe } from "./types";
import { nextPlanId, hoy } from "./mockData";

interface PlanFormProps {
  modo?: "crear" | "modificar";
  plan?: PlanPoe;
  onCancelar?: () => void;
  onGuardado?: (plan: PlanPoe) => void;
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

  const defaultValues: PlanFormValues = {
    nombre_plan: plan?.nombre_plan ?? "",
    version: plan?.version ?? "",
    objetivo: plan?.objetivo ?? "",
    descripcion: plan?.descripcion ?? "",
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const planGuardado: PlanPoe = esModoCrear
      ? {
          id: nextPlanId(),
          nombre_plan: values.nombre_plan.trim(),
          version: values.version.trim(),
          estado: "borrador",
          fecha_alta: hoy(),
          objetivo: values.objetivo?.trim() || undefined,
          descripcion: values.descripcion?.trim() || undefined,
        }
      : {
          ...plan!,
          nombre_plan: values.nombre_plan.trim(),
          version: values.version.trim(),
          objetivo: values.objetivo?.trim() || undefined,
          descripcion: values.descripcion?.trim() || undefined,
        };
    setSuccess(true);
    onGuardado?.(planGuardado);
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
            defaultValue={defaultValues.nombre_plan}
            placeholder='Ej. Plan de Limpieza y Sanitización'
            error={errors.nombre_plan?.message}
            {...register("nombre_plan")}
          />
          <TextField
            label='Versión'
            defaultValue={defaultValues.version}
            placeholder='Ej. v1.2'
            error={errors.version?.message}
            {...register("version")}
          />
          <TextField
            label='Objetivo (Opcional)'
            defaultValue={defaultValues.objetivo}
            placeholder='Objetivo del plan de limpieza'
            error={errors.objetivo?.message}
            {...register("objetivo")}
          />
          <TextField
            label='Descripción / Observaciones (Opcional)'
            defaultValue={defaultValues.descripcion}
            placeholder='Breve descripción de esta versión del plan'
            error={errors.descripcion?.message}
            {...register("descripcion")}
          />

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