import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { useInsumoQuimicoSubmit } from "./hooks/useInsumoQuimicoSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { insumoQuimicoSchema, type InsumoQuimicoFormValues } from "./validationSchema";
import type { InsumoQuimico, UnidadMedida } from "./types";
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
import { 
    FiBox, 
    FiEdit2, 
    FiSave, 
    FiXCircle, 
    FiEye
} from "react-icons/fi";

type InsumoQuimicoFormProps = {
  modo: "crear" | "modificar" | "ver";
  insumoQuimico?: InsumoQuimico;
  onCancelar?: () => void;
  onGuardado?: (insumoQuimico: InsumoQuimico) => void;
};

export const InsumoQuimicoForm = ({
  modo,
  insumoQuimico,
  onCancelar,
  onGuardado,
}: InsumoQuimicoFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const { data: unidades } = useListadoData<UnidadMedida>({
    endpoint: "http://127.0.0.1:8000/unidades-de-medida/",
    pageSize: 100,
    errorMessage: "No se pudieron cargar las unidades de medida.",
  });

  const opcionesUnidad = useMemo(() => {
    const activas = unidades.filter((unidad) => unidad.disponible);
    const opciones = activas.map((unidad) => ({
      label: `${unidad.nombre} (${unidad.simbolo})`,
      value: String(unidad.id),
    }));

    const unidadActual =
      esModoModificar || esModoVer ? insumoQuimico?.unidad_medida : undefined;
    if (unidadActual && !activas.some((u) => u.id === unidadActual.id)) {
      opciones.unshift({
        label: `${unidadActual.nombre} (${unidadActual.simbolo})`,
        value: String(unidadActual.id),
      });
    }
    return opciones;
  }, [unidades, esModoModificar, esModoVer, insumoQuimico]);

  const defaultValues: InsumoQuimicoFormValues =
    esModoModificar || esModoVer
      ? {
          nombre: insumoQuimico!.nombre,
          unidad_medida_id: String(insumoQuimico!.unidad_medida.id),
          tipo: insumoQuimico!.tipo,
        }
      : { nombre: "", unidad_medida_id: "", tipo: "" };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<InsumoQuimicoFormValues>({
    resolver: zodResolver(insumoQuimicoSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);
  const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
  const [insumoQuimicoInactivoId, setInsumoQuimicoInactivoId] = useState<number | null>(null);
  const [errorConfirmar, setErrorConfirmar] = useState("");
  const [nombreEnviado, setNombreEnviado] = useState("");

  const { submit } = useInsumoQuimicoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos-quimicos/",
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? insumoQuimico!.id : undefined,
    onInactivo: (insumoQuimicoId) => {
      if (!esModoCrear) return;
      setInsumoQuimicoInactivoId(insumoQuimicoId);
      setErrorConfirmar("");
      setConfirmAltaAbierto(true);
    },
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(insumoQuimico!);
    },
  });

  const reactivar = useInsumoQuimicoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos-quimicos/",
    method: "PUT",
    id: insumoQuimicoInactivoId ?? undefined,
    body: { disponible: true },
    onSuccess: () => {
      setConfirmAltaAbierto(false);
      setInsumoQuimicoInactivoId(null);
      onGuardado?.(insumoQuimico!);
    },
  });

  const confirmarAlta = async () => {
    if (insumoQuimicoInactivoId === null) return;
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
            ? "Ver Insumo Químico"
            : modo === "crear"
              ? "Nuevo Insumo Químico"
              : "Modificar Insumo Químico"
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiBox}
      />
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label='Nombre'
            disabled={esModoVer}
            defaultValue={defaultValues.nombre}
            placeholder='Ej. Lavandina'
            error={errors.nombre?.message}
            {...register("nombre")}
          />

          <SelectField
            label='Unidad de medida'
            placeholder='Selecciona una opcion'
            readOnly={esModoVer}
            defaultValue={defaultValues.unidad_medida_id}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            options={opcionesUnidad}
            error={errors.unidad_medida_id?.message}
            {...register("unidad_medida_id")}
          />

          <SelectField
            label='Tipo'
            placeholder='Selecciona una opcion'
            readOnly={esModoVer}
            defaultValue={defaultValues.tipo}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            options={[
              { label: "Detergente", value: "detergente" },
              { label: "Desinfectante", value: "desinfectante" },
              { label: "Desengrasante", value: "desengrasante" },
              { label: "Otro", value: "otro" },
            ]}
            error={errors.tipo?.message}
            {...register("tipo")}
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
                  ? "El insumo químico ha sido cargado exitosamente!"
                  : "Insumo químico modificado exitosamente!"
              }
            />
          )}
        </VStack>
      </form>

      {esModoCrear && (
        <AlertConfirm
          open={confirmAltaAbierto}
          title='Dar de Alta'
          message={`Ya existe un insumo químico inactivo con ese nombre. ¿Queres darlo de alta a ${nombreEnviado}?`}
          loading={reactivar.isSubmitting}
          error={errorConfirmar}
          onConfirm={confirmarAlta}
          onCancel={() => setConfirmAltaAbierto(false)}
        />
      )}
    </FormContainer>
  );
};