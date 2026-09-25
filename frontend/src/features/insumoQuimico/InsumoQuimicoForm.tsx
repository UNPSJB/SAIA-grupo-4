import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { useInsumoQuimicoSubmit } from "./hooks/useInsumoQuimicoSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { insumoQuimicoSchema, type InsumoQuimicoFormValues } from "./validationSchema";
import type { InsumoQuimico } from "./types";
import type { UnidadMedida } from "../unidadMedida/types";
import type { Sector } from "../sectores/types";
import type { Equipo } from "../equipos/types";
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
    FiDroplet,
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

  const { data: sectores } = useListadoData<Sector>({
  endpoint: "http://127.0.0.1:8000/sectores/",
  pageSize: 100,
  errorMessage: "No se pudieron cargar los sectores.",
  });

  const { data: equipos } = useListadoData<Equipo>({
  endpoint: "http://127.0.0.1:8000/equipos/",
  pageSize: 100,
  errorMessage: "No se pudieron cargar los equipos.",
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

  const opcionesSectores = useMemo(() => {
    const activos = sectores.filter((s) => s.activo);
    const opciones = activos.map((s) => ({ 
      label: s.nombre, 
      value: String(s.id) 
    }));
    
    const sectorActual =
      esModoModificar || esModoVer ? insumoQuimico?.sector : undefined;

    if (sectorActual && !activos.some((s) => s.id === sectorActual.id)) {
      opciones.unshift({
        label: sectorActual.nombre,
        value: String(sectorActual.id)
      });
    }

    return opciones;
  }, [sectores, esModoModificar, esModoVer, insumoQuimico]);

  const opcionesEquipos = useMemo(() => {
    const activos = equipos.filter((e) => e.activo);
    const opciones = activos.map((e) => ({
      label: e.nombre,
      value: String(e.id),
    }));

    const equipoActual =
      esModoModificar || esModoVer ? insumoQuimico?.equipo : undefined;

    if (equipoActual && !activos.some((e) => e.id === equipoActual.id)) {
      opciones.unshift({
        label: equipoActual.nombre,
        value: String(equipoActual.id)
      });
    }

    return opciones;
  }, [equipos, esModoModificar, esModoVer, insumoQuimico]);

  const defaultValues: InsumoQuimicoFormValues =
    esModoModificar || esModoVer
      ? {
          nombre: insumoQuimico!.nombre,
          unidad_medida_id: String(insumoQuimico!.unidad_medida.id),
          tipo: insumoQuimico!.tipo,
          equipo_id: insumoQuimico?.equipo ? String(insumoQuimico.equipo.id) : "",
          sector_id: insumoQuimico?.sector ? String(insumoQuimico.sector.id) : "",
        }
      : { 
        nombre: "", 
        unidad_medida_id: "", 
        tipo: "",
        equipo_id: "",
        sector_id: "",
      };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
    setValue,
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
    onSuccess: (data) => {
      setSuccess(true);
      if (data) {
        onGuardado?.(data as InsumoQuimico);
      }
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
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiDroplet}
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

          <SelectField
            label='Equipo'
            placeholder='Selecciona un equipo'
            readOnly={esModoVer}
            defaultValue={defaultValues.equipo_id}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            {...register("equipo_id", {
              onChange: (e) => {
                if (e.target.value) setValue("sector_id", "", { shouldValidate: true });
              },
            })}
            options={opcionesEquipos}
            error={errors.equipo_id?.message}
          />

          <SelectField
            label='Sector'
            placeholder='Selecciona un sector'
            readOnly={esModoVer}
            defaultValue={defaultValues.sector_id}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            {...register("sector_id", {
              onChange: (e) => {
                if (e.target.value) setValue("equipo_id", "", { shouldValidate: true });
              },
            })}
            options={opcionesSectores}
            error={errors.sector_id?.message}
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