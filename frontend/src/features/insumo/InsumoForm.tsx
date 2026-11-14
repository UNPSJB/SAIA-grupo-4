import { BASE_URL, ITEMS_SELECT } from "../../config";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, HStack, Icon, Text, VStack } from "@chakra-ui/react";

import { useInsumoSubmit, type InsumoPayload } from "./hooks/useInsumoSubmit";
import { SeccionNutricionalInsumo } from "./components/SeccionNutricionalInsumo";
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
import {
  FiArrowLeft,
  FiArrowRight,
  FiBox,
  FiEdit2,
  FiSave,
  FiXCircle,
  FiEye,
} from "react-icons/fi";

type PasoInsumo = {
  id: "generales" | "nutricion";
  titulo: string;
  descripcion: string;
  campos: (keyof InsumoFormValues)[];
};

const PASOS_INSUMO: PasoInsumo[] = [
  {
    id: "generales",
    titulo: "Datos generales",
    descripcion: "Nombre, unidad, categoría y datos de rótulo",
    campos: [
      "nombre",
      "unidad_medida_id",
      "densidad_g_ml",
      "peso_unitario_g",
      "categoria",
      "descripcion",
      "denominacion_rotulo",
      "clase_funcional",
      "numero_ins",
    ],
  },
  {
    id: "nutricion",
    titulo: "Información nutricional",
    descripcion: "Valores cada 100 g / 100 ml (SARA 2 o carga manual)",
    campos: [
      "base_calculo",
      "alimento_referencia_id",
      "fuente_nutricional",
      "valor_energetico_kcal",
      "carbohidratos_g",
      "azucares_totales_g",
      "azucares_anadidos_g",
      "proteinas_g",
      "grasas_totales_g",
      "grasas_saturadas_g",
      "grasas_trans_g",
      "fibra_g",
      "sodio_mg",
    ],
  },
];

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
          descripcion: insumo!.descripcion || "",
          densidad_g_ml:
            insumo?.densidad_g_ml != null ? String(insumo.densidad_g_ml) : "",
          peso_unitario_g:
            insumo?.peso_unitario_g != null ? String(insumo.peso_unitario_g) : "",
          denominacion_rotulo: insumo?.denominacion_rotulo || "",
          clase_funcional: insumo?.clase_funcional || "",
          numero_ins: insumo?.numero_ins || "",
          base_calculo: insumo?.base_calculo === "100ml" ? "100ml" : "100g",
          alimento_referencia_id:
            insumo?.alimento_referencia_id != null
              ? String(insumo.alimento_referencia_id)
              : "",
          fuente_nutricional: insumo?.fuente_nutricional || "",
          valor_energetico_kcal:
            insumo?.valor_energetico_kcal != null
              ? String(insumo.valor_energetico_kcal)
              : "",
          carbohidratos_g:
            insumo?.carbohidratos_g != null ? String(insumo.carbohidratos_g) : "",
          azucares_totales_g:
            insumo?.azucares_totales_g != null
              ? String(insumo.azucares_totales_g)
              : "",
          azucares_anadidos_g:
            insumo?.azucares_anadidos_g != null
              ? String(insumo.azucares_anadidos_g)
              : "",
          proteinas_g:
            insumo?.proteinas_g != null ? String(insumo.proteinas_g) : "",
          grasas_totales_g:
            insumo?.grasas_totales_g != null ? String(insumo.grasas_totales_g) : "",
          grasas_saturadas_g:
            insumo?.grasas_saturadas_g != null
              ? String(insumo.grasas_saturadas_g)
              : "",
          grasas_trans_g:
            insumo?.grasas_trans_g != null ? String(insumo.grasas_trans_g) : "",
          fibra_g: insumo?.fibra_g != null ? String(insumo.fibra_g) : "",
          sodio_mg: insumo?.sodio_mg != null ? String(insumo.sodio_mg) : "",
        }
      : {
          nombre: "",
          unidad_medida_id: "",
          categoria: "",
          descripcion: "",
          densidad_g_ml: "",
          peso_unitario_g: "",
          denominacion_rotulo: "",
          clase_funcional: "",
          numero_ins: "",
          base_calculo: "100g",
          alimento_referencia_id: "",
          fuente_nutricional: "",
          valor_energetico_kcal: "",
          carbohidratos_g: "",
          azucares_totales_g: "",
          azucares_anadidos_g: "",
          proteinas_g: "",
          grasas_totales_g: "",
          grasas_saturadas_g: "",
          grasas_trans_g: "",
          fibra_g: "",
          sodio_mg: "",
        };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getFieldState,
    formState: { errors, isSubmitting, isValid, dirtyFields },
    setError,
    clearErrors,
    reset,
  } = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoSchema),
    defaultValues,
    mode: "onChange",
  });

  const [paso, setPaso] = useState(0);
  const inicioRef = useRef<HTMLDivElement>(null);

  const unidadSeleccionadaId = watch("unidad_medida_id");
  const categoriaSeleccionada = watch("categoria");
  const claseFuncionalSeleccionada = watch("clase_funcional");

  const esEnvase =
    (categoriaSeleccionada || "").trim().toLowerCase() === "envase";
  const pasosVisibles = useMemo(
    () =>
      esEnvase
        ? PASOS_INSUMO.filter((item) => item.id === "generales")
        : PASOS_INSUMO,
    [esEnvase]
  );
  const pasoActual = Math.min(paso, Math.max(0, pasosVisibles.length - 1));
  const esUltimoPaso = pasoActual >= pasosVisibles.length - 1;
  const pasoActualMeta = pasosVisibles[pasoActual];

  useEffect(() => {
    if (paso !== pasoActual) {
      setPaso(pasoActual);
    }
  }, [paso, pasoActual]);

  useEffect(() => {
    if (esModoVer) return;
    inicioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pasoActual, esModoVer]);

  const esAditivo = (categoriaSeleccionada || "").trim().toLowerCase() === "aditivo";
  const esAromatizante =
    (claseFuncionalSeleccionada || "").trim().toLowerCase() === "aromatizante" ||
    (claseFuncionalSeleccionada || "").trim().toLowerCase() === "saborizante" ||
    (claseFuncionalSeleccionada || "").trim().toLowerCase().includes("aromatizante");

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

  useEffect(() => {
    if (!esModoCrear || dirtyFields.base_calculo || !tipoMagnitud) return;
    setValue("base_calculo", tipoMagnitud === "volumen" ? "100ml" : "100g", {
      shouldValidate: true,
    });
  }, [esModoCrear, tipoMagnitud, dirtyFields.base_calculo, setValue]);

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

  const avanzar = async () => {
    const camposPaso = pasoActualMeta?.campos ?? [];
    const valido = await trigger(camposPaso, { shouldFocus: true });
    const tieneErrorPaso = camposPaso.some(
      (campo) => getFieldState(campo).invalid
    );
    if (!valido || tieneErrorPaso) return;
    setPaso((prev) => Math.min(prev + 1, pasosVisibles.length - 1));
  };

  const retroceder = () => {
    setPaso((prev) => Math.max(0, prev - 1));
  };

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(false);
    clearErrors("root");
    setNombreEnviado(values.nombre);
    const cleanedValues: InsumoPayload = {
      ...values,
      densidad_g_ml: tipoMagnitud === "volumen" ? values.densidad_g_ml : undefined,
      peso_unitario_g: tipoMagnitud === "cantidad" ? values.peso_unitario_g : undefined,
      denominacion_rotulo: values.denominacion_rotulo?.trim() || undefined,
      clase_funcional: esAditivo ? values.clase_funcional?.trim() || undefined : undefined,
      numero_ins: esAditivo ? values.numero_ins?.trim() || undefined : undefined,
    };
    const res = await submit(cleanedValues);
    if (res.status === "error") {
      setError("root", { message: res.message });
    } else if (res.status === "success") {
      reset(defaultValues);
      setPaso(0);
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
      <form
        onSubmit={
          esModoVer
            ? undefined
            : esUltimoPaso
              ? onSubmit
              : (e) => {
                  e.preventDefault();
                  void avanzar();
                }
        }
        noValidate
      >
        <VStack gap={4} align='stretch' ref={inicioRef}>
          {!esModoVer && pasosVisibles.length > 1 && (
            <HStack
              gap={2}
              align='stretch'
              w='100%'
              flexWrap='wrap'
              aria-label='Pasos del formulario'
            >
              {pasosVisibles.map((item, index) => {
                const activo = index === pasoActual;
                const completado = index < pasoActual;
                return (
                  <Box
                    key={item.id}
                    flex='1'
                    minW='180px'
                    p={3}
                    borderWidth='1px'
                    borderRadius='md'
                    borderColor={activo ? "green.400" : "border.subtle"}
                    bg={activo || completado ? "green.50" : undefined}
                    opacity={activo || completado ? 1 : 0.72}
                  >
                    <HStack gap={2} align='center'>
                      <Box
                        boxSize='6'
                        borderRadius='full'
                        bg={activo || completado ? "green.500" : "gray.200"}
                        color={activo || completado ? "white" : "gray.600"}
                        fontSize='xs'
                        fontWeight='bold'
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        flexShrink={0}
                      >
                        {index + 1}
                      </Box>
                      <Box>
                        <Text
                          fontSize='sm'
                          fontWeight={activo ? "semibold" : "medium"}
                          color={activo || completado ? "green.800" : undefined}
                        >
                          {item.titulo}
                        </Text>
                        <Text
                          fontSize='xs'
                          color={activo || completado ? "green.700" : "fg.muted"}
                        >
                          {item.descripcion}
                        </Text>
                      </Box>
                    </HStack>
                  </Box>
                );
              })}
            </HStack>
          )}

          <Box
            display={
              esModoVer || pasoActualMeta?.id === "generales" ? "block" : "none"
            }
          >
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

              <TextField
                label='Denominación para Rótulo (opcional)'
                disabled={esModoVer}
                defaultValue={defaultValues.denominacion_rotulo}
                placeholder='Si se deja vacío, se usará el nombre del insumo'
                error={errors.denominacion_rotulo?.message}
                {...register("denominacion_rotulo")}
              />

              {esAditivo && (
                <>
                  <SelectField
                    label='Clase Funcional (aditivo)'
                    placeholder='Selecciona la clase funcional'
                    readOnly={esModoVer}
                    defaultValue={defaultValues.clase_funcional}
                    onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                    onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                    options={[
                      { label: "Conservante", value: "Conservante" },
                      { label: "Antioxidante", value: "Antioxidante" },
                      { label: "Acidulante", value: "Acidulante" },
                      { label: "Emulsionante", value: "Emulsionante" },
                      { label: "Estabilizante", value: "Estabilizante" },
                      { label: "Espesante", value: "Espesante" },
                      { label: "Gelificante", value: "Gelificante" },
                      { label: "Colorante", value: "Colorante" },
                      { label: "Aromatizante / Saborizante", value: "Aromatizante" },
                      { label: "Leudante químico", value: "Leudante químico" },
                      { label: "Regulador de acidez", value: "Regulador de acidez" },
                      { label: "Secuestrante", value: "Secuestrante" },
                      { label: "Edulcorante", value: "Edulcorante" },
                      { label: "Humectante", value: "Humectante" },
                      { label: "Antihumectante", value: "Antihumectante" },
                      { label: "Mejorador de harina", value: "Mejorador de harina" },
                      { label: "Resaltador del sabor", value: "Resaltador del sabor" },
                    ]}
                    error={errors.clase_funcional?.message}
                    {...register("clase_funcional")}
                  />

                  <TextField
                    label={esAromatizante ? "Número INS (no requerido para aromatizantes)" : "Número INS"}
                    disabled={esModoVer}
                    defaultValue={defaultValues.numero_ins}
                    placeholder={esAromatizante ? "Opcional (ej: 282, 300)" : "Ej. 282, 300, 500ii"}
                    error={errors.numero_ins?.message}
                    {...register("numero_ins")}
                  />
                </>
              )}
            </FormGrid>
          </Box>

          {!esEnvase && (
            <Box
              display={
                esModoVer || pasoActualMeta?.id === "nutricion" ? "block" : "none"
              }
            >
              <FormGrid>
                <SeccionNutricionalInsumo
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  esModoVer={esModoVer}
                  esAditivo={esAditivo}
                  insumo={insumo}
                />
              </FormGrid>
            </Box>
          )}

          <FormActions justify='end'>
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
                {pasoActual > 0 && (
                  <Button
                    type='button'
                    variant='outline'
                    colorPalette='gray'
                    onClick={retroceder}
                  >
                    <Icon as={FiArrowLeft} />
                    Atrás
                  </Button>
                )}
                {!esUltimoPaso ? (
                  <Button
                    type='button'
                    colorPalette='green'
                    onClick={() => void avanzar()}
                  >
                    Siguiente
                    <Icon as={FiArrowRight} />
                  </Button>
                ) : (
                  <SubmitButton
                    text='Guardar'
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
