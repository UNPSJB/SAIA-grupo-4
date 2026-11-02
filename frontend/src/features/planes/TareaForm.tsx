import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiEdit2,
  FiEye,
  FiSave,
  FiTool,
  FiXCircle,
} from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  RadioGroupField,
  SubmitButton,
  TextField,
} from "../../components/ui";
import {
  tareaSchema,
  type TareaFormInput,
  type TareaFormValues,
} from "./validationSchema";
import type { DestinoTipo, Periodicidad, TareaPOES } from "./types";
import { tareaAFormulario } from "./utils/formTransformers";
import { usePlanCatalogs } from "./hooks/usePlanCatalogs";
import { useRecursosTarea } from "./hooks/useRecursosTarea";
import { useTareaCatalogs } from "./hooks/useTareaCatalogs";
import { useTareaFormState } from "./hooks/useTareaFormState";
import { useTareaSubmit } from "./hooks/useTareaSubmit";
import {
  DestinoSelector,
  FrecuenciaSelector,
  ProcedimientoField,
  RecursosSection,
  Seccion,
} from "./components/form";

type ModoForm = "crear" | "modificar" | "ver";

type TareaFormProps = {
  modo: ModoForm;
  planId?: number;
  tarea?: TareaPOES;
  onCancelar?: () => void;
  onGuardado?: (tarea: TareaPOES) => void;
  enModal?: boolean;
};

const TITULOS: Record<ModoForm, string> = {
  ver: "Ver Tarea POES",
  crear: "Agregar Tarea",
  modificar: "Editar Tarea",
};

const PASOS = [
  {
    titulo: "Datos generales",
    descripcion: "Nombre y destino de la tarea",
    campos: ["nombre", "destino_tipo", "equipo_id", "sector_id"],
  },
  {
    titulo: "Programación y procedimiento",
    descripcion: "Momento, frecuencia y pasos",
    campos: ["momento", "periodicidad", "dias", "dia_mes", "pasos"],
  },
  {
    titulo: "Recursos",
    descripcion: "Insumos y elementos requeridos",
    campos: ["insumos_quimicos", "elementos_limpieza"],
  },
] satisfies Array<{
  titulo: string;
  descripcion: string;
  campos: Array<keyof TareaFormInput>;
}>;

const VALORES_INICIALES_NUEVA_TAREA: TareaFormInput = {
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

/**
 * Formulario de Tareas POES. Es el mismo componente para crear, modificar y ver:
 * el `modo` decide qué campos son editables, qué título se muestra y si el
 * formulario se envía o solo se lee.
 *
 * El componente queda como orquestador: delega el estado de recursos a
 * `useTareaFormState`, el envío a `useTareaSubmit`, el armado de las opciones de
 * los desplegables a `useTareaCatalogs` y el render de cada sección a los
 * componentes de `./components/form`.
 */
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

  /*
    1. Valores por defecto del formulario
    Al editar o ver, la tarea del backend se traduce al shape del formulario.
    Al crear, se arranca con un destino "equipo" y periodicidad diaria.
    Se memoiza para no re-transformar la tarea en cada render.
  */

  const esEdicion = esModoModificar || esModoVer;
  const defaultValues: TareaFormInput = useMemo(
    () =>
      esEdicion ? tareaAFormulario(tarea!) : VALORES_INICIALES_NUEVA_TAREA,
    [esEdicion, tarea],
  );

  // 2. Formulario (react-hook-form + zod)
  const formMethods = useForm<TareaFormInput, unknown, TareaFormValues>({
    resolver: zodResolver(tareaSchema),
    defaultValues,
  });

  const {
    register,
    control,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = formMethods;

  const [success, setSuccess] = useState(false);
  const [paso, setPaso] = useState(0);
  const inicioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inicioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [paso]);

  // 3. Valores observados (re-renderizan solo lo que depende de ellos)
  const destinoTipo = useWatch({ control, name: "destino_tipo" }) as
    | DestinoTipo
    | undefined;
  const equipoId = useWatch({ control, name: "equipo_id" }) as
    | number
    | string
    | undefined;
  const sectorId = useWatch({ control, name: "sector_id" }) as
    | number
    | string
    | undefined;
  const periodicidad = useWatch({ control, name: "periodicidad" }) as
    | Periodicidad
    | undefined;
  const dias = (useWatch({ control, name: "dias" }) ?? []) as string[];
  const diaMes = useWatch({ control, name: "dia_mes" }) as string | undefined;
  const pasos = useWatch({ control, name: "pasos" }) ?? "";
  const insumosSeleccionados = (useWatch({
    control,
    name: "insumos_quimicos",
  }) ?? []) as number[];
  const elementosSeleccionados = (useWatch({
    control,
    name: "elementos_limpieza",
  }) ?? []) as number[];

  // 4. Datos externos
  // Catálogos generales: equipos, sectores, personal, insumos y elementos.
  const {
    catalogs,
    loading: catalogosCargando,
    error: errorCatalogos,
  } = usePlanCatalogs();

  /* Insumos y elementos disponibles para el destino elegido. El backend aplica
     las reglas de herencia (insumos) y aislamiento (elementos) por destino. */
  const {
    insumos: recursosInsumos,
    elementos: recursosElementos,
    loading: recursosCargando,
    error: errorRecursos,
  } = useRecursosTarea({
    destinoTipo,
    equipoId,
    sectorId,
    modo,
    insumosSeleccionados,
    elementosSeleccionados,
  });

  // Opciones de los desplegables, deduplicadas y etiquetadas por origen.
  const {
    opcionesEquipos,
    opcionesSectores,
    opcionesInsumos,
    opcionesElementos,
  } = useTareaCatalogs({
    catalogs,
    recursosInsumos,
    recursosElementos,
    esModoModificar,
    esModoVer,
    tareaEquipoId: tarea?.equipo_id,
    tareaSectorId: tarea?.sector_id,
  });

  // 5. Estado local de recursos (consumos, diluciones, cantidades)
  const {
    consumos,
    diluciones,
    cantidades,
    erroresConsumo,
    erroresCantidad,
    actualizarConsumo,
    actualizarDilucion,
    actualizarCantidad,
    aplicarSeleccionInsumos,
    aplicarSeleccionElementos,
    setErroresConsumo,
    setErroresCantidad,
    resetearEstadoRecursos,
  } = useTareaFormState({ modo, tarea });

  /* 6. Al cambiar el destino se descartan los recursos del destino anterior
    Un insumo puede no estar disponible para el nuevo equipo/sector, así que se
    limpian selecciones y detalles para no dejar datos huérfanos. */
  const claveDestino = `${destinoTipo ?? ""}:${
    destinoTipo === "equipo" ? (equipoId ?? "") : (sectorId ?? "")
  }`;
  const claveDestinoPrevia = useRef(claveDestino);

  useEffect(() => {
    if (claveDestinoPrevia.current === claveDestino) return;
    claveDestinoPrevia.current = claveDestino;
    setValue("insumos_quimicos", []);
    setValue("elementos_limpieza", []);
    resetearEstadoRecursos();
  }, [claveDestino, setValue, resetearEstadoRecursos]);

  // 7. Handlers de selección de recursos
  const handleChangeInsumos = (ids: number[]) => {
    setValue("insumos_quimicos", ids, { shouldValidate: true });
    clearErrors("root");
    clearErrors("elementos_limpieza");
    aplicarSeleccionInsumos(ids);
  };

  const handleChangeElementos = (ids: number[]) => {
    setValue("elementos_limpieza", ids, { shouldValidate: true });
    clearErrors("root");
    clearErrors("elementos_limpieza");
    aplicarSeleccionElementos(ids);
  };

  // 8. Envío (validación de consumos/cantidades + llamada a la API)
  const onSubmit = useTareaSubmit({
    modo,
    planId,
    tarea,
    onGuardado,
    formMethods,
    estadoRecursos: {
      consumos,
      diluciones,
      cantidades,
      setErroresConsumo,
      setErroresCantidad,
    },
    setSuccess,
    onValidationError: (campos) => {
      const indice = PASOS.findIndex((pasoActual) =>
        pasoActual.campos.some((campo) => campos.includes(campo)),
      );
      if (indice >= 0) setPaso(indice);
    },
  });

  /**
   * Antes de avanzar valida solo los campos del paso actual. Si el resolver
   * también marca campos de otros pasos, no bloquea la navegación: cada paso se
   * vuelve a validar cuando le toca.
   */
  const avanzar = async () => {
    const camposPaso = PASOS[paso].campos;
    await formMethods.trigger(camposPaso);
    const hayErrores = camposPaso.some(
      (campo) => formMethods.getFieldState(campo).invalid,
    );
    if (!hayErrores) {
      formMethods.clearErrors("root");
      setPaso((actual) => Math.min(actual + 1, PASOS.length - 1));
    }
  };

  // 9. Render
  return (
    <FormContainer modal={enModal}>
      <FormHeader
        title={TITULOS[modo]}
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiTool}
      />

      {/* En modo ver no hay submit: el form sirve solo para mostrar los datos. */}
      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4} align='stretch' ref={inicioRef}>
          {!esModoVer && (
            <HStack
              gap={2}
              align='stretch'
              w='100%'
              flexWrap='wrap'
              aria-label='Pasos del formulario'
            >
              {PASOS.map((pasoActual, index) => {
                const activo = index === paso;
                const completado = index < paso;

                return (
                  <Box
                    key={pasoActual.titulo}
                    flex='1'
                    minW='180px'
                    p={3}
                    borderWidth='1px'
                    borderRadius='md'
                    borderColor={activo ? "green.400" : "border.subtle"}
                    bg={activo || completado ? "green.50" : undefined}
                    opacity={activo || completado ? 1 : 0.72}
                  >
                    <HStack gap={2} align='start'>
                      <Box
                        boxSize='6'
                        borderRadius='full'
                        bg={activo || completado ? "green.500" : "gray.200"}
                        color={activo || completado ? "white" : "gray.600"}
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        fontSize='sm'
                        fontWeight='bold'
                        flexShrink={0}
                      >
                        {index + 1}
                      </Box>
                      <Box minW='0'>
                        <Text
                          fontSize='sm'
                          fontWeight={activo ? "bold" : "semibold"}
                        >
                          {pasoActual.titulo}
                        </Text>
                        <Text fontSize='xs' color='fg.muted'>
                          {pasoActual.descripcion}
                        </Text>
                      </Box>
                    </HStack>
                  </Box>
                );
              })}
            </HStack>
          )}

          <Seccion
            numero={1}
            titulo='Identificación y Destino'
            visible={esModoVer || paso === 0}
          >
            <TextField
              label='Nombre de la Tarea'
              disabled={esModoVer}
              placeholder='Ej. Sanitización profunda de Heladera y Burletes'
              error={errors.nombre?.message}
              {...register("nombre")}
            />

            <DestinoSelector
              destinoTipo={destinoTipo}
              onChangeDestino={(value) =>
                setValue("destino_tipo", value as DestinoTipo, {
                  shouldValidate: true,
                })
              }
              opcionesEquipos={opcionesEquipos}
              opcionesSectores={opcionesSectores}
              catalogosCargando={catalogosCargando}
              errorCatalogos={errorCatalogos}
              disabled={esModoVer}
              equipoId={equipoId}
              sectorId={sectorId}
              onChangeEquipo={(value) =>
                setValue("equipo_id", value, { shouldValidate: true })
              }
              onChangeSector={(value) =>
                setValue("sector_id", value, { shouldValidate: true })
              }
              errorEquipo={errors.equipo_id?.message?.toString()}
              errorSector={errors.sector_id?.message?.toString()}
            />
          </Seccion>

          <Seccion
            numero={2}
            titulo='Momento Operativo y Frecuencia'
            visible={esModoVer || paso === 1}
          >
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

            <FrecuenciaSelector
              periodicidad={periodicidad}
              onChangePeriodicidad={(value) =>
                setValue("periodicidad", value as Periodicidad, {
                  shouldValidate: true,
                })
              }
              dias={dias}
              onChangeDias={(selected) =>
                setValue("dias", selected, { shouldValidate: true })
              }
              diaMes={diaMes}
              onChangeDiaMes={(value) =>
                setValue("dia_mes", value, { shouldValidate: true })
              }
              disabled={esModoVer}
              errorPeriodicidad={errors.periodicidad?.message?.toString()}
              errorDias={errors.dias?.message?.toString()}
              errorDiaMes={errors.dia_mes?.message}
            />
          </Seccion>

          <Seccion
            numero={3}
            titulo='Guía y Procedimiento (Paso a Paso)'
            visible={esModoVer || paso === 1}
          >
            <ProcedimientoField
              value={pasos}
              onChange={(value) =>
                setValue("pasos", value, { shouldValidate: true })
              }
              disabled={esModoVer}
              error={errors.pasos?.message}
            />
          </Seccion>

          <Seccion
            numero={4}
            titulo='Recursos Requeridos'
            visible={esModoVer || paso === 2}
          >
            <RecursosSection
              recursosCargando={recursosCargando}
              errorRecursos={errorRecursos}
              opcionesInsumos={opcionesInsumos}
              opcionesElementos={opcionesElementos}
              insumosSeleccionados={insumosSeleccionados}
              elementosSeleccionados={elementosSeleccionados}
              consumos={consumos}
              diluciones={diluciones}
              cantidades={cantidades}
              erroresConsumo={erroresConsumo}
              erroresCantidad={erroresCantidad}
              recursosInsumos={recursosInsumos}
              disabled={esModoVer}
              onChangeInsumos={handleChangeInsumos}
              onChangeElementos={handleChangeElementos}
              onActualizarConsumo={actualizarConsumo}
              onActualizarDilucion={actualizarDilucion}
              onActualizarCantidad={actualizarCantidad}
              errorElementos={errors.elementos_limpieza?.message?.toString()}
            />
          </Seccion>

          <FormActions justify='end'>
            {esModoVer ? (
              <CancelButton
                text='Cerrar'
                icon={FiXCircle}
                onClick={onCancelar}
                colorPalette='gray'
              />
            ) : (
              <>
                {paso > 0 && (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      formMethods.clearErrors("root");
                      setPaso((actual) => Math.max(actual - 1, 0));
                    }}
                  >
                    <FiArrowLeft /> Atrás
                  </Button>
                )}
                {paso < PASOS.length - 1 ? (
                  <Button
                    type='button'
                    colorPalette='green'
                    onClick={avanzar}
                  >
                    Siguiente <FiArrowRight />
                  </Button>
                ) : (
                  <SubmitButton
                    text='Guardar Tarea'
                    icon={FiSave}
                    loading={isSubmitting}
                    type='submit'
                    colorPalette='green'
                    disabled={!isValid}
                  />
                )}
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
