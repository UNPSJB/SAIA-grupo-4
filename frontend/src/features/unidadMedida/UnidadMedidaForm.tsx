import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { useUnidadMedidaSubmit } from "./hooks/useUnidadMedidaSubmit";
import {
  unidadMedidaSchema,
  type UnidadMedidaFormValues,
} from "./validationSchema";
import type { UnidadMedida } from "./types";
import {
  FormContainer,
  FormHeader,
  TextField,
  SelectField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
  AlertConfirm,
} from "../../components/ui";
import { FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";
import { FaRuler } from "react-icons/fa";

const TIPOS_MAGNITUD = [
  { label: "Masa", value: "masa" },
  { label: "Volumen", value: "volumen" },
  { label: "Temperatura", value: "temperatura" },
  { label: "Tiempo", value: "tiempo" },
  { label: "Longitud", value: "longitud" },
  { label: "Cantidad", value: "cantidad" },
  { label: "Concentracion", value: "concentracion" },
];

type UnidadMedidaFormProps = {
  modo: "crear" | "modificar" | "ver";
  unidad?: UnidadMedida;
  onCancelar?: () => void;
  onGuardado?: (unidad: UnidadMedida) => void;
};

export const UnidadMedidaForm = ({
  modo,
  unidad,
  onCancelar,
  onGuardado,
}: UnidadMedidaFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const defaultValues: UnidadMedidaFormValues =
    esModoModificar || esModoVer
      ? {
          nombre: unidad!.nombre,
          simbolo: unidad!.simbolo,
          tipo_magnitud: unidad!.tipo_magnitud,
        }
      : { nombre: "", simbolo: "", tipo_magnitud: "" };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<UnidadMedidaFormValues>({
    resolver: zodResolver(unidadMedidaSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);
  const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
  const [unidadInactivaId, setUnidadInactivaId] = useState<number | null>(null);
  const [errorConfirmar, setErrorConfirmar] = useState("");
  const [nombreEnviado, setNombreEnviado] = useState("");

  const { submit } = useUnidadMedidaSubmit({
    endpoint: "http://127.0.0.1:8000/unidades-de-medida/",
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? unidad!.id : undefined,
    onInactivo: (unidadId) => {
      if (!esModoCrear) return;
      setUnidadInactivaId(unidadId);
      setErrorConfirmar("");
      setConfirmAltaAbierto(true);
    },
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(unidad!);
    },
  });

  const reactivar = useUnidadMedidaSubmit({
    endpoint: "http://127.0.0.1:8000/unidades-de-medida/",
    method: "PUT",
    id: unidadInactivaId ?? undefined,
    body: { disponible: true },
    onSuccess: () => {
      setConfirmAltaAbierto(false);
      setUnidadInactivaId(null);
      onGuardado?.(unidad!);
    },
  });

  const confirmarAlta = async () => {
    if (unidadInactivaId === null) return;
    setErrorConfirmar("");
    const res = await reactivar.submit();
    if (res.status === "error") {
      setErrorConfirmar(res.message);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(false);
    clearErrors("root");
    setNombreEnviado(values.nombre);
    const res = await submit(values);
    if (res.status === "error") {
      setError("root", { message: res.message });
    } else if (res.status === "success") {
      reset(defaultValues);
    }
  });

  return (
    <FormContainer>
      <FormHeader
        title={
          esModoVer
            ? "Ver Unidad de Medida"
            : modo === "crear"
              ? "Nueva Unidad de Medida"
              : "Modificar Unidad de Medida"
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FaRuler}
      />
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label='Nombre'
            disabled={esModoVer}
            defaultValue={defaultValues.nombre}
            placeholder='Ej. Kilogramo'
            error={errors.nombre?.message}
            {...register("nombre")}
          />
          <TextField
            label='Simbolo'
            disabled={esModoVer}
            defaultValue={defaultValues.simbolo}
            placeholder='Ej. kg'
            error={errors.simbolo?.message}
            {...register("simbolo")}
          />
          <SelectField
            label='Tipo de magnitud'
            placeholder='Selecciona una opcion'
            readOnly={esModoVer}
            defaultValue={defaultValues.tipo_magnitud}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            options={TIPOS_MAGNITUD}
            error={errors.tipo_magnitud?.message}
            {...register("tipo_magnitud")}
          />

          <FormActions>
            {esModoVer ? (
              <CancelButton
                text='Cerrar'
                icon={FiXCircle}
                onClick={onCancelar}
                colorPalette='red'
                variant='outline'
              />
            ) : (
              <>
                <SubmitButton
                  text='Guardar'
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
              </>
            )}
          </FormActions>

          {errors.root?.message && (
            <AlertMessage type='error' message={errors.root.message} />
          )}
          {success && !esModoVer && (
            <AlertMessage
              type='success'
              message={
                esModoCrear
                  ? "La unidad de medida ha sido cargada exitosamente!"
                  : "Unidad de medida modificada exitosamente!"
              }
            />
          )}
        </VStack>
      </form>

      {esModoCrear && (
        <AlertConfirm
          open={confirmAltaAbierto}
          title='Dar de Alta'
          message={`Ya existe una unidad de medida inactiva con ese nombre. ¿Queres darla de alta a ${nombreEnviado}?`}
          loading={reactivar.isSubmitting}
          error={errorConfirmar}
          onConfirm={confirmarAlta}
          onCancel={() => setConfirmAltaAbierto(false)}
        />
      )}
    </FormContainer>
  );
};
