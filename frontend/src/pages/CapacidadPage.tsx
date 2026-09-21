import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button } from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import { CapacidadForm } from "../features/capacidades/CapacidadForm";
import { ListadoCapacidades } from "../features/capacidades/ListadoCapacidad";
import { AlertDelete, AlertConfirm } from "../components/ui";
import { handleDelete } from "../features/capacidades/hooks/useCapacidadDelete";
import { useCapacidadSubmit } from "../features/capacidades/hooks/useCapacidadSubmit";
import type { Capacidad } from "../features/capacidades/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function CapacidadPage() {
    const navigate = useNavigate();
    const [vista, setVista] = useState<Vista>("listado");
    const [capacidadSeleccionada, setCapacidadSeleccionada] = useState<Capacidad | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [capacidadEliminar, setCapacidadEliminar] = useState<Capacidad | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);
    
    const [capacidadAlta, setCapacidadAlta] = useState<Capacidad | null>(null);
    const [altaAbierto, setAltaAbierto] = useState(false);
    
    const [refrescar, setRefrescar] = useState(0);

    const confirmarEliminar = () => {
        handleDelete({
            capacidad: capacidadEliminar,
            setLoading,
            setError,
            onSuccess: () => {
                setEliminarAbierto(false);
                setCapacidadEliminar(null);
                setRefrescar((r) => r + 1);
            },
        });
    };

    const reactivar = useCapacidadSubmit({
        endpoint: "http://127.0.0.1:8000/capacidades/",
        method: "PUT",
        id: capacidadAlta?.id,
        body: { activo: true },
        onSuccess: () => {
            setAltaAbierto(false);
            setCapacidadAlta(null);
            setRefrescar((r) => r + 1);
        },
    });

    const confirmarAlta = async () => {
        if (!capacidadAlta) return;
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

            {vista === "listado" && (
                <ListadoCapacidades
                    key={refrescar}
                    onCrear={() => setVista("crear")}
                    onModificar={(capacidad) => { setError(""); setCapacidadSeleccionada(capacidad); setVista("modificar"); }}
                    onEliminar={(capacidad) => { setError(""); setCapacidadEliminar(capacidad); setEliminarAbierto(true); }}
                    onVer={(capacidad) => { setError(""); setCapacidadSeleccionada(capacidad); setVista("ver"); }}
                    onDarAlta={(capacidad) => { setError(""); setCapacidadAlta(capacidad); setAltaAbierto(true); }}
                />
            )}
            
            {vista === "ver" && capacidadSeleccionada && (
                <CapacidadForm modo="ver" capacidad={capacidadSeleccionada} onCancelar={() => setVista("listado")} />
            )}
            {vista === "crear" && (
                <CapacidadForm modo="crear" onCancelar={() => setVista("listado")} onGuardado={() => setVista("listado")} />
            )}
            {vista === "modificar" && capacidadSeleccionada && (
                <CapacidadForm modo="modificar" capacidad={capacidadSeleccionada} onCancelar={() => setVista("listado")} onGuardado={() => setVista("listado")} />
            )}

            <AlertDelete
                open={eliminarAbierto}
                name={capacidadEliminar?.nombre ?? null}
                loading={loading}
                error={error}
                onConfirm={confirmarEliminar}
                onCancel={() => { setEliminarAbierto(false); setError(""); }}
            />

            <AlertConfirm
                open={altaAbierto}
                title="Dar de Alta"
                message={`¿Estás seguro que querés reactivar la capacidad "${capacidadAlta?.nombre}"?`}
                loading={reactivar.isSubmitting}
                error={error}
                onConfirm={confirmarAlta}
                onCancel={() => { setAltaAbierto(false); setError(""); }}
            />
        </Box>
    );
}