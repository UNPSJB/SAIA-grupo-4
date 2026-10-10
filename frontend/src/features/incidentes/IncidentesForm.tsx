import { useAuth } from "../auth/useAuth";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack, Input, Image, Field } from "@chakra-ui/react";
import { useIncidentesSubmit } from "./hooks/useIncidentesSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { incidenteSchema, type IncidenteFormValues, type IncidenteFormInput } from "./validationSchema";
import type { Incidente, TipoIncidente } from "./types";
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
import { FiSave, FiEye, FiEdit2, FiAlertTriangle, FiXCircle } from "react-icons/fi";

type IncidenteFormProps = {
    modo: "crear" | "modificar" | "ver";
    incidente?: Incidente;
    onCancelar?: () => void;
    onGuardado?: (incidente: Incidente) => void;
    enModal?: boolean;
};

export const IncidenteForm = ({
    modo,
    incidente,
    onCancelar,
    onGuardado,
    enModal = false,
}: IncidenteFormProps) => {
    const esModoVer = modo === "ver";
    const esModoCrear = modo === "crear";
    const esModoModificar = modo === "modificar";

    const { usuario } = useAuth();

    const defaultValues: IncidenteFormInput =
        esModoModificar || esModoVer
            ? {
                titulo: incidente!.titulo,
                descripcion: incidente!.descripcion,
                foto_url: incidente!.foto_url || "",
                fecha_hora_reporte: incidente!.fecha_hora_reporte,
                reportante_id: incidente!.reportante_id,
                tipo_id: String(incidente!.tipo_id),
              }
            : {
                titulo: "",
                descripcion: "",
                foto_url: "",
                fecha_hora_reporte: new Date().toISOString(),
                reportante_id: usuario?.personaId ?? 0,
                tipo_id: "",
              };

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
        reset,
    } = useForm<IncidenteFormInput, unknown, IncidenteFormValues>({
        resolver: zodResolver(incidenteSchema),
        defaultValues,
    });

    const {
        data: tiposIncidentes,
        loading: loadingTipos,
        error: errorTipos,
        reload: reloadTipos,
    } = useListadoData<TipoIncidente>({
        endpoint: "http://127.0.0.1:8000/tipos-incidente/",
    });

    const opcionesTipo = useMemo(() => {
        return tiposIncidentes
            .filter((t) => t.activo)
            .map((t) => ({
                label: t.nombre,
                value: String(t.id),
            }));
    }, [tiposIncidentes]);

    const [success, setSuccess] = useState(false);
    const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
    const [incidenteInactivoId, setIncidenteInactivoId] = useState<number | null>(null);
    const [errorConfirmar, setErrorConfirmar] = useState("");
    const [nombreEnviado, setNombreEnviado] = useState("");

    const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [errorFoto, setErrorFoto] = useState("");

    useEffect(() => {
        return () => {
            if (fotoPreview) URL.revokeObjectURL(fotoPreview);
        };
    }, [fotoPreview]);

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0] ?? null;

        setErrorFoto("");
        setFotoArchivo(null);
        setFotoPreview(null);

        if (!archivo) return;

        if (!archivo.type.startsWith("image/")) {
            setErrorFoto("El archivo debe ser una imagen.");
            e.target.value = "";
            return;
        }

        setFotoArchivo(archivo);
        setFotoPreview(URL.createObjectURL(archivo));
    };

    const { submit } = useIncidentesSubmit({
        endpoint: "http://127.0.0.1:8000/incidentes/",
        method: esModoCrear ? "POST" : "PUT",
        id: esModoModificar ? incidente!.id : undefined,
        onInactivo: (incidenteId) => {
            if (!esModoCrear) return;
            setIncidenteInactivoId(incidenteId);
            setErrorConfirmar("");
            setConfirmAltaAbierto(true);
        },
        onSuccess: () => {
            setSuccess(true);
            onGuardado?.(incidente!);
        },
    });

    const reactivar = useIncidentesSubmit({
        endpoint: "http://127.0.0.1:8000/incidentes/",
        method: "PUT",
        id: incidenteInactivoId ?? undefined,
        body: { abierto: true},
        onSuccess: () => {
            setConfirmAltaAbierto(false);
            setIncidenteInactivoId(null);
            onGuardado?.(incidente!);
        },
    });

    const confirmarAlta = async () => {
        if (incidenteInactivoId === null) return;
        setErrorConfirmar("");
        const res = await reactivar.submit();
        if (res.status === "error") {
            setErrorConfirmar(res.message);
        }
    };

    const onSubmit = handleSubmit(async (values) => {
        setSuccess(false);
        clearErrors("root");
        setNombreEnviado(values.titulo);
        const res = await submit(
            {
                ...values,
                reportante_id: usuario!.personaId,
                fecha_hora_reporte: new Date().toISOString(),
            },
            fotoArchivo,
        );
        if (res.status === "error") {
            setError("root", { message: res.message });
        } else if (res.status === "success") {
            if (esModoCrear) reset();
        }
    });

    return (
        <FormContainer modal={enModal}>
            <FormHeader
                title={
                    esModoVer
                        ? "Ver Incidente"
                        : modo === "crear"
                          ? "Nuevo Incidente"
                          : "Modificar Incidente"
                }
                icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiAlertTriangle}
            />
            <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
                <VStack gap={4}>
                    <SelectField
                        label="Tipo"
                        placeholder="Selecciona una opción"
                        readOnly={esModoVer}
                        defaultValue={defaultValues.tipo_id}
                        onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                        onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                        options={ opcionesTipo }
                        error={errors.tipo_id?.message}
                        {...register("tipo_id")}
                    />

                    <TextField
                        label="Titulo"
                        disabled={esModoVer}
                        defaultValue={defaultValues.titulo}
                        placeholder="Ej. Ratas en cocina"
                        error={errors.titulo?.message}
                        {...register("titulo")}
                    />
                    
                    <TextField
                        label="Descripcion"
                        disabled={esModoVer}
                        defaultValue={defaultValues.descripcion}
                        error={errors.descripcion?.message}
                        {...register("descripcion")}
                    />
                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">
                            Foto del incidente (opcional)
                        </Field.Label>
                        <Input 
                            type="file"
                            accept="image/*"
                            disabled={esModoVer}
                            onChange={handleFotoChange}
                        />

                        {errorFoto && <AlertMessage type="error" message={errorFoto} />}
                    </Field.Root>

                    {fotoPreview && (
                        <Image
                            src={fotoPreview}
                            alt="Vista previa de la foto del incidente"
                            maxH="200px"
                            objectFit="contain"
                        />
                    )}

                    <FormActions>
                        {esModoVer ? (
                            <CancelButton
                                text="Cerrar"
                                icon={FiXCircle}
                                onClick={onCancelar}
                                colorPalette="red"
                                variant="outline"
                            />
                        ) : (
                            <>
                                <SubmitButton
                                    text="Guardar"
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

                    {errors.root?.message && (
                        <AlertMessage type="error" message={errors.root.message} />
                    )}
                    {success && !esModoVer && (
                        <AlertMessage
                            type="success"
                            message={
                                esModoCrear
                                    ? "El incidente ha sido reportado exitosamente."
                                    : "Incidente modificado exitosamente."
                            }
                        />
                    )}
                </VStack>
            </form>

            {esModoCrear && (
                <AlertConfirm
                    open={confirmAltaAbierto}
                    title="Dar de Alta"
                    message={`Ya existe un equipo inactivo con esa combinación. ¿Querés reactivar "${nombreEnviado}"?`}
                    loading={reactivar.isSubmitting}
                    error={errorConfirmar}
                    onConfirm={confirmarAlta}
                    onCancel={() => setConfirmAltaAbierto(false)}
                />
            )}
        </FormContainer>
    );
};