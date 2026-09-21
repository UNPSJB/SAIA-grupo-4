import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { useSectorSubmit } from "./hooks/useSectorSubmit";
import { sectorSchema, type SectorFormValues } from "./validationSchema";
import type { Sector } from "./types";
import {
    FormContainer,
    FormHeader,
    TextField,
    FormActions,
    SubmitButton,
    CancelButton,
    AlertMessage,
    AlertConfirm,
} from "../../components/ui";
import { FiMap, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";

type SectorFormProps = {
    modo: "crear" | "modificar" | "ver";
    sector?: Sector;
    onCancelar?: () => void;
    onGuardado?: (sector: Sector) => void;
    enModal?: boolean;
};

export const SectorForm = ({
    modo,
    sector,
    onCancelar,
    onGuardado,
    enModal = false,
}: SectorFormProps) => {
    const esModoVer = modo === "ver";
    const esModoCrear = modo === "crear";
    const esModoModificar = modo === "modificar";

    const defaultValues: SectorFormValues =
        esModoModificar || esModoVer
            ? {
                  nombre: sector!.nombre,
              }
            : { nombre: "" };

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
        reset,
    } = useForm<SectorFormValues>({
        resolver: zodResolver(sectorSchema),
        defaultValues,
    });

    const [success, setSuccess] = useState(false);
    const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
    const [sectorInactivoId, setSectorInactivoId] = useState<number | null>(null);
    const [errorConfirmar, setErrorConfirmar] = useState("");
    const [nombreEnviado, setNombreEnviado] = useState("");

    const { submit } = useSectorSubmit({
        endpoint: "http://127.0.0.1:8000/sectores/",
        method: esModoCrear ? "POST" : "PUT",
        id: esModoModificar ? sector!.id : undefined,
        onInactivo: (sectorId) => {
            if (!esModoCrear) return;
            setSectorInactivoId(sectorId);
            setErrorConfirmar("");
            setConfirmAltaAbierto(true);
        },
        onSuccess: () => {
            setSuccess(true);
            onGuardado?.(sector!);
        },
    });

    const reactivar = useSectorSubmit({
        endpoint: "http://127.0.0.1:8000/sectores/",
        method: "PUT",
        id: sectorInactivoId ?? undefined,
        body: { activo: true },
        onSuccess: () => {
            setConfirmAltaAbierto(false);
            setSectorInactivoId(null);
            onGuardado?.(sector!);
        },
    });

    const confirmarAlta = async () => {
        if (sectorInactivoId === null) return;
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
                        ? "Ver Sector"
                        : modo === "crear"
                          ? "Nuevo Sector"
                          : "Modificar Sector"
                }
                icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiMap}
            />
            <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
                <VStack gap={4}>
                    <TextField
                        label="Nombre del Sector"
                        disabled={esModoVer}
                        defaultValue={defaultValues.nombre}
                        placeholder="Ej. Cocina"
                        error={errors.nombre?.message}
                        {...register("nombre")}
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
                                    ? "El sector ha sido creado exitosamente."
                                    : "Sector modificado exitosamente."
                            }
                        />
                    )}
                </VStack>
            </form>

            {esModoCrear && (
                <AlertConfirm
                    open={confirmAltaAbierto}
                    title="Dar de Alta"
                    message={`Ya existe un sector inactivo con el nombre "${nombreEnviado}". ¿Querés reactivarlo?`}
                    loading={reactivar.isSubmitting}
                    error={errorConfirmar}
                    onConfirm={confirmarAlta}
                    onCancel={() => setConfirmAltaAbierto(false)}
                />
            )}
        </FormContainer>
    );
};