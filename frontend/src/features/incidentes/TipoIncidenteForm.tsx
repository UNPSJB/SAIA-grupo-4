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

export const TipoElementoLimpiezaForm = ({ modo, tipo, onCancelar, onGuardado, enModal = false }: TipoIncidenteFormProps) => {
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
            const prefijoNormalizado = prefijo.trim().toUpperCase();
            if (!/^[A-Z]{2,5}$/.test(prefijoNormalizado)) {
                setErrorPrefijo("Debe tener entre 2 y 5 letras (sin números ni símbolos)");
                hayError = true;
            } else {
                setErrorPrefijo("");
            }
        }

        if (hayError) return;

        const payload = esModoModificar
            ? { nombre: nombre.trim() }
            : { nombre: nombre.trim(), prefijo: prefijo.trim().toUpperCase() };

        const res = await submit(payload);
        if (res.status === "error") setErrorEnvio(res.message);
    };

    return (
        <FormContainer modal={enModal}>
            <FormHeader
                title={esModoModificar ? "Modificar Tipo de Elemento" : "Nuevo Tipo de Elemento"}
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
                    label="Prefijo (2 a 5 letras, ej. ESC)"
                    value={prefijo}
                    onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
                    error={errorPrefijo}
                    disabled={esModoModificar}
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