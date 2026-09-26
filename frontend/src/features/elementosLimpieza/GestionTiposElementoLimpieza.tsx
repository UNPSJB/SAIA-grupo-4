import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ListadoTiposElementoLimpieza } from "./ListadoTiposElementoLimpieza";
import { TipoElementoLimpiezaForm } from "./TipoElementoLimpiezaForm";
import { AlertDelete, AlertConfirm } from "../../components/ui";
import { handleDeleteTipo } from "./hooks/useTipoElementoLimpiezaDelete";
import { useTipoElementoLimpiezaSubmit } from "./hooks/useTipoElementoLimpiezaSubmit";
import type { TipoElementoLimpieza } from "./types";

type Vista = "listado" | "crear" | "modificar";

export const GestionTiposElementoLimpieza = () => {
    const [vista, setVista] = useState<Vista>("listado");
    const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoElementoLimpieza | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [tipoEliminar, setTipoEliminar] = useState<TipoElementoLimpieza | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);

    const [tipoAlta, setTipoAlta] = useState<TipoElementoLimpieza | null>(null);
    const [altaAbierto, setAltaAbierto] = useState(false);

    const [refrescar, setRefrescar] = useState(0);

    const confirmarEliminar = () => {
        handleDeleteTipo({
            tipo: tipoEliminar,
            setLoading,
            setError,
            onSuccess: () => {
                setEliminarAbierto(false);
                setTipoEliminar(null);
                setRefrescar((r) => r + 1);
            },
        });
    };

    const reactivar = useTipoElementoLimpiezaSubmit({
        endpoint: "http://127.0.0.1:8000/tipos-elemento-limpieza/",
        method: "PUT",
        id: tipoAlta?.id,
        body: { activo: true },
        onSuccess: () => {
            setAltaAbierto(false);
            setTipoAlta(null);
            setRefrescar((r) => r + 1);
        },
    });

    const confirmarAlta = async () => {
        if (!tipoAlta) return;
        setError("");
        const res = await reactivar.submit();
        if (res.status === "error") setError(res.message);
    };

    return (
        <Box>
            {vista === "listado" && (
                <ListadoTiposElementoLimpieza
                    key={refrescar}
                    onCrear={() => setVista("crear")}
                    onModificar={(tipo) => { setError(""); setTipoSeleccionado(tipo); setVista("modificar"); }}
                    onEliminar={(tipo) => { setError(""); setTipoEliminar(tipo); setEliminarAbierto(true); }}
                    onDarAlta={(tipo) => { setError(""); setTipoAlta(tipo); setAltaAbierto(true); }}
                />
            )}

            {vista === "crear" && (
                <TipoElementoLimpiezaForm
                    modo="crear"
                    onCancelar={() => setVista("listado")}
                    onGuardado={() => { setVista("listado"); setRefrescar((r) => r + 1); }}
                />
            )}

            {vista === "modificar" && tipoSeleccionado && (
                <TipoElementoLimpiezaForm
                    modo="modificar"
                    tipo={tipoSeleccionado}
                    onCancelar={() => setVista("listado")}
                    onGuardado={() => { setVista("listado"); setRefrescar((r) => r + 1); }}
                />
            )}

            <AlertDelete
                open={eliminarAbierto}
                name={tipoEliminar?.nombre ?? null}
                loading={loading}
                error={error}
                onConfirm={confirmarEliminar}
                onCancel={() => { setEliminarAbierto(false); setError(""); }}
            />

            <AlertConfirm
                open={altaAbierto}
                title="Dar de Alta"
                message={`¿Estás seguro que querés dar de alta el tipo "${tipoAlta?.nombre}"?`}
                loading={reactivar.isSubmitting}
                error={error}
                onConfirm={confirmarAlta}
                onCancel={() => { setAltaAbierto(false); setError(""); }}
            />
        </Box>
    );
};