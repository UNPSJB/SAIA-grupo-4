import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { useDocumentoPersonalSubmit } from "./hooks/useDocumentoPersonalSubmit";
import { documentoPersonalSchema, type DocumentoPersonalFormInput, type DocumentoPersonalFormValues } from "./validationSchema";
import type { DocumentoPersonal } from "./types";
import { FormContainer, FormHeader, TextField, FormActions, SubmitButton, CancelButton, AlertMessage, AlertConfirm } from "../../components/ui";
import { FiFileText, FiEdit2, FiSave, FiXCircle } from "react-icons/fi";

type DocumentoPersonalFormProps = {
    modo: "crear" | "modificar";
    documento?: DocumentoPersonal;
    onCancelar?: () => void;
    onGuardado?: () => void;
    enModal?: boolean;
};

export const DocumentoPersonalForm = ({ modo, documento, onCancelar, onGuardado, enModal = false }: DocumentoPersonalFormProps) => {
    const esModoCrear = modo === "crear";
    const esModoModificar = modo === "modificar";

    const defaultValues: DocumentoPersonalFormInput = esModoModificar
        ? { nombre: documento!.nombre, vigencia_dias: String(documento!.vigencia_dias) }
        : { nombre: "", vigencia_dias: "" };

    const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors, reset } = useForm<DocumentoPersonalFormInput, unknown, DocumentoPersonalFormValues>({
        resolver: zodResolver(documentoPersonalSchema),
        defaultValues,
    });

    const [success, setSuccess] = useState(false);
    const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
    const [documentoInactivoId, setDocumentoInactivoId] = useState<number | null>(null);
    const [errorConfirmar, setErrorConfirmar] = useState("");
    const [nombreEnviado, setNombreEnviado] = useState("");

    const { submit } = useDocumentoPersonalSubmit({
        endpoint: "http://127.0.0.1:8000/documentos-personal/",
        method: esModoCrear ? "POST" : "PUT",
        id: esModoModificar ? documento!.id : undefined,
        onInactivo: (documentoId) => {
            if (!esModoCrear) return;
            setDocumentoInactivoId(documentoId);
            setErrorConfirmar("");
            setConfirmAltaAbierto(true);
        },
        onSuccess: () => {
            setSuccess(true);
            onGuardado?.();
        },
    });

    const reactivar = useDocumentoPersonalSubmit({
        endpoint: "http://127.0.0.1:8000/documentos-personal/",
        method: "PUT",
        id: documentoInactivoId ?? undefined,
        body: { activo: true },
        onSuccess: () => {
            setConfirmAltaAbierto(false);
            setDocumentoInactivoId(null);
            onGuardado?.();
        },
    });

    const confirmarAlta = async () => {
        if (documentoInactivoId === null) return;
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
                title={esModoCrear ? "Nuevo Documento" : "Modificar Documento"}
                icon={esModoModificar ? FiEdit2 : FiFileText}
            />
            <form onSubmit={onSubmit} noValidate>
                <VStack gap={4}>
                    <TextField label="Nombre" placeholder="Ej: Carnet de manipulador" error={errors.nombre?.message} {...register("nombre")} />
                    <TextField label="Vigencia (días)" placeholder="Ej: 365" error={errors.vigencia_dias?.message} {...register("vigencia_dias")} />

                    <FormActions>
                        <SubmitButton text="Guardar" icon={FiSave} loading={isSubmitting} type="submit" colorPalette="green" />
                        <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
                    </FormActions>

                    {errors.root?.message && <AlertMessage type="error" message={errors.root.message} />}
                    {success && <AlertMessage type="success" message={esModoCrear ? "Documento creado exitosamente." : "Documento modificado exitosamente."} />}
                </VStack>
            </form>

            {esModoCrear && (
                <AlertConfirm
                    open={confirmAltaAbierto}
                    title="Reactivar Documento"
                    message={`El documento "${nombreEnviado}" ya existe pero está inactivo. ¿Querés reactivarlo?`}
                    loading={reactivar.isSubmitting}
                    error={errorConfirmar}
                    onConfirm={confirmarAlta}
                    onCancel={() => setConfirmAltaAbierto(false)}
                />
            )}
        </FormContainer>
    );
};
