import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { useEquipoSubmit } from "./hooks/useEquipoSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { equipoSchema, type EquipoFormInput, type EquipoFormValues } from "./validationSchema";
import type { Equipo } from "./types";
import type { Sector } from "../sectores/types";
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
import { FiThermometer, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";

type EquipoFormProps = {
    modo: "crear" | "modificar" | "ver";
    equipo?: Equipo;
    onCancelar?: () => void;
    onGuardado?: (equipo: Equipo) => void;
    enModal?: boolean;
};

export const EquipoForm = ({
    modo,
    equipo,
    onCancelar,
    onGuardado,
    enModal = false,
}: EquipoFormProps) => {
    const esModoVer = modo === "ver";
    const esModoCrear = modo === "crear";
    const esModoModificar = modo === "modificar";

    const defaultValues: EquipoFormInput =
        esModoModificar || esModoVer
            ? {
                  nombre: equipo!.nombre,
                  marca: equipo!.marca,
                  numero_serie: equipo!.numero_serie,
                  categoria: equipo!.categoria,
                  sector_id: equipo!.sector.id,
                  ubicacion: equipo!.ubicacion || "",
              }
            : {
                  nombre: "",
                  marca: "",
                  numero_serie: "",
                  categoria: "",
                  sector_id: "",
                  ubicacion: "",
              };

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
        reset,
    } = useForm<EquipoFormInput, unknown, EquipoFormValues>({
        resolver: zodResolver(equipoSchema),
        defaultValues,
    });

    // Carga dinámica de sectores para el dropdown
    const { data: sectores, loading: cargandoSectores, error: errorSectores } = useListadoData<Sector>({
        endpoint: "http://127.0.0.1:8000/sectores/",
    });

    const opcionesSectores = useMemo(() => {
        return sectores
            .filter((s) => s.activo)
            .map((s) => ({
                label: s.nombre,
                value: String(s.id),
            }));
    }, [sectores]);

    const [success, setSuccess] = useState(false);
    const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
    const [equipoInactivoId, setEquipoInactivoId] = useState<number | null>(null);
    const [errorConfirmar, setErrorConfirmar] = useState("");
    const [nombreEnviado, setNombreEnviado] = useState("");

    const { submit } = useEquipoSubmit({
        endpoint: "http://127.0.0.1:8000/equipos/",
        method: esModoCrear ? "POST" : "PUT",
        id: esModoModificar ? equipo!.id : undefined,
        onInactivo: (equipoId) => {
            if (!esModoCrear) return;
            setEquipoInactivoId(equipoId);
            setErrorConfirmar("");
            setConfirmAltaAbierto(true);
        },
        onSuccess: () => {
            setSuccess(true);
            onGuardado?.(equipo!);
        },
    });

    const reactivar = useEquipoSubmit({
        endpoint: "http://127.0.0.1:8000/equipos/",
        method: "PUT",
        id: equipoInactivoId ?? undefined,
        body: { activo: true },
        onSuccess: () => {
            setConfirmAltaAbierto(false);
            setEquipoInactivoId(null);
            onGuardado?.(equipo!);
        },
    });

    const confirmarAlta = async () => {
        if (equipoInactivoId === null) return;
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
            if (esModoCrear) reset();
        }
    });

    return (
        <FormContainer modal={enModal}>
            <FormHeader
                title={
                    esModoVer
                        ? "Ver Equipo"
                        : modo === "crear"
                          ? "Nuevo Equipo"
                          : "Modificar Equipo"
                }
                icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiThermometer}
            />
            <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
                <VStack gap={4}>
                    <TextField
                        label="Nombre"
                        disabled={esModoVer}
                        defaultValue={defaultValues.nombre}
                        placeholder="Ej. Heladera con freezer"
                        error={errors.nombre?.message}
                        {...register("nombre")}
                    />
                    
                    <TextField
                        label="Marca"
                        disabled={esModoVer}
                        defaultValue={defaultValues.marca}
                        placeholder="Ej. Samsung, Whirlpool"
                        error={errors.marca?.message}
                        {...register("marca")}
                    />

                    <TextField
                        label="Número de Serie"
                        disabled={esModoVer}
                        defaultValue={defaultValues.numero_serie}
                        placeholder="Ej. S/N 987654321"
                        error={errors.numero_serie?.message}
                        {...register("numero_serie")}
                    />

                    <SelectField
                        label="Categoría"
                        placeholder="Selecciona una opción"
                        readOnly={esModoVer}
                        defaultValue={defaultValues.categoria}
                        onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                        onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                        options={[
                            { label: "Heladera", value: "heladera" },
                            { label: "Horno", value: "horno" },
                            { label: "Balanza", value: "balanza" },
                            { label: "Termómetro", value: "termometro" },
                            { label: "Otro", value: "otro" },
                        ]}
                        error={errors.categoria?.message}
                        {...register("categoria")}
                    />

                    <SelectField
                        label="Sector"
                        placeholder={cargandoSectores ? "Cargando sectores..." : "Seleccione un sector"}
                        readOnly={esModoVer}
                        onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
                        onClick={esModoVer ? (e) => e.preventDefault() : undefined}
                        options={opcionesSectores}
                        error={errors.sector_id?.message || errorSectores}
                        {...register("sector_id")}
                    />

                    <TextField
                        label="Ubicación Específica (Opcional)"
                        disabled={esModoVer}
                        defaultValue={defaultValues.ubicacion}
                        placeholder="Ej. Cocina, Comedor 2"
                        error={errors.ubicacion?.message}
                        {...register("ubicacion")}
                    />

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
                                    ? "El equipo ha sido cargado exitosamente."
                                    : "Equipo modificado exitosamente."
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