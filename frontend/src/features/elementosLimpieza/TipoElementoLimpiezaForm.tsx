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
    const [errorValidacion, setErrorValidacion] = useState("");

    const { crear, isSubmitting, error } = useTipoElementoLimpiezaSubmit({
        onSuccess: (tipoCreado) => onGuardado?.(tipoCreado),
    });

    const handleGuardar = async () => {
        if (!nombre.trim()) {
            setErrorValidacion("El nombre es obligatorio");
            return;
        }
        setErrorValidacion("");
        await crear(nombre.trim());
    };

    return (
        <FormContainer modal={enModal}>
            <FormHeader title="Nuevo Tipo de Elemento" icon={FiTag} />
            <VStack gap={4}>
                <TextField
                    label="Nombre del tipo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    error={errorValidacion}
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