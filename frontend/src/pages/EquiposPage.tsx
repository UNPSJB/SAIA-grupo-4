import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { EquipoForm } from "../features/equipos/EquipoForm";
import { ListadoEquipos } from "../features/equipos/ListadoEquipo";
import { AlertDelete, AlertConfirm } from "../components/ui";
import { handleDelete } from "../features/equipos/hooks/useEquipoDelete";
import { useEquipoSubmit } from "../features/equipos/hooks/useEquipoSubmit";
import type { Equipo } from "../features/equipos/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function EquiposPage() {
    const [vista, setVista] = useState<Vista>("listado");
    const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [equipoEliminar, setEquipoEliminar] = useState<Equipo | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);
    
    const [equipoAlta, setEquipoAlta] = useState<Equipo | null>(null);
    const [altaAbierto, setAltaAbierto] = useState(false);
    
    const [refrescar, setRefrescar] = useState(0);

    const confirmarEliminar = () => {
        handleDelete({
            equipo: equipoEliminar,
            setLoading,
            setError,
            onSuccess: () => {
                setEliminarAbierto(false);
                setEquipoEliminar(null);
                setRefrescar((r) => r + 1);
            },
        });
    };

    const reactivar = useEquipoSubmit({
        endpoint: "http://127.0.0.1:8000/equipos/",
        method: "PUT",
        id: equipoAlta?.id,
        body: { activo: true },
        onSuccess: () => {
            setAltaAbierto(false);
            setEquipoAlta(null);
            setRefrescar((r) => r + 1);
        },
    });

    const confirmarAlta = async () => {
        if (!equipoAlta) return;
        setError("");
        const res = await reactivar.submit();
        if (res.status === "error") {
            setError(res.message);
        }
    };

    return (
        <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
            {vista === "listado" && (
                <ListadoEquipos
                    key={refrescar}
                    onCrear={() => setVista("crear")}
                    onModificar={(equipo) => {
                        setError("");
                        setEquipoSeleccionado(equipo);
                        setVista("modificar");
                    }}
                    onEliminar={(equipo) => {
                        setError("");
                        setEquipoEliminar(equipo);
                        setEliminarAbierto(true);
                    }}
                    onVer={(equipo) => {
                        setError("");
                        setEquipoSeleccionado(equipo);
                        setVista("ver");
                    }}
                    onDarAlta={(equipo) => {
                        setError("");
                        setEquipoAlta(equipo);
                        setAltaAbierto(true);
                    }}
                />
            )}
            
            {vista === "ver" && equipoSeleccionado && (
                <EquipoForm
                    modo="ver"
                    equipo={equipoSeleccionado}
                    onCancelar={() => setVista("listado")}
                />
            )}
            
            {vista === "crear" && (
                <EquipoForm
                    modo="crear"
                    onCancelar={() => setVista("listado")}
                    onGuardado={() => setVista("listado")}
                />
            )}
            
            {vista === "modificar" && equipoSeleccionado && (
                <EquipoForm
                    modo="modificar"
                    equipo={equipoSeleccionado}
                    onCancelar={() => setVista("listado")}
                    onGuardado={() => setVista("listado")}
                />
            )}

            <AlertDelete
                open={eliminarAbierto}
                name={equipoEliminar?.nombre ?? null}
                loading={loading}
                error={error}
                onConfirm={confirmarEliminar}
                onCancel={() => {
                    setEliminarAbierto(false);
                    setError("");
                }}
            />

            <AlertConfirm
                open={altaAbierto}
                title="Dar de Alta"
                message={`¿Estás seguro que querés dar de alta el equipo ${equipoAlta?.nombre}?`}
                loading={reactivar.isSubmitting}
                error={error}
                onConfirm={confirmarAlta}
                onCancel={() => {
                    setAltaAbierto(false);
                    setError("");
                }}
            />
        </Box>
    );
}