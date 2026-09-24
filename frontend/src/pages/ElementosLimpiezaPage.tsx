import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ElementoLimpiezaForm } from "../features/elementosLimpieza/ElementoLimpiezaForm";
import { ListadoElementosLimpieza } from "../features/elementosLimpieza/ListadoElementosLimpieza";
import { TipoElementoLimpiezaForm } from "../features/elementosLimpieza/TipoElementoLimpiezaForm";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";
import { handleDelete } from "../features/elementosLimpieza/hooks/useElementoLimpiezaDelete";
import { useElementoLimpiezaSubmit } from "../features/elementosLimpieza/hooks/useElementoLimpiezaSubmit";
import type { ElementoLimpieza } from "../features/elementosLimpieza/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function ElementosLimpiezaPage() {
    const [vista, setVista] = useState<Vista>("listado");
    const [elementoSeleccionado, setElementoSeleccionado] = useState<ElementoLimpieza | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [elementoEliminar, setElementoEliminar] = useState<ElementoLimpieza | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);

    const [elementoAlta, setElementoAlta] = useState<ElementoLimpieza | null>(null);
    const [altaAbierto, setAltaAbierto] = useState(false);

    const [tipoModalAbierto, setTipoModalAbierto] = useState(false);

    const [refrescar, setRefrescar] = useState(0);

    const confirmarEliminar = () => {
        handleDelete({
            elemento: elementoEliminar,
            setLoading,
            setError,
            onSuccess: () => {
                setEliminarAbierto(false);
                setElementoEliminar(null);
                setRefrescar((r) => r + 1);
            },
        });
    };

    const reactivar = useElementoLimpiezaSubmit({
        endpoint: "http://127.0.0.1:8000/elementos-limpieza/",
        method: "PUT",
        id: elementoAlta?.id,
        body: { activo: true },
        onSuccess: () => {
            setAltaAbierto(false);
            setElementoAlta(null);
            setRefrescar((r) => r + 1);
        },
    });

    const confirmarAlta = async () => {
        if (!elementoAlta) return;
        setError("");
        const res = await reactivar.submit();
        if (res.status === "error") setError(res.message);
    };

    return (
        <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
            <ListadoElementosLimpieza
                key={refrescar}
                onCrear={() => setVista("crear")}
                onCrearTipo={() => setTipoModalAbierto(true)}
                onModificar={(elemento) => { setError(""); setElementoSeleccionado(elemento); setVista("modificar"); }}
                onEliminar={(elemento) => { setError(""); setElementoEliminar(elemento); setEliminarAbierto(true); }}
                onVer={(elemento) => { setError(""); setElementoSeleccionado(elemento); setVista("ver"); }}
                onDarAlta={(elemento) => { setError(""); setElementoAlta(elemento); setAltaAbierto(true); }}
            />

            {(vista === "crear" || vista === "modificar" || vista === "ver") && (
                <FormModal open onClose={() => { setError(""); setVista("listado"); }}>
                    {vista === "crear" && (
                        <ElementoLimpiezaForm
                            modo="crear"
                            onCancelar={() => setVista("listado")}
                            onGuardado={() => { setVista("listado"); setRefrescar((r) => r + 1); }}
                        />
                    )}

                    {vista === "modificar" && elementoSeleccionado && (
                        <ElementoLimpiezaForm
                            modo="modificar"
                            elemento={elementoSeleccionado}
                            onCancelar={() => setVista("listado")}
                            onGuardado={() => { setVista("listado"); setRefrescar((r) => r + 1); }}
                        />
                    )}

                    {vista === "ver" && elementoSeleccionado && (
                        <ElementoLimpiezaForm
                            modo="ver"
                            elemento={elementoSeleccionado}
                            onCancelar={() => setVista("listado")}
                        />
                    )}
                </FormModal>
            )}

            {tipoModalAbierto && (
                <FormModal open onClose={() => setTipoModalAbierto(false)}>
                    <TipoElementoLimpiezaForm
                        onCancelar={() => setTipoModalAbierto(false)}
                        onGuardado={() => setTipoModalAbierto(false)}
                    />
                </FormModal>
            )}

            <AlertDelete
                open={eliminarAbierto}
                name={elementoEliminar?.tipo?.nombre ?? null}
                loading={loading}
                error={error}
                onConfirm={confirmarEliminar}
                onCancel={() => { setEliminarAbierto(false); setError(""); }}
            />

            <AlertConfirm
                open={altaAbierto}
                title="Dar de Alta"
                message={`¿Estás seguro que querés dar de alta este elemento (${elementoAlta?.tipo?.nombre})?`}
                loading={reactivar.isSubmitting}
                error={error}
                onConfirm={confirmarAlta}
                onCancel={() => { setAltaAbierto(false); setError(""); }}
            />
        </Box>
    );
}