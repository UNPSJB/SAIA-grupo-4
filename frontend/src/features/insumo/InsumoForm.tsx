import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { useInsumoSubmit } from "./hooks/useInsumoSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { insumoSchema, type InsumoFormValues } from "./validationSchema";
import type { Insumo, UnidadMedida } from "./types";
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
import { FiBox, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";

type InsumoFormProps = {
  modo: "crear" | "modificar" | "ver";
  insumo?: Insumo;
  onCancelar?: () => void;
  onGuardado?: (insumo: Insumo) => void;
  enModal?: boolean;
};

export const InsumoForm = ({
  modo,
  insumo,
  onCancelar,
  onGuardado,
  enModal = false,
}: InsumoFormProps) => {
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
      esModoModificar || esModoVer ? insumo?.unidad_medida : undefined;
    if (unidadActual && !activas.some((u) => u.id === unidadActual.id)) {
      opciones.unshift({
        label: `${unidadActual.nombre} (${unidadActual.simbolo})`,
        value: String(unidadActual.id),
      });
    }
    return opciones;
  }, [unidades, esModoModificar, esModoVer, insumo]);

  const defaultValues: InsumoFormValues =
    esModoModificar || esModoVer
      ? {
          nombre: insumo!.nombre,
          unidad_medida_id: String(insumo!.unidad_medida.id),
          categoria: insumo!.categoria,
          descripcion: insumo!.descripcion,
        }
      : { nombre: "", unidad_medida_id: "", categoria: "", descripcion: "" };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);
  const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
  const [insumoInactivoId, setInsumoInactivoId] = useState<number | null>(null);
  const [errorConfirmar, setErrorConfirmar] = useState("");
  const [nombreEnviado, setNombreEnviado] = useState("");

  const { submit } = useInsumoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos/",
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? insumo!.id : undefined,
    onInactivo: (insumoId) => {
      if (!esModoCrear) return;
      setInsumoInactivoId(insumoId);
      setErrorConfirmar("");
      setConfirmAltaAbierto(true);
    },
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(insumo!);
    },
  });

  const reactivar = useInsumoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos/",
    method: "PUT",
    id: insumoInactivoId ?? undefined,
    body: { disponible: true },
    onSuccess: () => {
      setConfirmAltaAbierto(false);
      setInsumoInactivoId(null);
      onGuardado?.(insumo!);
    },
  });

  const confirmarAlta = async () => {
    if (insumoInactivoId === null) return;
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
    <FormContainer modal={enModal}>
      <FormHeader
        title={
          esModoVer
            ? "Ver Insumo"
            : modo === "crear"
              ? "Nuevo Insumo"
              : "Modificar Insumo"
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiBox}
      />
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label='Nombre'
            disabled={esModoVer}
            defaultValue={defaultValues.nombre}
            placeholder='Ej. Harina 0000'
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
            label='Categoria'
            placeholder='Selecciona una opcion'
            readOnly={esModoVer}
            defaultValue={defaultValues.categoria}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            options={[
              { label: "Materia Prima", value: "materia prima" },
              { label: "Aditivo", value: "aditivo" },
              { label: "Envase", value: "envase" },
              { label: "Otro", value: "otro" },
            ]}
            error={errors.categoria?.message}
            {...register("categoria")}
          />

          <TextField
            label='Descripcion'
            disabled={esModoVer}
            defaultValue={defaultValues.descripcion}
            placeholder='Breve descripcion del insumo'
            error={errors.descripcion?.message}
            {...register("descripcion")}
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
                  ? "El insumo ha sido cargado exitosamente!"
                  : "Insumo modificado exitosamente!"
              }
            />
          )}
        </VStack>
      </form>

      {esModoCrear && (
        <AlertConfirm
          open={confirmAltaAbierto}
          title='Dar de Alta'
          message={`Ya existe un insumo inactivo con ese nombre. ¿Queres darlo de alta a ${nombreEnviado}?`}
          loading={reactivar.isSubmitting}
          error={errorConfirmar}
          onConfirm={confirmarAlta}
          onCancel={() => setConfirmAltaAbierto(false)}
        />
      )}
    </FormContainer>
  );
};
