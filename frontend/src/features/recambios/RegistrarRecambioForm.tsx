import { useState } from "react";
import { Field, Input, Text, VStack } from "@chakra-ui/react";
import { FiRefreshCw, FiSave, FiXCircle } from "react-icons/fi";
import { useRecambioSubmit } from "./hooks/useRecambioSubmit";
import { FormContainer, FormHeader, TextField, FormActions, SubmitButton, CancelButton, AlertMessage } from "../../components/ui";
import type { ElementoLimpieza } from "../elementosLimpieza/types";

type RegistrarRecambioFormProps = {
    elemento: ElementoLimpieza;
    onCancelar?: () => void;
    onGuardado?: () => void;
    enModal?: boolean;
};

// "YYYY-MM-DD" en hora local (toISOString() daría la fecha en UTC)
const hoyLocal = () => new Date().toLocaleDateString("sv-SE");

export const RegistrarRecambioForm = ({ elemento, onCancelar, onGuardado, enModal = false }: RegistrarRecambioFormProps) => {
    const [fecha, setFecha] = useState(hoyLocal());
    const [observaciones, setObservaciones] = useState("");
    const [errorFecha, setErrorFecha] = useState("");
    const [errorEnvio, setErrorEnvio] = useState("");

    const { submit, isSubmitting } = useRecambioSubmit({ onSuccess: onGuardado });

    const handleGuardar = async () => {
        setErrorEnvio("");

        if (!fecha) {
            setErrorFecha("La fecha es obligatoria");
            return;
        }
        if (fecha > hoyLocal()) {
            setErrorFecha("La fecha no puede ser futura");
            return;
        }
        setErrorFecha("");

        const res = await submit({ elemento_id: elemento.id, fecha_recambio: fecha, observaciones });
        if (res.status === "error") setErrorEnvio(res.message);
    };

    return (
        <FormContainer modal={enModal}>
            <FormHeader title="Registrar Recambio" icon={FiRefreshCw} />
            <VStack gap={4}>
                <TextField label="Elemento" value={`${elemento.codigo} — ${elemento.nombre}`} disabled />
                <Field.Root>
                    <Field.Label fontSize="md" fontFamily="sans-serif">Fecha del recambio</Field.Label>
                    <Input type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
                    {errorFecha && <Text color="red.500" fontSize="sm">{errorFecha}</Text>}
                </Field.Root>
                <TextField
                    label="Observaciones (Opcional)"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                />
                <FormActions>
                    <SubmitButton text="Registrar" icon={FiSave} loading={isSubmitting} onClick={handleGuardar} colorPalette="green" />
                    <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
                </FormActions>
                {errorEnvio && <AlertMessage type="error" message={errorEnvio} />}
            </VStack>
        </FormContainer>
    );
};
