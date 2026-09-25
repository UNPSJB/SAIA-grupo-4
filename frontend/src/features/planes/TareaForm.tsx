import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Heading, HStack, Input, Text, VStack } from "@chakra-ui/react";
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
import {
  tareaSchema,
  type TareaFormInput,
  type TareaFormValues,
} from "./validationSchema";
import type { DestinoTipo, TareaPOES } from "./types";
import {
  DIAS_COMPLETOS,
  frecuenciaToPeriodicidad,
  momentoToTipoPOES,
  parsearDetalleFrecuencia,
  periodicidadToFrecuencia,
  tipoPOESToMomento,
} from "./utils";
import { usePlanCatalogs } from "./hooks/usePlanCatalogs";
import { planesApi, type TareaPOESCreatePayload } from "./hooks/planApi";
import { DIAS_SEMANA } from "./constants";

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

const tareaAFormulario = (tarea: TareaPOES): TareaFormInput => {
  const periodicidad = frecuenciaToPeriodicidad[tarea.frecuencia];
  const detalle = parsearDetalleFrecuencia(
    tarea.frecuencia,
    tarea.detalle_frecuencia,
  );
  return {
    nombre: tarea.nombre,
    destino_tipo: tarea.equipo_id ? "equipo" : "sector",
    equipo_id: tarea.equipo_id,
    sector_id: tarea.sector_id,
    momento: tipoPOESToMomento[tarea.tipo_poes],
    periodicidad,
    dias: detalle.dias,
    dia_mes: detalle.dia_mes,
    pasos: tarea.metodo,
    insumos_quimicos: tarea.insumos_quimicos.map((iq) => iq.insumo_quimico_id),
    elementos_limpieza: tarea.elementos_limpieza.map(
      (el) => el.elemento_limpieza_id,
    ),
  };
};

const armarPayload = (
  values: TareaFormValues,
  consumos: Record<string, string>,
): TareaPOESCreatePayload => {
  const frecuencia = periodicidadToFrecuencia[values.periodicidad];

  let detalle_frecuencia: string | undefined;
  if (frecuencia === "semanal" && values.dias.length) {
    detalle_frecuencia = DIAS_COMPLETOS[values.dias[0]];
  } else if (frecuencia === "mensual" && values.dia_mes) {
    detalle_frecuencia = String(values.dia_mes);
  } else if (frecuencia === "dias_especificos" && values.dias.length) {
    detalle_frecuencia = values.dias.join(",");
  }

  return {
    nombre: values.nombre.trim(),
    tipo_poes: momentoToTipoPOES[values.momento],
    frecuencia,
    detalle_frecuencia,
    equipo_id: values.destino_tipo === "equipo" ? values.equipo_id : undefined,
    sector_id: values.destino_tipo === "sector" ? values.sector_id : undefined,
    metodo: values.pasos.trim(),
    insumos_quimicos: (values.insumos_quimicos ?? []).map((id) => {
      const consumo = Number((consumos[String(id)] ?? "").trim());
      return {
        insumo_quimico_id: id,
        dosis_sugerida:
          Number.isFinite(consumo) && consumo > 0 ? consumo : undefined,
      };
    }),
    elementos_limpieza: (values.elementos_limpieza ?? []).map((id) => ({
      elemento_limpieza_id: id,
      cantidad_requerida: 1,
    })),
  };
};

type TareaFormProps = {
  modo: "crear" | "modificar" | "ver";
  planId?: number;
  tarea?: TareaPOES;
  onCancelar?: () => void;
  onGuardado?: (tarea: TareaPOES) => void;
  enModal?: boolean;
};

export const TareaForm = ({
  modo,
  planId,
  tarea,
  onCancelar,
  onGuardado,
  enModal = false,
}: TareaFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const {
    catalogs,
    loading: catalogosCargando,
    error: errorCatalogos,
  } = usePlanCatalogs();

  const defaultValues: TareaFormInput =
    esModoModificar || esModoVer
      ? tareaAFormulario(tarea!)
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
          insumos_quimicos: [],
          elementos_limpieza: [],
        };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TareaFormInput, unknown, TareaFormValues>({
    resolver: zodResolver(tareaSchema),
    defaultValues,
  });

  const [success, setSuccess] = useState(false);

  const [consumos, setConsumos] = useState<Record<string, string>>(() =>
    esModoModificar || esModoVer
      ? Object.fromEntries(
          (tarea?.insumos_quimicos ?? [])
            .filter(
              (iq) =>
                iq.dosis_sugerida !== undefined && iq.dosis_sugerida !== null,
            )
            .map((iq) => [
              String(iq.insumo_quimico_id),
              String(iq.dosis_sugerida),
            ]),
        )
      : {},
  );
  const [erroresConsumo, setErroresConsumo] = useState<Record<string, string>>(
    {},
  );

  const actualizarConsumo = (id: number, texto: string) => {
    setConsumos((prev) => ({ ...prev, [String(id)]: texto }));
    setErroresConsumo((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
  };

  const destinoTipo = useWatch({ control, name: "destino_tipo" });
  const periodicidad = useWatch({ control, name: "periodicidad" }) as
    | TareaFormValues["periodicidad"]
    | undefined;
  const dias = (useWatch({ control, name: "dias" }) ?? []) as string[];
  const insumosSeleccionados = (useWatch({
    control,
    name: "insumos_quimicos",
  }) ?? []) as number[];
  const elementosSeleccionados = (useWatch({
    control,
    name: "elementos_limpieza",
  }) ?? []) as number[];
  const pasosRaw: string = useWatch({ control, name: "pasos" }) ?? "";
  const pasosVista = pasosRaw
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const opcionesEquipos = catalogs.equipos
    .filter(
      (e) =>
        e.activo ||
        ((esModoModificar || esModoVer) && tarea?.equipo_id === e.id),
    )
    .map((e) => ({
      label: `${e.nombre} (${e.sector?.nombre ?? "Sin sector"}${e.ubicacion ? " / " + e.ubicacion : ""})`,
      value: String(e.id),
    }));

  const opcionesSectores = catalogs.sectores
    .filter(
      (s) =>
        s.activo ||
        ((esModoModificar || esModoVer) && tarea?.sector_id === s.id),
    )
    .map((s) => ({ label: s.nombre, value: String(s.id) }));

  const opcionesInsumos = catalogs.insumosQuimicos
    .filter(
      (i) =>
        i.activo ||
        ((esModoModificar || esModoVer) &&
          tarea?.insumos_quimicos.some((iq) => iq.insumo_quimico_id === i.id)),
    )
    .map((i) => ({ label: i.nombre, value: String(i.id) }));

  const opcionesElementos = catalogs.elementosLimpieza
    .filter(
      (el) =>
        el.activo ||
        ((esModoModificar || esModoVer) &&
          tarea?.elementos_limpieza.some(
            (te) => te.elemento_limpieza_id === el.id,
          )),
    )
    .map((el) => ({ label: el.nombre, value: String(el.id) }));

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    const idsSeleccionados = values.insumos_quimicos ?? [];
    const errores: Record<string, string> = {};
    idsSeleccionados.forEach((id) => {
      const texto = (consumos[String(id)] ?? "").trim();
      const numero = Number(texto);
      if (!texto || !Number.isFinite(numero) || numero <= 0) {
        errores[String(id)] =
          "El consumo es obligatorio y debe ser un número mayor a 0.";
      }
    });
    if (Object.keys(errores).length > 0) {
      setErroresConsumo(errores);
      return;
    }
    setErroresConsumo({});
    try {
      const payload = armarPayload(values, consumos);
      if (esModoCrear) {
        if (!planId) {
          setError("root", {
            message: "No se pudo determinar el plan de la tarea.",
          });
          return;
        }
        const creada = await planesApi.crearTarea(planId, payload);
        setSuccess(true);
        onGuardado?.(creada);
      } else if (tarea) {
        const actualizada = await planesApi.modificarTarea(tarea.id, payload);
        setSuccess(true);
        onGuardado?.(actualizada);
      }
    } catch (e) {
      setError("root", {
        message:
          e instanceof Error
            ? e.message
            : "Ocurrió un error al guardar la tarea.",
      });
    }
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
              onChange={(value) =>
                setValue("destino_tipo", value as DestinoTipo, {
                  shouldValidate: true,
                })
              }
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
                  disabled={!esModoVer && catalogosCargando}
                  onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                  onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                  options={
                    catalogosCargando
                      ? [{ label: "Cargando equipos...", value: "" }]
                      : opcionesEquipos
                  }
                  error={errors.equipo_id?.message?.toString()}
                  {...register("equipo_id")}
                />
                {!catalogosCargando && opcionesEquipos.length === 0 && (
                  <AlertMessage
                    type='warning'
                    message='No hay equipos cargados en el sistema. Cargá un equipo para poder asignar un destino.'
                  />
                )}
              </>
            ) : (
              <>
                <SelectField
                  label='Seleccionar Sector / Área'
                  placeholder='Seleccione un sector'
                  readOnly={esModoVer}
                  disabled={!esModoVer && catalogosCargando}
                  onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                  onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                  options={
                    catalogosCargando
                      ? [{ label: "Cargando sectores...", value: "" }]
                      : opcionesSectores
                  }
                  error={errors.sector_id?.message?.toString()}
                  {...register("sector_id")}
                />
                {!catalogosCargando && opcionesSectores.length === 0 && (
                  <AlertMessage
                    type='warning'
                    message='No hay sectores cargados en el sistema. Cargá un sector para poder asignar un destino.'
                  />
                )}
              </>
            )}
            {errorCatalogos && !esModoVer && (
              <AlertMessage type='error' message={errorCatalogos} />
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
                      value as
                        | "pre-operacional"
                        | "operacional"
                        | "post-operacional",
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
                onChange={(selected) =>
                  setValue("dias", selected, { shouldValidate: true })
                }
                options={DIAS_SEMANA.map((d) => ({
                  label: d.label,
                  value: d.value,
                }))}
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
                onChange={(selected) =>
                  setValue("dias", selected, { shouldValidate: true })
                }
                options={DIAS_SEMANA.map((d) => ({
                  label: d.label,
                  value: d.value,
                }))}
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
              placeholder={
                "Ej.\n1. Desconectar energía eléctrica.\n2. Retirar residuos sólidos."
              }
              error={errors.pasos?.message}
              {...register("pasos")}
            />
            {pasosVista.length > 0 && (
              <Box
                w='100%'
                bg='gray.50'
                borderWidth='1px'
                borderRadius='md'
                p={3}
              >
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
              value={insumosSeleccionados.map(String)}
              onChange={(selected) => {
                const ids = selected.map(Number);
                setValue("insumos_quimicos", ids);
                setConsumos((prev) => {
                  const next: Record<string, string> = {};
                  ids.forEach((id) => {
                    if (prev[String(id)] !== undefined) {
                      next[String(id)] = prev[String(id)];
                    }
                  });
                  return next;
                });
                setErroresConsumo({});
              }}
              options={opcionesInsumos}
            />

            {insumosSeleccionados.length > 0 && (
              <Box
                w='100%'
                borderWidth='1px'
                borderColor='border.subtle'
                borderRadius='md'
                p={3}
              >
                <Text fontSize='sm' fontWeight='semibold' mb={2}>
                  Consumo estimado por insumo seleccionado
                </Text>
                <VStack align='stretch' gap={3}>
                  {insumosSeleccionados.map((id) => {
                    const insumo = catalogs.insumosQuimicos.find(
                      (i) => i.id === id,
                    );
                    const unidad =
                      insumo?.unidad_medida?.simbolo ??
                      insumo?.unidad_medida?.nombre;
                    const error = erroresConsumo[String(id)];
                    return (
                      <Box key={id}>
                        <HStack gap={2} align='center' flexWrap='wrap'>
                          <Text flex='1' fontWeight='medium'>
                            {insumo?.nombre ?? `Insumo ${id}`}
                          </Text>
                          <HStack gap={2}>
                            <Text fontSize='sm' color='gray.600'>
                              Consumo
                            </Text>
                            <Input
                              type='number'
                              min='0'
                              step='any'
                              disabled={esModoVer}
                              value={consumos[String(id)] ?? ""}
                              onChange={(e) =>
                                actualizarConsumo(id, e.target.value)
                              }
                              placeholder='0'
                              w={32}
                              size='sm'
                            />
                            <Text fontSize='sm' color='gray.600' minW={8}>
                              {unidad ?? ""}
                            </Text>
                          </HStack>
                        </HStack>
                        {error && (
                          <Text color='red.500' fontSize='sm' mt={1}>
                            {error}
                          </Text>
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            )}

            {!opcionesInsumos.length && (
              <AlertMessage
                type='error'
                message='No hay insumos quimicos cargados'
              />
            )}

            <CheckboxGroupField
              label='Elementos de Limpieza'
              disabled={esModoVer}
              value={elementosSeleccionados.map(String)}
              onChange={(selected) =>
                setValue("elementos_limpieza", selected.map(Number))
              }
              options={opcionesElementos}
              error={
                !opcionesElementos.length
                  ? undefined
                  : errors.elementos_limpieza?.message?.toString()
              }
            />
            {!opcionesElementos.length && (
              <AlertMessage
                type='error'
                message='No hay elementos de limpieza cargados'
              />
            )}
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
