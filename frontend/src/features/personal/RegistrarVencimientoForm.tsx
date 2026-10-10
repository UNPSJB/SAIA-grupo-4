import { useState } from "react";
import { Field, Input, Text, VStack } from "@chakra-ui/react";
import { FiCalendar, FiSave, FiXCircle } from "react-icons/fi";
import { useVencimientoSubmit } from "./hooks/useVencimientoSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { FormContainer, FormHeader, TextField, SelectField, FormActions, SubmitButton, CancelButton, AlertMessage, LoadingState } from "../../components/ui";
import type { Persona } from "./types";
import type { DocumentoPersonal } from "../documentosPersonal/types";

type RegistrarVencimientoFormProps = {
    persona: Persona;
    onCancelar?: () => void;
    onGuardado?: () => void;
    enModal?: boolean;
};

// "YYYY-MM-DD" en hora local, sumando dias a la fecha de hoy
const hoyMasDias = (dias: number) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toLocaleDateString("sv-SE");
};

const formatearFecha = (fecha: string) => fecha.split("-").reverse().join("/");

export const RegistrarVencimientoForm = ({ persona, onCancelar, onGuardado, enModal = false }: RegistrarVencimientoFormProps) => {
    const { data, loading, error } = useListadoData<DocumentoPersonal>({
        endpoint: "http://127.0.0.1:8000/documentos-personal/",
        errorMessage: "No se pudo cargar la lista de documentos.",
    });
    const documentos = data.filter((doc) => doc.activo);

    const [documentoId, setDocumentoId] = useState("");
    const [fecha, setFecha] = useState("");
    const [comprobante, setComprobante] = useState<File | null>(null);
    const [errorDocumento, setErrorDocumento] = useState("");
    const [errorFecha, setErrorFecha] = useState("");
    const [errorEnvio, setErrorEnvio] = useState("");

    const { submit, isSubmitting } = useVencimientoSubmit({ onSuccess: onGuardado });

    // Si la persona ya tiene cargado ese documento, guardar lo renueva en lugar de crear otro
    const vencimientoActual = (persona.vencimientos || []).find((v) => String(v.documento_id) === documentoId);

    const handleDocumentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDocumentoId(e.target.value);
        setErrorDocumento("");
        // Se propone la fecha segun la vigencia por defecto del documento
        const documento = documentos.find((doc) => String(doc.id) === e.target.value);
        setFecha(documento ? hoyMasDias(documento.vigencia_dias) : "");
    };

    const handleGuardar = async () => {
        setErrorEnvio("");
        setErrorDocumento(documentoId ? "" : "El tipo de documento es obligatorio");
        setErrorFecha(fecha ? "" : "La fecha de vencimiento es obligatoria");
        if (!documentoId || !fecha) return;

        const res = await submit({
            persona_id: persona.id,
            documento_id: Number(documentoId),
            fecha_vencimiento: fecha,
            vencimiento_id: vencimientoActual?.id,
            comprobante,
        });
        if (res.status === "error") setErrorEnvio(res.message);
    };

    return (
        <FormContainer modal={enModal}>
            <FormHeader title="Registrar Vencimiento" icon={FiCalendar} />
            {loading && <LoadingState message="Cargando documentos..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && documentos.length === 0 && (
                <AlertMessage type="info" message="Todavía no hay documentos activos. Cargalos desde el botón Documentos del listado de personal." />
            )}
            <VStack gap={4}>
                <TextField label="Persona" value={`${persona.nombre} ${persona.apellido}`} disabled />
                <SelectField
                    label="Tipo de documento"
                    placeholder="Seleccione un documento"
                    value={documentoId}
                    onChange={handleDocumentoChange}
                    options={documentos.map((doc) => ({ label: doc.nombre, value: String(doc.id) }))}
                    error={errorDocumento}
                />
                {vencimientoActual && (
                    <Text fontSize="sm" color="gray.600" alignSelf="flex-start">
                        Vencimiento actual: {formatearFecha(vencimientoActual.fecha_vencimiento)}. Al guardar se renueva.
                    </Text>
                )}
                <Field.Root>
                    <Field.Label fontSize="md" fontFamily="sans-serif">Fecha de vencimiento</Field.Label>
                    <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                    {errorFecha && <Text color="red.500" fontSize="sm">{errorFecha}</Text>}
                </Field.Root>
                <Field.Root>
                    <Field.Label fontSize="md" fontFamily="sans-serif">Comprobante (Opcional)</Field.Label>
                    <Input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        p={1}
                        onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                    />
                    <Text fontSize="sm" color="gray.600">Foto (JPG o PNG) o PDF.</Text>
                </Field.Root>
                <FormActions>
                    <SubmitButton text="Guardar" icon={FiSave} loading={isSubmitting} onClick={handleGuardar} colorPalette="green" />
                    <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
                </FormActions>
                {errorEnvio && <AlertMessage type="error" message={errorEnvio} />}
            </VStack>
        </FormContainer>
    );
};
