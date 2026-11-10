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

const defaultValues: LoteInsumoFormValues = {
  codigo_lote: "",
  fecha_vencimiento: "",
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
            error={errors.fecha_vencimiento?.message}
            {...register("fecha_vencimiento")}
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