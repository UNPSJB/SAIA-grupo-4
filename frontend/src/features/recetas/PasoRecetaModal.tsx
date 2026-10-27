import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Text, VStack } from "@chakra-ui/react";
import {
  FiEdit2,
  FiEye,
  FiFileText,
  FiHash,
  FiSave,
  FiTag,
  FiTool,
  FiXCircle,
} from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  FormModal,
  SubmitButton,
  TextAreaField,
  TextField,
} from "../../components/ui";
import {
  pasoRecetaSchema,
  type PasoRecetaFormInput,
  type PasoRecetaFormValues,
} from "./validationSchema";
import type { PasoReceta } from "./types";
import { usePasoCatalogs } from "./hooks/usePasoCatalogs";
import { usePasoFormState } from "./hooks/usePasoFormState";
import { usePasoSubmit } from "./hooks/usePasoSubmit";
import {
  EquiposPasoSelector,
  InsumosPasoSelector,
  Seccion,
} from "./components/form";

export type ModoPasoForm = "crear" | "modificar" | "ver";

export interface PasoRecetaFormProps {
  modo: ModoPasoForm;
  recetaId?: number;
  paso?: PasoReceta;
  pasosExistentes?: PasoReceta[];
  ordenSugerido?: number;
  onCancelar?: () => void;
  onGuardado?: (paso: PasoReceta) => void;
  enModal?: boolean;
}

const TITULOS: Record<ModoPasoForm, string> = {
  ver: "Detalle del Paso",
  crear: "Agregar Paso",
  modificar: "Editar Paso",
};

const pasoAFormulario = (paso: PasoReceta): PasoRecetaFormInput => ({
  numero_orden: String(paso.numero_orden),
  titulo: paso.titulo,
  instrucciones: paso.instrucciones,
  insumos: (paso.insumos ?? []).map((i) => i.insumo_id),
  equipos: (paso.equipos ?? []).map((e) => e.equipo_id),
});

const MENSAJE_ERROR_CAMPOS =
  "Hay campos incompletos o incorrectos. Por favor, revisá las secciones marcadas en rojo más arriba.";

export const PasoRecetaForm = ({
  modo,
  recetaId,
  paso,
  pasosExistentes,
  ordenSugerido = 1,
  onCancelar,
  onGuardado,
  enModal = false,
}: PasoRecetaFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";
  const esEdicion = esModoModificar || esModoVer;

  const defaultValues = useMemo<PasoRecetaFormInput>(
    () =>
      esEdicion && paso
        ? pasoAFormulario(paso)
        : {
            numero_orden: String(ordenSugerido),
            titulo: "",
            instrucciones: "",
            insumos: [],
            equipos: [],
          },
    [esEdicion, ordenSugerido, paso],
  );

  const formMethods = useForm<
    PasoRecetaFormInput,
    unknown,
    PasoRecetaFormValues
  >({
    resolver: zodResolver(pasoRecetaSchema),
    defaultValues,
  });

  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = formMethods;

  const [success, setSuccess] = useState(false);

  const regNumeroOrden = register("numero_orden");
  const regTitulo = register("titulo");

  const instrucciones = useWatch({ control, name: "instrucciones" }) ?? "";
  const insumosSeleccionados = (useWatch({
    control,
    name: "insumos",
  }) ?? []) as number[];
  const equiposSeleccionados = (useWatch({
    control,
    name: "equipos",
  }) ?? []) as number[];

  const {
    opcionesInsumos,
    opcionesEquipos,
    unidadesPorInsumo,
    loading: catalogosCargando,
    error: errorCatalogos,
  } = usePasoCatalogs({ modo, paso });

  const {
    consumos,
    cantidades,
    erroresConsumo,
    erroresCantidad,
    actualizarConsumo,
    actualizarCantidad,
    aplicarSeleccionInsumos,
    aplicarSeleccionEquipos,
    setErroresConsumo,
    setErroresCantidad,
  } = usePasoFormState({ modo, paso });

  const hayErroresEnCampos = useMemo(() => {
    const tieneErroresRHF = Object.keys(errors).some(
      (key) => key !== "root" && Boolean(errors[key as keyof typeof errors]),
    );
    const tieneErroresConsumo = Object.values(erroresConsumo).some(Boolean);
    const tieneErroresCantidad = Object.values(erroresCantidad).some(Boolean);
    return tieneErroresRHF || tieneErroresConsumo || tieneErroresCantidad;
  }, [errors, erroresConsumo, erroresCantidad]);

  const mostrarErrorGeneral = Boolean(
    errors.root?.message &&
      (errors.root.message !== MENSAJE_ERROR_CAMPOS || hayErroresEnCampos),
  );

  const handleChangeInsumos = (ids: number[]) => {
    setValue("insumos", ids, { shouldValidate: true });
    clearErrors("root");
    aplicarSeleccionInsumos(ids);
  };

  const handleChangeEquipos = (ids: number[]) => {
    setValue("equipos", ids, { shouldValidate: true });
    clearErrors("root");
    aplicarSeleccionEquipos(ids);
  };

  const onSubmit = usePasoSubmit({
    modo,
    recetaId,
    paso,
    pasosExistentes,
    onGuardado,
    formMethods,
    estadoRecursos: {
      consumos,
      cantidades,
      setErroresConsumo,
      setErroresCantidad,
    },
    setSuccess,
  });

  const sinInsumos = opcionesInsumos.length === 0;
  const sinEquipos = opcionesEquipos.length === 0;

  return (
    <FormContainer modal={enModal}>
      <FormHeader
        title={TITULOS[modo]}
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiHash}
      />

      <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
        <VStack gap={4} align="stretch">
          <Seccion numero={1} titulo="Identificación del Paso" Icon={FiTag}>
            <TextField
              label="Número de orden"
              type="number"
              min={1}
              step={1}
              hideSpinners
              disabled={esModoVer}
              placeholder="Ej. 1"
              error={errors.numero_orden?.message}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onPaste={(e) => {
                const texto = e.clipboardData.getData("text");
                if (!/^\d+$/.test(texto)) {
                  e.preventDefault();
                }
              }}
              {...regNumeroOrden}
              onChange={(e) => {
                void regNumeroOrden.onChange(e);
                const val = Number(e.target.value);
                const esDup = Boolean(
                  val &&
                    pasosExistentes?.some((p) =>
                      modo === "modificar" && paso?.id
                        ? p.id !== paso.id && p.numero_orden === val
                        : p.numero_orden === val,
                    ),
                );
                if (
                  !esDup &&
                  errors.numero_orden?.message?.includes("Ya existe un paso")
                ) {
                  clearErrors("numero_orden");
                } else if (esDup) {
                  setError("numero_orden", {
                    type: "manual",
                    message: `Ya existe un paso con el número de orden ${val} en esta receta.`,
                  });
                }
              }}
            />

            <TextField
              label="Título del Paso"
              disabled={esModoVer}
              placeholder="Ej. Amasado inicial de ingredientes secos"
              error={errors.titulo?.message}
              {...regTitulo}
              onChange={(e) => {
                void regTitulo.onChange(e);
                if (errors.titulo && e.target.value.trim().length >= 3) {
                  clearErrors("titulo");
                }
              }}
            />
          </Seccion>

          <Seccion
            numero={2}
            titulo="Instrucciones y Procedimiento"
            Icon={FiFileText}
          >
            <TextAreaField
              label="Instrucciones del paso"
              disabled={esModoVer}
              value={instrucciones}
              placeholder="Describí las instrucciones y método de elaboración para este paso..."
              error={errors.instrucciones?.message}
              onChange={(e) => {
                setValue("instrucciones", e.target.value, {
                  shouldValidate: true,
                });
                if (errors.instrucciones && e.target.value.trim().length >= 5) {
                  clearErrors("instrucciones");
                }
              }}
              rows={5}
            />
          </Seccion>

          <Seccion numero={3} titulo="Recursos Utilizados" Icon={FiTool}>
            {catalogosCargando && (
              <Text fontSize="sm" color="gray.600">
                Cargando insumos y equipos disponibles...
              </Text>
            )}

            {!catalogosCargando && errorCatalogos && (
              <AlertMessage type="error" message={errorCatalogos} />
            )}

            {!catalogosCargando && !errorCatalogos && (
              <>
                {sinInsumos && sinEquipos ? (
                  <AlertMessage
                    type="warning"
                    message="No hay insumos ni equipos activos disponibles en el sistema."
                  />
                ) : (
                  <>
                    {!sinInsumos ? (
                      <InsumosPasoSelector
                        opciones={opcionesInsumos}
                        seleccionados={insumosSeleccionados}
                        onChange={handleChangeInsumos}
                        consumos={consumos}
                        erroresConsumo={erroresConsumo}
                        unidadesPorInsumo={unidadesPorInsumo}
                        onActualizarConsumo={actualizarConsumo}
                        disabled={esModoVer}
                      />
                    ) : (
                      <AlertMessage
                        type="warning"
                        message="No hay insumos disponibles para seleccionar."
                      />
                    )}

                    {!sinEquipos ? (
                      <EquiposPasoSelector
                        opciones={opcionesEquipos}
                        seleccionados={equiposSeleccionados}
                        onChange={handleChangeEquipos}
                        cantidades={cantidades}
                        erroresCantidad={erroresCantidad}
                        onActualizarCantidad={actualizarCantidad}
                        disabled={esModoVer}
                      />
                    ) : (
                      <AlertMessage
                        type="warning"
                        message="No hay equipos activos disponibles para seleccionar."
                      />
                    )}
                  </>
                )}
              </>
            )}
          </Seccion>

          <FormActions justify="end">
            {esModoVer ? (
              <CancelButton
                text="Cerrar"
                icon={FiXCircle}
                onClick={onCancelar}
                colorPalette="gray"
              />
            ) : (
              <>
                <SubmitButton
                  text="Guardar Paso"
                  icon={FiSave}
                  loading={isSubmitting}
                  type="submit"
                  colorPalette="green"
                />
                <CancelButton
                  text="Cancelar"
                  icon={FiXCircle}
                  onClick={onCancelar}
                  colorPalette="red"
                  variant="outline"
                />
              </>
            )}
          </FormActions>

          {mostrarErrorGeneral && errors.root?.message && (
            <AlertMessage type="error" message={errors.root.message} />
          )}
          {success && !esModoVer && (
            <AlertMessage
              type="success"
              message={
                esModoCrear
                  ? "Paso agregado exitosamente."
                  : "Paso modificado exitosamente."
              }
            />
          )}
        </VStack>
      </form>
    </FormContainer>
  );
};

export interface PasoRecetaModalProps {
  open: boolean;
  modo: ModoPasoForm;
  recetaId?: number;
  paso?: PasoReceta;
  pasosExistentes?: PasoReceta[];
  ordenSugerido?: number;
  onClose: () => void;
  onGuardado?: (paso: PasoReceta) => void;
}

export const PasoRecetaModal = ({
  open,
  modo,
  recetaId,
  paso,
  pasosExistentes,
  ordenSugerido,
  onClose,
  onGuardado,
}: PasoRecetaModalProps) => (
  <FormModal open={open} onClose={onClose}>
    <PasoRecetaForm
      key={`${modo}-${paso?.id ?? "nuevo"}`}
      modo={modo}
      recetaId={recetaId}
      paso={paso}
      pasosExistentes={pasosExistentes}
      ordenSugerido={ordenSugerido}
      onCancelar={onClose}
      onGuardado={onGuardado}
      enModal
    />
  </FormModal>
);

export default PasoRecetaModal;
