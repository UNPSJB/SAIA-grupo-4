import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ListadoTiposIncidentes } from "./ListadoTiposIncidente";
import { TipoIncidenteForm } from "./TipoIncidenteForm";
import { AlertDelete, AlertConfirm } from "../../components/ui";
import { handleDeleteTipoIncidente } from "./hooks/useTipoIncidenteDelete";
import { useTipoIncidenteSubmit } from "./hooks/useTipoIncidenteSubmit";
import type { TipoIncidente } from "./types";

type Vista = "listado" | "crear" | "modificar";

export const GestionTiposIncidente = () => {
  const [vista, setVista] = useState<Vista>("listado");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoIncidente | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tipoEliminar, setTipoEliminar] = useState<TipoIncidente | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);

  const [tipoAlta, setTipoAlta] = useState<TipoIncidente | null>(null);
  const [altaAbierto, setAltaAbierto] = useState(false);

  const [refrescar, setRefrescar] = useState(0);

  const confirmarEliminar = () => {
      handleDeleteTipoIncidente({
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

  const reactivar = useTipoIncidenteSubmit({
    endpoint: "http://127.0.0.1:8000/tipos-incidente/",
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
        <ListadoTiposIncidentes
          key={refrescar}
          onCrear={() => setVista("crear")}
          onModificar={(tipo) => {
            setError("");
            setTipoSeleccionado(tipo);
            setVista("modificar");
          }}
          onEliminar={(tipo) => {
            setError("");
            setTipoEliminar(tipo);
            setEliminarAbierto(true);
          }}
          onDarAlta={(tipo) => {
            setError("");
            setTipoAlta(tipo);
            setAltaAbierto(true);
          }}
        />
      )}

      {vista === "crear" && (
        <TipoIncidenteForm
          modo='crear'
          onCancelar={() => setVista("listado")}
          onGuardado={() => {
            setVista("listado");
            setRefrescar((r) => r + 1);
          }}
          enModal
        />
      )}

      {vista === "modificar" && tipoSeleccionado && (
        <TipoIncidenteForm
          modo='modificar'
          tipo={tipoSeleccionado}
          onCancelar={() => setVista("listado")}
          onGuardado={() => {
            setVista("listado");
            setRefrescar((r) => r + 1);
          }}
          enModal
        />
      )}

      <AlertDelete
        open={eliminarAbierto}
        name={tipoEliminar?.nombre ?? null}
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
        title='Dar de Alta'
        message={`¿Estás seguro que querés dar de alta el tipo "${tipoAlta?.nombre}"?`}
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
};