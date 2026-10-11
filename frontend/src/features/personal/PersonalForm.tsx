import { BASE_URL } from "../../config";
import { useState, useMemo } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack, Text, Box, Button } from "@chakra-ui/react";
import {
  usePersonalSubmit,
  type PersonalPayload,
} from "./hooks/usePersonalSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import {
  personalSchema,
  type PersonalFormInput,
  type PersonalFormValues,
} from "./validationSchema";
import type { Persona } from "./types";
import type { Capacidad } from "../capacidades/types";
import {
  FormContainer,
  FormHeader,
  TextField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
  AlertConfirm,
  CheckboxGroupField,
  type CheckboxGroupOption,
} from "../../components/ui";
import { FiUser, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";

// Capacidades que habilitan a iniciar sesion: solo para ese personal la
// contraseña es obligatoria (y para el resto no está permitida).
const CAPACIDADES_HABILITANTES = new Set(["administrar", "operar"]);

type PersonalFormProps = {
  modo: "crear" | "modificar" | "ver";
  persona?: Persona;
  onCancelar?: () => void;
  onGuardado?: (persona: Persona) => void;
  enModal?: boolean;
};

export const PersonalForm = ({
  modo,
  persona,
  onCancelar,
  onGuardado,
  enModal = false,
}: PersonalFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const defaultValues: PersonalFormInput =
    esModoModificar || esModoVer
      ? {
          nombre: persona!.nombre,
          apellido: persona!.apellido,
          dni: persona!.dni,
          legajo: String(persona!.legajo),
          email: persona!.email || "",
          telefono: persona!.telefono || "",
          capacidades_ids: persona!.capacidades
            .filter((c) => c.activo)
            .map((c) => c.capacidad_id),
          password: "",
        }
      : {
          nombre: "",
          apellido: "",
          dni: "",
          legajo: "",
          email: "",
          telefono: "",
          capacidades_ids: [],
          password: "",
        };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<PersonalFormInput, unknown, PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues,
  });

  const { data: capacidades } = useListadoData<Capacidad>({
    endpoint: `${BASE_URL}/capacidades/`,
  });
  const capacidadesActivas = useMemo(
    () => capacidades.filter((c) => c.activo),
    [capacidades],
  );

  const opcionesCapacidades: CheckboxGroupOption[] = useMemo(
    () =>
      capacidadesActivas.map((cap) => ({
        label: cap.nombre,
        value: String(cap.id),
      })),
    [capacidadesActivas],
  );

  // Determina si las capacidades seleccionadas incluyen alguna habilitante
  // (administrar u operar) para decidir si la contraseña es obligatoria.
  // useWatch (y no watch()) para que React Compiler pueda memoizar.
  const capacidadesIdsSeleccionadas = useWatch({
    control,
    name: "capacidades_ids",
  });
  const requierePassword = useMemo(() => {
    const ids = capacidadesIdsSeleccionadas ?? [];
    const nombres = new Map(
      capacidadesActivas.map((c) => [c.id, c.nombre.toLowerCase()]),
    );
    return ids.some((id) =>
      CAPACIDADES_HABILITANTES.has(nombres.get(id) ?? ""),
    );
  }, [capacidadesIdsSeleccionadas, capacidadesActivas]);

  const [showPassword, setShowPassword] = useState(false);

  const [success, setSuccess] = useState(false);
  const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
  const [personaInactivaId, setPersonaInactivaId] = useState<number | null>(
    null,
  );
  const [errorConfirmar, setErrorConfirmar] = useState("");

  const { submit } = usePersonalSubmit({
    endpoint: `${BASE_URL}/personal/`,
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? persona!.id : undefined,
    onInactivo: (pId) => {
      if (!esModoCrear) return;
      setPersonaInactivaId(pId);
      setErrorConfirmar("");
      setConfirmAltaAbierto(true);
    },
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(persona!);
    },
  });

  const reactivar = usePersonalSubmit({
    endpoint: `${BASE_URL}/personal/`,
    method: "PUT",
    id: personaInactivaId ?? undefined,
    body: { activo: true },
    onSuccess: () => {
      setConfirmAltaAbierto(false);
      setPersonaInactivaId(null);
      onGuardado?.(persona!);
    },
  });

  const confirmarAlta = async () => {
    if (personaInactivaId === null) return;
    setErrorConfirmar("");
    const res = await reactivar.submit();
    if (res.status === "error") setErrorConfirmar(res.message);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(false);
    clearErrors("root");

    const password = (values.password ?? "").trim();

    // Regla del backend: solo el personal con capacidades habilitantes
    // tiene contraseña, y para ese es obligatoria. En modificar, si la
    // persona ya tiene contraseña (tiene_password), se puede dejar vacío
    // para no cambiarla.
    if (requierePassword) {
      const faltaPassword =
        !password && (esModoCrear || persona?.tiene_password === false);
      if (faltaPassword) {
        setError("password", {
          message:
            "La contraseña es obligatoria para personal con capacidades habilitantes",
        });
        return;
      }
    }

    // Solo se envía password si corresponde: vacío = no modificar (PUT) y
    // sin capacidades habilitantes el backend la rechaza (400).
    const payload: PersonalPayload = {
      nombre: values.nombre,
      apellido: values.apellido,
      dni: values.dni,
      legajo: values.legajo,
      email: values.email || "",
      telefono: values.telefono || "",
      capacidades_ids: values.capacidades_ids,
      ...(requierePassword && password ? { password } : {}),
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
            ? "Ver Persona"
            : esModoCrear
              ? "Nueva Persona"
              : "Modificar Persona"
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiUser}
      />
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label='Nombre'
            disabled={esModoVer}
            error={errors.nombre?.message}
            {...register("nombre")}
          />
          <TextField
            label='Apellido'
            disabled={esModoVer}
            error={errors.apellido?.message}
            {...register("apellido")}
          />
          <TextField
            label='DNI'
            disabled={esModoVer}
            error={errors.dni?.message}
            {...register("dni")}
          />
          <TextField
            label='Legajo'
            disabled={esModoVer}
            error={errors.legajo?.message}
            {...register("legajo")}
          />
          <TextField
            label='Email (Opcional)'
            disabled={esModoVer}
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label='Teléfono (Opcional)'
            disabled={esModoVer}
            error={errors.telefono?.message}
            {...register("telefono")}
          />

          <Controller
            name='capacidades_ids'
            control={control}
            render={({ field }) => (
              <CheckboxGroupField
                label='Capacidades'
                options={opcionesCapacidades}
                value={field.value.map(String)}
                onChange={(vals) => field.onChange(vals.map(Number))}
                disabled={esModoVer}
                error={errors.capacidades_ids?.message}
              />
            )}
          />

          {/* Contraseña: visible solo para personal con capacidades
                        habilitantes (administrar u operar), único caso en que
                        el backend la acepta. */}
          {requierePassword && !esModoVer && (
            <Box width='100%' textAlign='left'>
              <Text
                fontSize='md'
                fontFamily='sans-serif'
                mb={1}
                fontWeight='bold'
              >
                Contraseña{esModoModificar ? " (opcional)" : ""}
              </Text>
              <Box position='relative' width='100%'>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder={
                    esModoModificar
                      ? "Dejar vacío para no modificar"
                      : "Ingresá la contraseña"
                  }
                  autoComplete={esModoCrear ? "new-password" : "off"}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px 76px 8px 12px",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
                <Button
                  position='absolute'
                  right='2'
                  top='50%'
                  transform='translateY(-50%)'
                  h='1.75rem'
                  size='xs'
                  variant='ghost'
                  onClick={() => setShowPassword((p) => !p)}
                  disabled={isSubmitting}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </Button>
              </Box>
              {errors.password?.message && (
                <Text color='red.500' fontSize='sm' mt={1}>
                  {errors.password.message}
                </Text>
              )}
              <Text fontSize='xs' color='gray.600' mt={1}>
                Obligatoria para personal con capacidades habilitantes
                {esModoModificar && persona?.tiene_password
                  ? "; dejala vacía para conservar la actual."
                  : "."}
              </Text>
            </Box>
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
                  ? "Persona creada exitosamente."
                  : "Persona modificada exitosamente."
              }
            />
          )}
        </VStack>
      </form>

      {esModoCrear && (
        <AlertConfirm
          open={confirmAltaAbierto}
          title='Reactivar Personal'
          message='Ya existe una persona inactiva con ese DNI o Legajo. ¿Querés reactivarla?'
          loading={reactivar.isSubmitting}
          error={errorConfirmar}
          onConfirm={confirmarAlta}
          onCancel={() => setConfirmAltaAbierto(false)}
        />
      )}
    </FormContainer>
  );
};
