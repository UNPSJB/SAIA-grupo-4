import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack, Alert } from "@chakra-ui/react";
import { useCapacidadSubmit } from "./hooks/useCapacidadSubmit";
import { capacidadSchema, type CapacidadFormInput, type CapacidadFormValues } from "./validationSchema";
import type { Capacidad } from "./types";
import { FormContainer, FormHeader, TextField, FormActions, SubmitButton, CancelButton, AlertMessage, AlertConfirm } from "../../components/ui";
import { FiAward, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";

type CapacidadFormProps = {
    modo: "crear" | "modificar" | "ver";
    capacidad?: Capacidad;
    onCancelar?: () => void;
    onGuardado?: (capacidad: Capacidad) => void;
    enModal?: boolean;
};

export const CapacidadForm = ({ modo, capacidad, onCancelar, onGuardado, enModal = false }: CapacidadFormProps) => {
    const esModoVer = modo === "ver";
    const esModoCrear = modo === "crear";
    const esModoModificar = modo === "modificar";
    const esDeSistema = capacidad?.tipo === "sistema";

    const defaultValues: CapacidadFormInput = esModoModificar || esModoVer
        ? { nombre: capacidad!.nombre, descripcion: capacidad!.descripcion || "" }
        : { nombre: "", descripcion: "" };

    const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors, reset } = useForm<CapacidadFormInput, unknown, CapacidadFormValues>({
        resolver: zodResolver(capacidadSchema),
        defaultValues,
    });

    const [success, setSuccess] = useState(false);
    const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
    const [capacidadInactivaId, setCapacidadInactivaId] = useState<number | null>(null);
    const [errorConfirmar, setErrorConfirmar] = useState("");
    const [nombreEnviado, setNombreEnviado] = useState("");

    const { submit } = useCapacidadSubmit({
        endpoint: "http://127.0.0.1:8000/capacidades/",
        method: esModoCrear ? "POST" : "PUT",
        id: esModoModificar ? capacidad!.id : undefined,
        onInactivo: (capId) => {
            if (!esModoCrear) return;
            setCapacidadInactivaId(capId);
            setErrorConfirmar("");
            setConfirmAltaAbierto(true);
        },
        onSuccess: () => {
            setSuccess(true);
            onGuardado?.(capacidad!);
        },
    });

    const reactivar = useCapacidadSubmit({
        endpoint: "http://127.0.0.1:8000/capacidades/",
        method: "PUT",
        id: capacidadInactivaId ?? undefined,
        body: { activo: true },
        onSuccess: () => {
            setConfirmAltaAbierto(false);
            setCapacidadInactivaId(null);
            onGuardado?.(capacidad!);
        },
    });

    const confirmarAlta = async () => {
        if (capacidadInactivaId === null) return;
        setErrorConfirmar("");
        const res = await reactivar.submit();
        if (res.status === "error") setErrorConfirmar(res.message);
    };

    const onSubmit = handleSubmit(async (values) => {
        setSuccess(false);
        clearErrors("root");
        setNombreEnviado(values.nombre);
        const res = await submit(values);
        if (res.status === "error") setError("root", { message: res.message });
        else if (res.status === "success" && esModoCrear) reset();
    });

    return (
        <FormContainer modal={enModal}>
            <FormHeader
                title={esModoVer ? "Ver Capacidad" : esModoCrear ? "Nueva Capacidad" : "Modificar Capacidad"}
                icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiAward}
            />
            {esModoModificar && esDeSistema && (
                <Alert.Root status="warning" mb={4}>
                    <Alert.Indicator />
                    <Alert.Title>Esta es una capacidad del sistema y no puede ser modificada.</Alert.Title>
                </Alert.Root>
            )}
            <form onSubmit={esModoVer || esDeSistema ? undefined : onSubmit} noValidate>
                <VStack gap={4}>
                    <TextField label="Nombre" disabled={esModoVer || esDeSistema} defaultValue={defaultValues.nombre} error={errors.nombre?.message} {...register("nombre")} />
                    <TextField label="Descripción (Opcional)" disabled={esModoVer || esDeSistema} defaultValue={defaultValues.descripcion} error={errors.descripcion?.message} {...register("descripcion")} />

                    <FormActions>
                        {esModoVer || esDeSistema ? (
                            <CancelButton text="Cerrar" icon={FiXCircle} onClick={onCancelar} colorPalette="gray" />
                        ) : (
                            <>
                                <SubmitButton text="Guardar" icon={FiSave} loading={isSubmitting} type="submit" colorPalette="green" />
                                <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
                            </>
                        )}
                    </FormActions>

                    {errors.root?.message && <AlertMessage type="error" message={errors.root.message} />}
                    {success && !esModoVer && <AlertMessage type="success" message={esModoCrear ? "Capacidad creada exitosamente." : "Capacidad modificada exitosamente."} />}
                </VStack>
            </form>

            {esModoCrear && (
                <AlertConfirm
                    open={confirmAltaAbierto}
                    title="Reactivar Capacidad"
                    message={`La capacidad "${nombreEnviado}" ya existe pero está inactiva. ¿Querés reactivarla?`}
                    loading={reactivar.isSubmitting}
                    error={errorConfirmar}
                    onConfirm={confirmarAlta}
                    onCancel={() => setConfirmAltaAbierto(false)}
                />
            )}
        </FormContainer>
    );
};