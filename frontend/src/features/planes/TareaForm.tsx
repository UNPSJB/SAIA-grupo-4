import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";
import {
  FiEdit2,
  FiEye,
  FiSave,
  FiTag,
  FiTool,
  FiXCircle,
} from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  CheckboxGroupField,
  FormActions,
  FormContainer,
  FormHeader,
  RadioGroupField,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "../../components/ui";
import { tareaSchema, type TareaFormInput, type TareaFormValues } from "./validationSchema";
import type { DestinoTipo, TareaLimpieza } from "./types";
import type { Equipo } from "../equipos/types";
import type { Sector } from "../sectores/types";
import { nextTareaId } from "./mockData";
import { DIAS_SEMANA, ELEMENTOS_DISPONIBLES, QUIMICOS_DISPONIBLES } from "./constants";

const Seccion = ({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) => (
  <Box
    w='100%'
    borderWidth='1px'
    borderColor='border.subtle'
    borderRadius='md'
    p={4}
  >
    <Heading
      size='sm'
      textTransform='uppercase'
      color='green'
      display='flex'
      alignItems='center'
      gap={2}
      mb={4}
    >
      <FiTag /> {numero}. {titulo}
    </Heading>
    <VStack gap={4} align='start' w='100%'>
      {children}
    </VStack>
  </Box>
);

type TareaFormProps = {
  modo: "crear" | "modificar" | "ver";
  tarea?: TareaLimpieza;
  onCancelar?: () => void;
  onGuardado?: (tarea: TareaLimpieza) => void;
  enModal?: boolean;
};

export const TareaForm = ({
  modo,
  tarea,
  onCancelar,
  onGuardado,
  enModal = false,
}: TareaFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const defaultValues: TareaFormValues =
    esModoModificar || esModoVer
      ? {
          nombre: tarea!.nombre,
          destino_tipo: tarea!.destino_tipo,
          equipo_id: tarea?.equipo ? tarea.equipo.id : undefined,
          sector_id: tarea?.sector ? tarea.sector.id : undefined,
          momento: tarea!.momento,
          periodicidad: tarea!.periodicidad,
          dias: tarea?.dias ?? [],
          dia_mes: tarea?.dia_mes,
          pasos: (tarea?.pasos ?? []).join("\n"),
          quimicos: tarea?.quimicos ?? [],
          elementos: tarea?.elementos ?? [],
        }
      : {
          nombre: "",
          destino_tipo: "equipo",
          equipo_id: undefined,
          sector_id: undefined,
          momento: "pre-operacional",
          periodicidad: "diaria",
          dias: [],
          dia_mes: undefined,
          pasos: "",
          quimicos: [],
          elementos: [],
        };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm<TareaFormInput, unknown, TareaFormValues>({
    resolver: zodResolver(tareaSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [equiposCargados, setEquiposCargados] = useState(false);
  const [sectoresCargados, setSectoresCargados] = useState(false);
  const [errorEquipos, setErrorEquipos] = useState("");
  const [errorSectores, setErrorSectores] = useState("");

  const destinoTipo = useWatch({ control, name: "destino_tipo" });

  const cargandoEquipos = destinoTipo === "equipo" && !equiposCargados;
  const cargandoSectores = destinoTipo === "sector" && !sectoresCargados;

  useEffect(() => {
    let activo = true;

    if (destinoTipo === "equipo" && !equiposCargados) {
      fetch("http://127.0.0.1:8000/equipos/")
        .then((res) => {
          if (!res.ok) throw new Error(`Error ${res.status}`);
          return res.json();
        })
        .then((json: Equipo[]) => {
          if (activo) setEquipos(json);
        })
        .catch(() => {
          if (activo) setErrorEquipos("No se pudieron cargar los equipos activos.");
        })
        .finally(() => {
          if (activo) {
            setEquiposCargados(true);
          }
        });
    }

    if (destinoTipo === "sector" && !sectoresCargados) {
      fetch("http://127.0.0.1:8000/sectores/")
        .then((res) => {
          if (!res.ok) throw new Error(`Error ${res.status}`);
          return res.json();
        })
        .then((json: Sector[]) => {
          if (activo) setSectores(json);
        })
        .catch(() => {
          if (activo) setErrorSectores("No se pudieron cargar los sectores activos.");
        })
        .finally(() => {
          if (activo) {
            setSectoresCargados(true);
          }
        });
    }

    return () => {
      activo = false;
    };
  }, [destinoTipo, equiposCargados, sectoresCargados]);

  const equiposActivos = equipos.filter((e) => e.activo);
  const sectoresActivos = sectores.filter((s) => s.activo);

  const periodicidad = useWatch({ control, name: "periodicidad" });
  const dias = useWatch({ control, name: "dias" }) ?? [];
  const quimicos = useWatch({ control, name: "quimicos" }) ?? [];
  const elementos = useWatch({ control, name: "elementos" }) ?? [];
  const pasosRaw: string = useWatch({ control, name: "pasos" }) ?? "";
  const pasosVista = pasosRaw.split("\n").map((p) => p.trim()).filter(Boolean);

  const opcionesEquipos = [
    ...equiposActivos.map((e) => ({
      label: `${e.nombre} (${e.sector?.nombre ?? "Sin sector"}${e.ubicacion ? " / " + e.ubicacion : ""})`,
      value: String(e.id),
    })),
    ...(esModoModificar || esModoVer
      ? tarea?.equipo && !equiposActivos.some((e) => e.id === tarea.equipo!.id)
        ? [
            {
              label: `${tarea.equipo.nombre} (${tarea.equipo.sector?.nombre ?? "Sin sector"})`,
              value: String(tarea.equipo.id),
            },
          ]
        : []
      : []),
  ];

  const opcionesSectores = [
    ...sectoresActivos.map((s) => ({
      label: s.nombre,
      value: String(s.id),
    })),
    ...(esModoModificar || esModoVer
      ? tarea?.sector && !sectoresActivos.some((s) => s.id === tarea.sector!.id)
        ? [
            {
              label: tarea.sector.nombre,
              value: String(tarea.sector.id),
            },
          ]
        : []
      : []),
  ];

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const tareaGuardada: TareaLimpieza = {
      id: esModoModificar ? tarea!.id : nextTareaId(),
      nombre: values.nombre.trim(),
      destino_tipo: values.destino_tipo,
      equipo:
        values.destino_tipo === "equipo"
          ? equipos.find((e) => e.id === values.equipo_id) ??
            (esModoModificar ? tarea?.equipo : undefined)
          : undefined,
      sector:
        values.destino_tipo === "sector"
          ? sectores.find((s) => s.id === values.sector_id) ??
            (esModoModificar ? tarea?.sector : undefined)
          : undefined,
      momento: values.momento,
      periodicidad: values.periodicidad,
      dias:
        values.periodicidad === "semanal"
          ? (values.dias as TareaLimpieza["dias"]).slice(0, 1)
          : values.periodicidad === "dias-especificos"
            ? (values.dias as TareaLimpieza["dias"])
            : [],
      dia_mes:
        values.periodicidad === "mensual" ? values.dia_mes : undefined,
      pasos: values.pasos
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean),
      quimicos: values.quimicos,
      elementos: values.elementos,
      activo: esModoModificar ? tarea!.activo : true,
    };
    setSuccess(true);
    onGuardado?.(tareaGuardada);
  });

  return (
    <FormContainer modal={enModal}>
      <FormHeader
        title={
          esModoVer
            ? "Ver Tarea POES"
            : esModoCrear
              ? "Agregar Tarea"
              : "Editar Tarea"
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiTool}
      />
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4} align='stretch'>
          <Seccion numero={1} titulo='Identificación y Destino'>
            <TextField
              label='Nombre de la Tarea'
              disabled={esModoVer}
              defaultValue={
                esModoModificar || esModoVer ? defaultValues.nombre : undefined
              }
              placeholder='Ej. Sanitización profunda de Heladera y Burletes'
              error={errors.nombre?.message}
              {...register("nombre")}
            />

            <RadioGroupField
              label='Destino de la Tarea'
              disabled={esModoVer}
              value={destinoTipo}
              onChange={(value) => setValue("destino_tipo", value as DestinoTipo, { shouldValidate: true })}
              options={[
                { label: "Equipo de Maestro", value: "equipo" },
                { label: "Sector / Área Física", value: "sector" },
              ]}
            />

            {destinoTipo === "equipo" ? (
              <>
                <SelectField
                  label='Seleccionar Equipo'
                  placeholder='Seleccione un equipo'
                  readOnly={esModoVer}
                  disabled={!esModoVer && cargandoEquipos}
                  onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                  onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                  options={
                    cargandoEquipos
                      ? [{ label: "Cargando equipos...", value: "" }]
                      : opcionesEquipos
                  }
                  error={errors.equipo_id?.message?.toString()}
                  {...register("equipo_id")}
                />
                {errorEquipos && !esModoVer && (
                  <AlertMessage type='error' message={errorEquipos} />
                )}
              </>
            ) : (
              <>
                <SelectField
                  label='Seleccionar Sector / Área'
                  placeholder='Seleccione un sector'
                  readOnly={esModoVer}
                  disabled={!esModoVer && cargandoSectores}
                  onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                  onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                  options={
                    cargandoSectores
                      ? [{ label: "Cargando sectores...", value: "" }]
                      : opcionesSectores
                  }
                  error={errors.sector_id?.message?.toString()}
                  {...register("sector_id")}
                />
                {errorSectores && !esModoVer && (
                  <AlertMessage type='error' message={errorSectores} />
                )}
              </>
            )}
          </Seccion>

          <Seccion numero={2} titulo='Momento Operativo y Frecuencia'>
            <Controller
              control={control}
              name='momento'
              render={({ field }) => (
                <RadioGroupField
                  label='Momento'
                  disabled={esModoVer}
                  value={field.value}
                  onChange={(value) =>
                    field.onChange(
                      value as "pre-operacional" | "operacional" | "post-operacional",
                    )
                  }
                  options={[
                    { label: "Pre-operacional", value: "pre-operacional" },
                    { label: "Operacional", value: "operacional" },
                    { label: "Post-operacional", value: "post-operacional" },
                  ]}
                />
              )}
            />

            <SelectField
              label='Periodicidad'
              placeholder='Seleccione una periodicidad'
              readOnly={esModoVer}
              onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
              onClick={esModoVer ? (e) => e.preventDefault() : undefined}
              options={[
                { label: "Diaria", value: "diaria" },
                { label: "Semanal", value: "semanal" },
                { label: "Mensual", value: "mensual" },
                { label: "Días Específicos", value: "dias-especificos" },
              ]}
              error={errors.periodicidad?.message?.toString()}
              {...register("periodicidad")}
            />

            {periodicidad === "semanal" && (
              <CheckboxGroupField
                label='Día de la semana'
                disabled={esModoVer}
                seleccionUnica
                value={dias.slice(-1)}
                onChange={(selected) => setValue("dias", selected, { shouldValidate: true })}
                options={DIAS_SEMANA.map((d) => ({ label: d.label, value: d.value }))}
                error={errors.dias?.message?.toString()}
              />
            )}

            {periodicidad === "mensual" && (
              <TextField
                label='Día del mes (1-31)'
                disabled={esModoVer}
                defaultValue={
                  esModoModificar || esModoVer
                    ? String(defaultValues.dia_mes ?? "")
                    : undefined
                }
                placeholder='Ej. 15'
                error={errors.dia_mes?.message}
                {...register("dia_mes")}
              />
            )}

            {periodicidad === "dias-especificos" && (
              <CheckboxGroupField
                label='Días de la semana'
                disabled={esModoVer}
                value={dias}
                onChange={(selected) => setValue("dias", selected, { shouldValidate: true })}
                options={DIAS_SEMANA.map((d) => ({ label: d.label, value: d.value }))}
                error={errors.dias?.message?.toString()}
              />
            )}
          </Seccion>

          <Seccion numero={3} titulo='Guía y Procedimiento (Paso a Paso)'>
            <TextAreaField
              label='Pasos del procedimiento (uno por línea)'
              disabled={esModoVer}
              defaultValue={
                esModoModificar || esModoVer ? defaultValues.pasos : undefined
              }
              placeholder={"Ej.\n1. Desconectar energía eléctrica.\n2. Retirar residuos sólidos."}
              error={errors.pasos?.message}
              {...register("pasos")}
            />
            {pasosVista.length > 0 && (
              <Box w='100%' bg='gray.50' borderWidth='1px' borderRadius='md' p={3}>
                <Text fontSize='sm' fontWeight='semibold' mb={2}>
                  Vista previa del procedimiento
                </Text>
                <VStack align='start' gap={1}>
                  {pasosVista.map((paso, i) => (
                    <HStack key={i} align='start'>
                      <Text as='span' fontWeight='bold' minW={4}>
                        {i + 1}.
                      </Text>
                      <Text>{paso}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
          </Seccion>

          <Seccion numero={4} titulo='Recursos Requeridos'>
            <CheckboxGroupField
              label='Insumos Químicos'
              disabled={esModoVer}
              value={quimicos}
              onChange={(selected) => setValue("quimicos", selected)}
              options={QUIMICOS_DISPONIBLES.map((q) => ({ label: q, value: q }))}
            />
            <CheckboxGroupField
              label='Elementos de Limpieza'
              disabled={esModoVer}
              value={elementos}
              onChange={(selected) => setValue("elementos", selected)}
              options={ELEMENTOS_DISPONIBLES.map((u) => ({ label: u, value: u }))}
            />
          </Seccion>

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
                  text='Guardar Tarea'
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
                  ? "Tarea agregada exitosamente."
                  : "Tarea modificada exitosamente."
              }
            />
          )}
        </VStack>
      </form>
    </FormContainer>
  );
};