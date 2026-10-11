import { BASE_URL } from "../../config";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HStack, VStack } from "@chakra-ui/react";
import {
  FiEdit2,
  FiSave,
  FiXCircle,
  FiEye,
  FiPlus,
} from "react-icons/fi";
import { useMemo, useState } from "react";
import {
  useElementoLimpiezaSubmit,
  type ElementoLimpiezaPayload,
} from "./hooks/useElementoLimpiezaSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import {
  elementoLimpiezaSchema,
  type ElementoLimpiezaFormInput,
  type ElementoLimpiezaFormValues,
} from "./validationSchema";
import type {
  ElementoLimpieza,
  TipoElementoLimpieza,
  Sector,
  Equipo,
} from "./types";
import {
  FormContainer,
  FormHeader,
  TextField,
  SelectField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
  FormModal,
  RowActionButton,
} from "../../components/ui";
import { TipoElementoLimpiezaForm } from "./TipoElementoLimpiezaForm";

type ElementoLimpiezaFormProps = {
  modo: "crear" | "modificar" | "ver";
  elemento?: ElementoLimpieza;
  onCancelar?: () => void;
  onGuardado?: (elemento: ElementoLimpieza) => void;
  enModal?: boolean;
};

type Catalogo = { id: number; nombre: string; activo: boolean };

const opcionesCatalogo = (
  lista: Catalogo[],
  asignado: Catalogo | null | undefined,
  soloActivos: boolean,
) => {
  if (soloActivos || !asignado) {
    return lista
      .filter((x) => x.activo)
      .map((x) => ({ label: x.nombre, value: String(x.id) }));
  }
  // El registro puede apuntar a un tipo/sector/equipo dado de baja. Si lo
  // filtrásemos por activo, el select mostraría el placeholder en vez del
  // valor real, así que el asignado siempre entra.
  const base = lista.filter((x) => x.activo || x.id === asignado.id);
  if (!base.some((x) => x.id === asignado.id)) base.push(asignado);
  return base.map((x) => ({ label: x.nombre, value: String(x.id) }));
};

export const ElementoLimpiezaForm = ({
  modo,
  elemento,
  onCancelar,
  onGuardado,
  enModal = false,
}: ElementoLimpiezaFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const defaultValues = useMemo<ElementoLimpiezaFormInput>(
    () =>
      esModoModificar || esModoVer
        ? {
            nombre: elemento!.nombre,
            tipo_id: elemento!.tipo_id,
            sector_id: elemento!.sector_id ?? "",
            equipo_id: elemento!.equipo_id ?? "",
            // El campo es un input de texto, así que la frecuencia se
            // precarga como string; "" significa "sin frecuencia".
            frecuencia_recambio_dias:
              elemento!.frecuencia_recambio_dias != null
                ? String(elemento!.frecuencia_recambio_dias)
                : "",
          }
        : {
            nombre: "",
            tipo_id: 0,
            sector_id: "",
            equipo_id: "",
            frecuencia_recambio_dias: "",
          },
    [elemento, esModoModificar, esModoVer],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<ElementoLimpiezaFormInput, unknown, ElementoLimpiezaFormValues>({
    resolver: zodResolver(elementoLimpiezaSchema),
    defaultValues,
  });

  const {
    data: tiposIniciales,
    loading: loadingTipos,
    error: errorTipos,
    reload: reloadTipos,
  } = useListadoData<TipoElementoLimpieza>({
    endpoint: `${BASE_URL}/tipos-elemento-limpieza/`,
  });
  const { data: sectores, loading: loadingSectores, error: errorSectores } =
    useListadoData<Sector>({
      endpoint: `${BASE_URL}/sectores/`,
    });
  const { data: equipos, loading: loadingEquipos, error: errorEquipos } =
    useListadoData<Equipo>({
      endpoint: `${BASE_URL}/equipos/`,
    });

  const opcionesTipo = useMemo(
    () => opcionesCatalogo(tiposIniciales, elemento?.tipo, esModoCrear),
    [tiposIniciales, elemento?.tipo, esModoCrear],
  );
  const opcionesSector = useMemo(
    () => opcionesCatalogo(sectores, elemento?.sector, esModoCrear),
    [sectores, elemento?.sector, esModoCrear],
  );
  const opcionesEquipo = useMemo(
    () => opcionesCatalogo(equipos, elemento?.equipo, esModoCrear),
    [equipos, elemento?.equipo, esModoCrear],
  );

  const [success, setSuccess] = useState(false);
  const [tipoModalAbierto, setTipoModalAbierto] = useState(false);

  const cargandoCatalogos =
    loadingTipos || loadingSectores || loadingEquipos;

  const { submit } = useElementoLimpiezaSubmit({
    endpoint: `${BASE_URL}/elementos-limpieza/`,
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? elemento!.id : undefined,
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(elemento!);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(false);
    clearErrors("root");
    // sector_id/equipo_id/frecuencia ya salen como number | null del schema
    const payload: ElementoLimpiezaPayload = {
      nombre: values.nombre,
      tipo_id: values.tipo_id,
      sector_id: values.sector_id ?? null,
      equipo_id: values.equipo_id ?? null,
      frecuencia_recambio_dias: values.frecuencia_recambio_dias ?? null,
    };
    const res = await submit(payload);
    if (res.status === "error") setError("root", { message: res.message });
    else if (res.status === "success" && esModoCrear) reset();
  });

  return (
    <FormContainer modal={enModal}>
      <FormHeader
        title={
          esModoVer
            ? "Ver Elemento de Limpieza"
            : esModoCrear
              ? "Nuevo Elemento de Limpieza"
              : "Modificar Elemento de Limpieza"
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiPlus}
      />
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label='Nombre'
            disabled={esModoVer}
            error={errors.nombre?.message}
            {...register("nombre")}
          />
          <HStack width='100%' align='end' gap={2}>
            <SelectField
              label='Tipo'
              placeholder='Seleccioná un tipo'
              options={opcionesTipo}
              error={errors.tipo_id?.message || (cargandoCatalogos ? "" : errorTipos)}
              readOnly={esModoVer || esModoModificar}
              onFocus={
                esModoVer || esModoModificar
                  ? (e) => e.preventDefault()
                  : undefined
              }
              onClick={
                esModoVer || esModoModificar
                  ? (e) => e.preventDefault()
                  : undefined
              }
              {...register("tipo_id")}
            />
            {esModoCrear && (
              <RowActionButton
                icon={FiPlus}
                label='Crear tipo'
                colorPalette='green'
                onClick={() => setTipoModalAbierto(true)}
              />
            )}
          </HStack>

          <SelectField
            label='Sector (Opcional)'
            placeholder='Sin asignar'
            options={opcionesSector}
            error={
              errors.sector_id?.message || (cargandoCatalogos ? "" : errorSectores)
            }
            disabled={esModoVer}
            {...register("sector_id")}
          />

          <SelectField
            label='Equipo (Opcional)'
            placeholder='Sin asignar'
            options={opcionesEquipo}
            error={
              errors.equipo_id?.message || (cargandoCatalogos ? "" : errorEquipos)
            }
            disabled={esModoVer}
            {...register("equipo_id")}
          />

          <TextField
            label='Frecuencia de recambio en días (Opcional)'
            placeholder='Ej. 30'
            disabled={esModoVer}
            error={errors.frecuencia_recambio_dias?.message}
            {...register("frecuencia_recambio_dias")}
          />

          {esModoVer && (
            <TextField
              label='Último recambio'
              disabled
              value={
                elemento?.fecha_ultimo_recambio
                  ? new Date(elemento.fecha_ultimo_recambio).toLocaleString(
                      "es-AR",
                    )
                  : "—"
              }
            />
          )}

          <FormActions>
            {esModoVer ? (
              <CancelButton
                text='Cerrar'
                icon={FiXCircle}
                onClick={onCancelar}
                colorPalette='gray'
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
                  ? "Elemento creado exitosamente."
                  : "Elemento modificado exitosamente."
              }
            />
          )}
        </VStack>
      </form>
      {tipoModalAbierto && (
        <FormModal open onClose={() => setTipoModalAbierto(false)}>
          <TipoElementoLimpiezaForm
            modo='crear'
            onCancelar={() => setTipoModalAbierto(false)}
            onGuardado={() => {
              setTipoModalAbierto(false);
              reloadTipos();
            }}
          />
        </FormModal>
      )}
    </FormContainer>
  );
};
