import { useState } from "react";
import { VStack } from "@chakra-ui/react";
import { FiTag, FiSave, FiXCircle } from "react-icons/fi";
import { useTipoElementoLimpiezaSubmit } from "./hooks/useTipoElementoLimpiezaSubmit";
import { FormContainer, FormHeader, TextField, FormActions, SubmitButton, CancelButton, AlertMessage } from "../../components/ui";
import type { TipoElementoLimpieza } from "./types";

type TipoElementoLimpiezaFormProps = {
    onCancelar?: () => void;
    onGuardado?: (tipo: TipoElementoLimpieza) => void;
    enModal?: boolean;
};

export const TipoElementoLimpiezaForm = ({ onCancelar, onGuardado, enModal = false }: TipoElementoLimpiezaFormProps) => {
    const [nombre, setNombre] = useState("");
    const [prefijo, setPrefijo] = useState("");
    const [errorNombre, setErrorNombre] = useState("");
    const [errorPrefijo, setErrorPrefijo] = useState("");

    const { crear, isSubmitting, error } = useTipoElementoLimpiezaSubmit({
        onSuccess: (tipoCreado) => onGuardado?.(tipoCreado),
    });

    const handleGuardar = async () => {
        let hayError = false;

        if (!nombre.trim()) {
            setErrorNombre("El nombre es obligatorio");
            hayError = true;
        } else {
            setErrorNombre("");
        }

        const prefijoNormalizado = prefijo.trim().toUpperCase();
        if (!/^[A-Z]{2,5}$/.test(prefijoNormalizado)) {
            setErrorPrefijo("Debe tener entre 2 y 5 letras (sin números ni símbolos)");
            hayError = true;
        } else {
            setErrorPrefijo("");
        }

        if (hayError) return;

        await crear(nombre.trim(), prefijoNormalizado);
    };

    return (
        <FormContainer modal={enModal}>
            <FormHeader title="Nuevo Tipo de Elemento" icon={FiTag} />
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
                />
                <FormActions>
                    <SubmitButton text="Guardar" icon={FiSave} loading={isSubmitting} onClick={handleGuardar} colorPalette="green" />
                    <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
                </FormActions>
                {error && <AlertMessage type="error" message={error} />}
            </VStack>
        </FormContainer>
    );
};