import { BASE_URL } from "../../config";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Text, Textarea } from "@chakra-ui/react";
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
  TextField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
} from "../../components/ui";

type InhabilitarLoteModalProps = {
  lote: LoteInsumo;
  insumo: Insumo;
  onCancelar: () => void;
  onInhabilitado: (lote: LoteInsumo) => void;
};

const defaultValues: InhabilitarLoteFormValues = { motivo: "" };

export const InhabilitarLoteModal = ({
  lote,
  insumo,
  onCancelar,
  onInhabilitado,
}: InhabilitarLoteModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    clearErrors,
  } = useForm<InhabilitarLoteFormValues>({
    resolver: zodResolver(inhabilitarLoteSchema),
    defaultValues,
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
    <FormModal open onClose={onCancelar}>
      <FormContainer modal>
        <FormHeader title='Inhabilitar Lote' icon={FiSlash} />
        <form onSubmit={onSubmit} noValidate>
          <FormGrid>
            <TextField label='Insumo' value={insumo.nombre} disabled />
            <TextField
              label='Código de lote'
              value={lote.codigo_lote}
              disabled
            />

            <Field.Root invalid={!!errors.motivo} gridColumn='1 / -1'>
              <Field.Label>Motivo de inhabilitación</Field.Label>
              <Textarea
                rows={4}
                placeholder='Describa la falla de calidad o la contaminación detectada'
                {...register("motivo")}
              />
              <Field.HelperText>Mínimo 10 caracteres.</Field.HelperText>
              <Field.ErrorText>{errors.motivo?.message}</Field.ErrorText>
            </Field.Root>

            <Text fontSize='sm' color='red.600' gridColumn='1 / -1'>
              Esta acción no se puede deshacer: el lote dejará de estar
              disponible para nuevos registros de producción.
            </Text>

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
                colorPalette='gray'
                variant='outline'
              />
            </FormActions>

            {errors.root?.message && (
              <AlertMessage type='error' message={errors.root.message} />
            )}
          </FormGrid>
        </form>
      </FormContainer>
    </FormModal>
  );
};