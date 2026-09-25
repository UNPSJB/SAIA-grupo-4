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
  SelectField,
  SubmitButton,
  TextField,
} from "../../components/ui";
import {
  planSchema,
  type PlanFormInput,
  type PlanFormValues,
} from "./validationSchema";
import type { PlanPOES } from "./types";
import { usePlanCatalogs } from "./hooks/usePlanCatalogs";
import { planesApi } from "./hooks/planApi";

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

  const { catalogs, loading: cargandoCatalogos } = usePlanCatalogs();

  const defaultValues: PlanFormInput = {
    nombre: plan?.nombre ?? "",
    objetivo: plan?.objetivo ?? "",
    elaborado_por_id: plan?.elaborado_por_id ?? undefined,
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

  const personasActivas = catalogs.personas.filter((p) => p.activo);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    try {
      if (esModoCrear) {
        if (!values.elaborado_por_id) {
          setError("elaborado_por_id", {
            message: "Seleccioná quién elabora el plan",
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
            <SelectField
              label='Elaborado por'
              placeholder='Seleccione una persona'
              disabled={cargandoCatalogos}
              options={personasActivas.map((p) => ({
                label: `${p.nombre} ${p.apellido}`,
                value: String(p.id),
              }))}
              error={errors.elaborado_por_id?.message?.toString()}
              {...register("elaborado_por_id")}
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