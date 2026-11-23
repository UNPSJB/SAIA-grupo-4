import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Textarea } from "@chakra-ui/react";
import { FiSlash, FiXCircle } from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormGrid,
  FormGridFull,
  FormHeader,
  FormModal,
  SubmitButton,
  TextField,
} from "../../components/ui";
import {
  inhabilitarLoteSchema,
  type InhabilitarLoteFormValues,
} from "../insumo/validationSchema";
import { lotesApi } from "./hooks/lotesApi";
import type { Lote } from "./types";

interface RetenerLoteModalProps {
  lote: Lote;
  onCancelar: () => void;
  onRetenido: (lote: Lote) => void;
}

export const RetenerLoteModal = ({
  lote,
  onCancelar,
  onRetenido,
}: RetenerLoteModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    clearErrors,
  } = useForm<InhabilitarLoteFormValues>({
    resolver: zodResolver(inhabilitarLoteSchema),
    defaultValues: { motivo: "" },
    mode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    try {
      const loteActualizado = await lotesApi.retenerLote(lote.id, values.motivo);
      onRetenido(loteActualizado);
    } catch (err: any) {
      setError("root", {
        message: err?.message || "No se pudo retener el lote de producción.",
      });
    }
  });

  return (
    <FormModal open onClose={onCancelar}>
      <FormContainer modal>
        <FormHeader title="Retener Lote de Producción" icon={FiSlash} />
        <form onSubmit={onSubmit} noValidate>
          <FormGrid>
            <TextField
              label="Producto"
              value={lote.producto_nombre || `Producto #${lote.producto_id}`}
              disabled
            />
            <TextField label="Código de lote" value={lote.codigo_lote} disabled />

            <FormGridFull>
              <Field.Root invalid={!!errors.motivo}>
                <Field.Label>Motivo de retención</Field.Label>
                <Textarea
                  rows={4}
                  placeholder="Describa el desvío de calidad o motivo preventivo de cuarentena"
                  {...register("motivo")}
                />
                <Field.HelperText>Mínimo 10 caracteres.</Field.HelperText>
                <Field.ErrorText>{errors.motivo?.message}</Field.ErrorText>
              </Field.Root>
            </FormGridFull>

            <FormActions>
              <CancelButton
                text="Cancelar"
                icon={FiXCircle}
                onClick={onCancelar}
                colorPalette="red"
                variant="outline"
              />
              <SubmitButton
                text="Retener"
                icon={FiSlash}
                loading={isSubmitting}
                type="submit"
                colorPalette="red"
                disabled={!isValid}
              />
            </FormActions>

            {errors.root?.message && (
              <FormGridFull>
                <AlertMessage type="error" message={errors.root.message} />
              </FormGridFull>
            )}
          </FormGrid>
        </form>
      </FormContainer>
    </FormModal>
  );
};
