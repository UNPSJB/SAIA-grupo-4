import { BASE_URL, ITEMS_SELECT } from "../../config";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useInsumoSubmit, type InsumoPayload } from "./hooks/useInsumoSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { insumoSchema, type InsumoFormValues } from "./validationSchema";
import type { Insumo, UnidadMedida } from "./types";
import {
  FormContainer,
  FormHeader,
  FormGrid,
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
    endpoint: `${BASE_URL}/unidades-de-medida/`,
    pageSize: ITEMS_SELECT,
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
          densidad_g_ml:
            insumo?.densidad_g_ml != null ? String(insumo.densidad_g_ml) : "",
          peso_unitario_g:
            insumo?.peso_unitario_g != null ? String(insumo.peso_unitario_g) : "",
        }
      : {
          nombre: "",
          unidad_medida_id: "",
          categoria: "",
          descripcion: "",
          densidad_g_ml: "",
          peso_unitario_g: "",
        };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
    setError,
    clearErrors,
    reset,
  } = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoSchema),
    defaultValues,
    mode: "onChange",
  });

  const unidadSeleccionadaId = watch("unidad_medida_id");

  const unidadSeleccionada = useMemo(() => {
    return (
      unidades.find((u) => String(u.id) === String(unidadSeleccionadaId)) ||
      (insumo?.unidad_medida &&
      String(insumo.unidad_medida.id) === String(unidadSeleccionadaId)
        ? insumo.unidad_medida
        : undefined)
    );
  }, [unidades, unidadSeleccionadaId, insumo]);

  const tipoMagnitud = unidadSeleccionada?.tipo_magnitud?.toLowerCase();

  const [success, setSuccess] = useState(false);
  const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
  const [insumoInactivoId, setInsumoInactivoId] = useState<number | null>(null);
  const [errorConfirmar, setErrorConfirmar] = useState("");
  const [nombreEnviado, setNombreEnviado] = useState("");

  const { submit } = useInsumoSubmit({
    endpoint: `${BASE_URL}/insumos/`,
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
    endpoint: `${BASE_URL}/insumos/`,
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
    const cleanedValues: InsumoPayload = {
      ...values,
      densidad_g_ml: tipoMagnitud === "volumen" ? values.densidad_g_ml : undefined,
      peso_unitario_g: tipoMagnitud === "cantidad" ? values.peso_unitario_g : undefined,
    };
    const res = await submit(cleanedValues);
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
        <FormGrid>
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

          {tipoMagnitud === "volumen" && (
            <TextField
              label='Densidad (g/ml)'
              disabled={esModoVer}
              defaultValue={defaultValues.densidad_g_ml}
              placeholder='Ej. 0.92'
              type='number'
              step='0.001'
              min='0.001'
              hideSpinners
              error={errors.densidad_g_ml?.message}
              {...register("densidad_g_ml")}
            />
          )}

          {tipoMagnitud === "cantidad" && (
            <TextField
              label='Peso promedio unitario (g)'
              disabled={esModoVer}
              defaultValue={defaultValues.peso_unitario_g}
              placeholder='Ej. 50'
              type='number'
              step='0.01'
              min='0.01'
              hideSpinners
              error={errors.peso_unitario_g?.message}
              {...register("peso_unitario_g")}
            />
          )}

          <SelectField
            label='Categoria'
            placeholder='Selecciona una opción'
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
                  disabled={!isValid}
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
        </FormGrid>
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
