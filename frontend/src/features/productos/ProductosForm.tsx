import { BASE_URL, ITEMS_SELECT } from "../../config";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProductoSubmit } from "./hooks/useProductoSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { ProductoSchema, type ProductoFormValues } from "./validationSchema";
import type { Producto } from "./types";
import type { UnidadMedida } from "../unidadMedida/types";
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
  FiEdit2,
  FiSave,
  FiXCircle,
  FiEye,
  FiPackage,
} from "react-icons/fi";
import { VStack } from "@chakra-ui/react";
import { useForm } from "react-hook-form";

type ProductoFormProps = {
  modo: "crear" | "modificar" | "ver";
  producto?: Producto;
  onCancelar?: () => void;
  onGuardado?: (producto: Producto) => void;
  enModal?: boolean;
};

export const ProductoForm = ({
  modo,
  producto,
  onCancelar,
  onGuardado,
  enModal = false,
}: ProductoFormProps) => {
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
      esModoModificar || esModoVer ? producto?.unidad_medida : undefined;

    if (unidadActual && !activas.some((u) => u.id === unidadActual.id)) {
      opciones.unshift({
        label: `${unidadActual.nombre} (${unidadActual.simbolo})`,
        value: String(unidadActual.id),
      });
    }

    return opciones;
  }, [unidades, esModoModificar, esModoVer, producto]);

  const defaultValues: ProductoFormValues =
    esModoModificar || esModoVer
      ? {
          nombre: producto!.nombre,
          descripcion: producto!.descripcion,
          unidad_medida_id: String(producto!.unidad_medida.id),
        }
      : {
        nombre: "",
        descripcion: "",
        unidad_medida_id: "",
      };

  const {
    register,
    handleSubmit,
    formState: {errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(ProductoSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);
  const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
  const [productoInactivoId, setProductoInactivoId] = useState<number | null>(null);
  const [errorConfirmar, setErrorConfirmar] = useState("");
  const [nombreEnviado, setNombreEnviado] = useState("");

  const { submit } = useProductoSubmit({
    endpoint: `${BASE_URL}/productos/`,
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? producto!.id : undefined,
    onInactivo: (productoId) => {
      if (!esModoCrear) return;
      setProductoInactivoId(productoId);
      setErrorConfirmar("");
      setConfirmAltaAbierto(true);
    },
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(producto!);
    },
  });

  const reactivar = useProductoSubmit({
    endpoint: `${BASE_URL}/productos/`,
    method: "PUT",
    id: productoInactivoId ?? undefined,
    body: { activo: true },
    onSuccess: () => {
      setConfirmAltaAbierto(false);
      setProductoInactivoId(null);
      onGuardado?.(producto!);
    },
  });

  const confirmarAlta = async () => {
    if (productoInactivoId === null) return;
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
            ? "Ver Producto"
            : modo === "crear"
              ? "Nuevo Producto"
              : "Modificar Producto" 
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiPackage}
      />
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label='Nombre'
            disabled={esModoVer}
            defaultValue={defaultValues.nombre}
            placeholder='Ej. Pan francés'
            error={errors.nombre?.message}
            {...register("nombre")}
          />

          <TextField
            label='Descripcion'
            disabled={esModoVer}
            defaultValue={defaultValues.descripcion}
            error={errors.descripcion?.message}
            {...register("descripcion")}
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
                  ? "El producto ha sido cargado exitosamente!"
                  : "Producto modificado exitosamente!" 
              }
            />
          )}
        </VStack>
      </form>

      {esModoCrear && (
        <AlertConfirm 
          open={confirmAltaAbierto}
          title='Dar de Alta'
          message={`Ya existe un producto inactivo con ese nombre. ¿Queres darlo de alta a ${nombreEnviado}?`}
          loading={reactivar.isSubmitting}
          error={errorConfirmar}
          onConfirm={confirmarAlta}
          onCancel={() => setConfirmAltaAbierto(false)}
        />
      )}
    </FormContainer>
  );
};