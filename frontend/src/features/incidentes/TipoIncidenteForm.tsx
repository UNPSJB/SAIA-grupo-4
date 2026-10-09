import { useState } from "react";
import { VStack } from "@chakra-ui/react";
import { FiTag, FiSave, FiXCircle, FiEdit2 } from "react-icons/fi";
import { useTipoIncidenteSubmit } from "./hooks/useTipoIncidenteSubmit";
import { FormContainer, FormHeader, TextField, FormActions, SubmitButton, CancelButton, AlertMessage } from "../../components/ui";
import type { TipoIncidente } from "./types";

type TipoIncidenteFormProps = {
    modo: "crear" | "modificar";
    tipo?: TipoIncidente;
    onCancelar?: () => void;
    onGuardado?: (tipo: TipoIncidente) => void;
    enModal?: boolean;
};

export const TipoIncidenteForm = ({ modo, tipo, onCancelar, onGuardado, enModal = false }: TipoIncidenteFormProps) => {
    const esModoModificar = modo === "modificar";

    const [nombre, setNombre] = useState(esModoModificar ? tipo!.nombre : "");
    const [descripcion, setDescripcion] = useState(esModoModificar ? tipo!.descripcion : "");
    const [errorNombre, setErrorNombre] = useState("");
    const [errorDescripcion, setErrorDescripcion] = useState("");
    const [errorEnvio, setErrorEnvio] = useState("");
    const [success, setSuccess] = useState(false);

    const { submit, isSubmitting } = useTipoIncidenteSubmit({
        endpoint: "http://127.0.0.1:8000/tipos-incidente/",
        method: esModoModificar ? "PUT" : "POST",
        id: esModoModificar ? tipo!.id : undefined,
        onSuccess: (tipoGuardado) => {
            setSuccess(true);
            onGuardado?.(tipoGuardado);
        },
    });

    const handleGuardar = async () => {
        let hayError = false;
        setSuccess(false);
        setErrorEnvio("");

        if (!nombre.trim()) {
            setErrorNombre("El nombre es obligatorio");
            hayError = true;
        } else {
            setErrorNombre("");
        }

        if (!esModoModificar) {
            const descripcionNormalizada = descripcion.trim();

            if (!descripcionNormalizada) {
                setErrorDescripcion("La descripción es obligatoria");
                hayError = true;
            } else if (descripcionNormalizada.length > 200) {
                setErrorDescripcion("La descripcion no puede superar los 200 caracteres");
                hayError = true;
            } else {
                setErrorDescripcion("");
            }
        }

        if (hayError) return;

        const payload = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
        };

        const res = await submit(payload);
        if (res.status === "error") setErrorEnvio(res.message);
    };

    return (
        <FormContainer modal={enModal}>
            <FormHeader
                title={esModoModificar ? "Modificar Tipo de Incidente" : "Nuevo Tipo de Incidente"}
                icon={esModoModificar ? FiEdit2 : FiTag}
            />
            <VStack gap={4}>
                <TextField
                    label="Nombre del tipo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    error={errorNombre}
                />
                <TextField
                    label="Descripción del tipo"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    error={errorDescripcion}
                />
                <FormActions>
                    <SubmitButton text="Guardar" icon={FiSave} loading={isSubmitting} onClick={handleGuardar} colorPalette="green" />
                    <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
                </FormActions>
                {errorEnvio && <AlertMessage type="error" message={errorEnvio} />}
                {success && <AlertMessage type="success" message={esModoModificar ? "Tipo modificado exitosamente." : "Tipo creado exitosamente."} />}
            </VStack>
        </FormContainer>
    );
};