import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { SectorForm } from "../features/sectores/SectorForm";
import { ListadoSectores } from "../features/sectores/ListadoSector";
import { AlertDelete, AlertConfirm } from "../components/ui";
import { handleDelete } from "../features/sectores/hooks/useSectorDelete";
import { useSectorSubmit } from "../features/sectores/hooks/useSectorSubmit";
import type { Sector } from "../features/sectores/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function SectoresPage() {
    const [vista, setVista] = useState<Vista>("listado");
    const [sectorSeleccionado, setSectorSeleccionado] = useState<Sector | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [sectorEliminar, setSectorEliminar] = useState<Sector | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);
    
    const [sectorAlta, setSectorAlta] = useState<Sector | null>(null);
    const [altaAbierto, setAltaAbierto] = useState(false);
    
    const [refrescar, setRefrescar] = useState(0);

    const confirmarEliminar = () => {
        handleDelete({
            sector: sectorEliminar,
            setLoading,
            setError,
            onSuccess: () => {
                setEliminarAbierto(false);
                setSectorEliminar(null);
                setRefrescar((r) => r + 1);
            },
        });
    };

    const reactivar = useSectorSubmit({
        endpoint: "http://127.0.0.1:8000/sectores/",
        method: "PUT",
        id: sectorAlta?.id,
        body: { activo: true },
        onSuccess: () => {
            setAltaAbierto(false);
            setSectorAlta(null);
            setRefrescar((r) => r + 1);
        },
    });

    const confirmarAlta = async () => {
        if (!sectorAlta) return;
        setError("");
        const res = await reactivar.submit();
        if (res.status === "error") {
            setError(res.message);
        }
    };

    return (
        <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
            {vista === "listado" && (
                <ListadoSectores
                    key={refrescar}
                    onCrear={() => setVista("crear")}
                    onModificar={(sector) => {
                        setError("");
                        setSectorSeleccionado(sector);
                        setVista("modificar");
                    }}
                    onEliminar={(sector) => {
                        setError("");
                        setSectorEliminar(sector);
                        setEliminarAbierto(true);
                    }}
                    onVer={(sector) => {
                        setError("");
                        setSectorSeleccionado(sector);
                        setVista("ver");
                    }}
                    onDarAlta={(sector) => {
                        setError("");
                        setSectorAlta(sector);
                        setAltaAbierto(true);
                    }}
                />
            )}
            
            {vista === "ver" && sectorSeleccionado && (
                <SectorForm
                    modo="ver"
                    sector={sectorSeleccionado}
                    onCancelar={() => setVista("listado")}
                />
            )}
            
            {vista === "crear" && (
                <SectorForm
                    modo="crear"
                    onCancelar={() => setVista("listado")}
                    onGuardado={() => setVista("listado")}
                />
            )}
            
            {vista === "modificar" && sectorSeleccionado && (
                <SectorForm
                    modo="modificar"
                    sector={sectorSeleccionado}
                    onCancelar={() => setVista("listado")}
                    onGuardado={() => setVista("listado")}
                />
            )}

            <AlertDelete
                open={eliminarAbierto}
                name={sectorEliminar?.nombre ?? null}
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
                message={`¿Estás seguro que querés dar de alta el sector ${sectorAlta?.nombre}?`}
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