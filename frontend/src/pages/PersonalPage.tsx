import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { PersonalForm } from "../features/personal/PersonalForm";
import { ListadoPersonal } from "../features/personal/ListadoPersonal";
import { AlertDelete, AlertConfirm } from "../components/ui";
import { handleDelete } from "../features/personal/hooks/usePersonalDelete";
import { usePersonalSubmit } from "../features/personal/hooks/usePersonalSubmit";
import type { Persona } from "../features/personal/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function PersonalPage() {
    const navigate = useNavigate();
    const [vista, setVista] = useState<Vista>("listado");
    const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [personaEliminar, setPersonaEliminar] = useState<Persona | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);
    
    const [personaAlta, setPersonaAlta] = useState<Persona | null>(null);
    const [altaAbierto, setAltaAbierto] = useState(false);
    
    const [refrescar, setRefrescar] = useState(0);

    const confirmarEliminar = () => {
        handleDelete({
            persona: personaEliminar,
            setLoading,
            setError,
            onSuccess: () => {
                setEliminarAbierto(false);
                setPersonaEliminar(null);
                setRefrescar((r) => r + 1);
            },
        });
    };

    const reactivar = usePersonalSubmit({
        endpoint: "http://127.0.0.1:8000/personal/",
        method: "PUT",
        id: personaAlta?.id,
        body: { activo: true },
        onSuccess: () => {
            setAltaAbierto(false);
            setPersonaAlta(null);
            setRefrescar((r) => r + 1);
        },
    });

    const confirmarAlta = async () => {
        if (!personaAlta) return;
        setError("");
        const res = await reactivar.submit();
        if (res.status === "error") setError(res.message);
    };

    return (
        <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
            {vista === "listado" && (
                <ListadoPersonal
                    key={refrescar}
                    onVerCapacidades={() => navigate("/capacidades")}
                    onCrear={() => setVista("crear")}
                    onModificar={(persona) => { setError(""); setPersonaSeleccionada(persona); setVista("modificar"); }}
                    onEliminar={(persona) => { setError(""); setPersonaEliminar(persona); setEliminarAbierto(true); }}
                    onVer={(persona) => { setError(""); setPersonaSeleccionada(persona); setVista("ver"); }}
                    onDarAlta={(persona) => { setError(""); setPersonaAlta(persona); setAltaAbierto(true); }}
                />
            )}
            
            {vista === "ver" && personaSeleccionada && (
                <PersonalForm modo="ver" persona={personaSeleccionada} onCancelar={() => setVista("listado")} />
            )}
            {vista === "crear" && (
                <PersonalForm modo="crear" onCancelar={() => setVista("listado")} onGuardado={() => setVista("listado")} />
            )}
            {vista === "modificar" && personaSeleccionada && (
                <PersonalForm modo="modificar" persona={personaSeleccionada} onCancelar={() => setVista("listado")} onGuardado={() => setVista("listado")} />
            )}

            <AlertDelete
                open={eliminarAbierto}
                name={personaEliminar ? `${personaEliminar.nombre} ${personaEliminar.apellido}` : null}
                loading={loading}
                error={error}
                onConfirm={confirmarEliminar}
                onCancel={() => { setEliminarAbierto(false); setError(""); }}
            />

            <AlertConfirm
                open={altaAbierto}
                title="Dar de Alta"
                message={`¿Estás seguro que querés dar de alta a ${personaAlta?.nombre} ${personaAlta?.apellido}?`}
                loading={reactivar.isSubmitting}
                error={error}
                onConfirm={confirmarAlta}
                onCancel={() => { setAltaAbierto(false); setError(""); }}
            />
        </Box>
    );
}