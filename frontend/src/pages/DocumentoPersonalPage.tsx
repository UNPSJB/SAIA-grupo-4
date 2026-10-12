import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button } from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import { DocumentoPersonalForm } from "../features/documentosPersonal/DocumentoPersonalForm";
import { ListadoDocumentosPersonal } from "../features/documentosPersonal/ListadoDocumentoPersonal";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";
import { handleDelete } from "../features/documentosPersonal/hooks/useDocumentoPersonalDelete";
import { useDocumentoPersonalSubmit } from "../features/documentosPersonal/hooks/useDocumentoPersonalSubmit";
import type { DocumentoPersonal } from "../features/documentosPersonal/types";

type Vista = "listado" | "crear" | "modificar";

export default function DocumentoPersonalPage() {
    const navigate = useNavigate();
    const [vista, setVista] = useState<Vista>("listado");
    const [documentoSeleccionado, setDocumentoSeleccionado] = useState<DocumentoPersonal | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [documentoEliminar, setDocumentoEliminar] = useState<DocumentoPersonal | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);

    const [documentoAlta, setDocumentoAlta] = useState<DocumentoPersonal | null>(null);
    const [altaAbierto, setAltaAbierto] = useState(false);

    const [refrescar, setRefrescar] = useState(0);

    const confirmarEliminar = () => {
        handleDelete({
            documento: documentoEliminar,
            setLoading,
            setError,
            onSuccess: () => {
                setEliminarAbierto(false);
                setDocumentoEliminar(null);
                setRefrescar((r) => r + 1);
            },
        });
    };

    const reactivar = useDocumentoPersonalSubmit({
        endpoint: "http://127.0.0.1:8000/documentos-personal/",
        method: "PUT",
        id: documentoAlta?.id,
        body: { activo: true },
        onSuccess: () => {
            setAltaAbierto(false);
            setDocumentoAlta(null);
            setRefrescar((r) => r + 1);
        },
    });

    const confirmarAlta = async () => {
        if (!documentoAlta) return;
        setError("");
        const res = await reactivar.submit();
        if (res.status === "error") setError(res.message);
    };

    return (
        <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
            <Box maxW="4xl" mx="auto" mb={-4} textAlign="left">
                <Button variant="ghost" colorPalette="green" onClick={() => navigate("/personal")}>
                    <FiArrowLeft /> Volver a Personal
                </Button>
            </Box>

            <ListadoDocumentosPersonal
                key={refrescar}
                onCrear={() => setVista("crear")}
                onModificar={(documento) => { setError(""); setDocumentoSeleccionado(documento); setVista("modificar"); }}
                onEliminar={(documento) => { setError(""); setDocumentoEliminar(documento); setEliminarAbierto(true); }}
                onDarAlta={(documento) => { setError(""); setDocumentoAlta(documento); setAltaAbierto(true); }}
            />

            {(vista === "crear" || vista === "modificar") && (
                <FormModal
                    open
                    onClose={() => {
                        setError("");
                        setVista("listado");
                    }}
                >
                    {vista === "crear" && (
                        <DocumentoPersonalForm
                            modo="crear"
                            onCancelar={() => setVista("listado")}
                            onGuardado={() => {
                                setVista("listado");
                                setRefrescar((r) => r + 1);
                            }}
                            enModal
                        />
                    )}

                    {vista === "modificar" && documentoSeleccionado && (
                        <DocumentoPersonalForm
                            modo="modificar"
                            documento={documentoSeleccionado}
                            onCancelar={() => setVista("listado")}
                            onGuardado={() => {
                                setVista("listado");
                                setRefrescar((r) => r + 1);
                            }}
                            enModal
                        />
                    )}
                </FormModal>
            )}

            <AlertDelete
                open={eliminarAbierto}
                name={documentoEliminar?.nombre ?? null}
                loading={loading}
                error={error}
                onConfirm={confirmarEliminar}
                onCancel={() => { setEliminarAbierto(false); setError(""); }}
            />

            <AlertConfirm
                open={altaAbierto}
                title="Dar de Alta"
                message={`¿Estás seguro que querés reactivar el documento "${documentoAlta?.nombre}"?`}
                loading={reactivar.isSubmitting}
                error={error}
                onConfirm={confirmarAlta}
                onCancel={() => { setAltaAbierto(false); setError(""); }}
            />
        </Box>
    );
}
