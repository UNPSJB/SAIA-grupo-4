import { BASE_URL } from "../../config";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Textarea } from "@chakra-ui/react";
import { FiSlash, FiXCircle } from "react-icons/fi";

import { useLoteInsumoInhabilitar } from "./hooks/useLoteInsumoInhabilitar";
import {
  inhabilitarLoteSchema,
  type InhabilitarLoteFormValues,
} from "./validationSchema";
import type { Insumo, LoteInsumo } from "./types";
import {
  FormModal,
  FormContainer,
  FormHeader,
  FormGrid,
  FormGridFull,
  TextField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
} from "../../components/ui";

type InhabilitarLoteFormProps = {
  lote: LoteInsumo;
  insumoNombre: string;
  titulo?: string;
  motivoInicial?: string;
  onCancelar: () => void;
  onInhabilitado: (lote: LoteInsumo) => void;
};

export const InhabilitarLoteForm = ({
  lote,
  insumoNombre,
  titulo = "Inhabilitar Lote",
  motivoInicial = "",
  onCancelar,
  onInhabilitado,
}: InhabilitarLoteFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    clearErrors,
  } = useForm<InhabilitarLoteFormValues>({
    resolver: zodResolver(inhabilitarLoteSchema),
    defaultValues: { motivo: motivoInicial },
    mode: "onChange",
  });

  const { submit } = useLoteInsumoInhabilitar({
    endpoint: `${BASE_URL}/lotes-insumo/`,
    loteId: lote.id,
    onSuccess: onInhabilitado,
  });

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const res = await submit(values);
    if (res.status === "error") {
      setError("root", { message: res.message });
    }
  });

  return (
    <FormContainer modal>
      <FormHeader title={titulo} icon={FiSlash} />
      <form onSubmit={onSubmit} noValidate>
        <FormGrid>
          <TextField label='Insumo' value={insumoNombre} disabled />
          <TextField
            label='Código de lote'
            value={lote.codigo_lote}
            disabled
          />

          <FormGridFull>
            <Field.Root invalid={!!errors.motivo}>
              <Field.Label>Motivo de inhabilitación</Field.Label>
              <Textarea
                rows={4}
                placeholder='Describa la falla de calidad o la contaminación detectada'
                {...register("motivo")}
              />
              <Field.HelperText>Mínimo 10 caracteres.</Field.HelperText>
              <Field.ErrorText>{errors.motivo?.message}</Field.ErrorText>
            </Field.Root>
          </FormGridFull>

          <FormActions>
            <SubmitButton
              text='Inhabilitar'
              icon={FiSlash}
              loading={isSubmitting}
              type='submit'
              colorPalette='red'
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
            <FormGridFull>
              <AlertMessage type='error' message={errors.root.message} />
            </FormGridFull>
          )}
        </FormGrid>
      </form>
    </FormContainer>
  );
};

type InhabilitarLoteModalProps = {
  lote: LoteInsumo;
  insumo: Insumo;
  onCancelar: () => void;
  onInhabilitado: (lote: LoteInsumo) => void;
};

export const InhabilitarLoteModal = ({
  lote,
  insumo,
  onCancelar,
  onInhabilitado,
}: InhabilitarLoteModalProps) => (
  <FormModal open onClose={onCancelar}>
    <InhabilitarLoteForm
      lote={lote}
      insumoNombre={insumo.nombre}
      onCancelar={onCancelar}
      onInhabilitado={onInhabilitado}
    />
  </FormModal>
);