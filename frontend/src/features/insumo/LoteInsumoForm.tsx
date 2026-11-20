import { BASE_URL } from "../../config";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useLoteInsumoSubmit } from "./hooks/useLoteInsumoSubmit";
import {
  loteInsumoSchema,
  type LoteInsumoFormValues,
} from "./validationSchema";
import type { Insumo, LoteInsumo } from "./types";
import {
  FormContainer,
  FormHeader,
  FormGrid,
  TextField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
} from "../../components/ui";
import { FiPackage, FiSave, FiXCircle } from "react-icons/fi";

type LoteInsumoFormProps = {
  insumo: Insumo;
  onCancelar?: () => void;
  onGuardado?: (lote: LoteInsumo) => void;
  enModal?: boolean;
};

const obtenerHoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const defaultValues: LoteInsumoFormValues = {
  codigo_lote: "",
  fecha_vencimiento: "",
  cantidad_inicial: "",
};

export const LoteInsumoForm = ({
  insumo,
  onCancelar,
  onGuardado,
  enModal = false,
}: LoteInsumoFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    clearErrors,
    reset,
  } = useForm<LoteInsumoFormValues>({
    resolver: zodResolver(loteInsumoSchema),
    defaultValues,
    mode: "onChange",
  });

  const [success, setSuccess] = useState(false);

  const { submit } = useLoteInsumoSubmit({
    endpoint: `${BASE_URL}/lotes-insumo/`,
    insumoId: insumo.id,
    onSuccess: (lote) => {
      setSuccess(true);
      onGuardado?.(lote);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(false);
    clearErrors("root");
    const res = await submit(values);
    if (res.status === "error") {
      setError("root", { message: res.message });
    } else if (res.status === "success") {
      reset(defaultValues);
    }
  });

  return (
    <FormContainer modal={enModal}>
      <FormHeader title='Registrar Lote' icon={FiPackage} />
      <form onSubmit={onSubmit} noValidate>
        <FormGrid>
          <TextField label='Insumo' value={insumo.nombre} disabled />
          <TextField
            label='Código de lote'
            placeholder='Ej. L-2026-001'
            error={errors.codigo_lote?.message}
            {...register("codigo_lote")}
          />
          <TextField
            label='Fecha de vencimiento'
            type='date'
            min={obtenerHoyLocal()}
            error={errors.fecha_vencimiento?.message}
            {...register("fecha_vencimiento")}
          />
          <TextField
            label={`Cantidad / Tamaño de lote (${insumo.unidad_medida?.simbolo || "u"})`}
            type='number'
            step='any'
            placeholder='Ej. 25'
            error={errors.cantidad_inicial?.message}
            {...register("cantidad_inicial")}
          />

          <FormActions>
            <SubmitButton
              text='Guardar'
              icon={FiSave}
              loading={isSubmitting}
              type='submit'
              colorPalette='green'
              disabled={!isValid}
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
              message='El lote ha sido registrado exitosamente!'
            />
          )}
        </FormGrid>
      </form>
    </FormContainer>
  );
};