import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { InsumoQuimicoForm } from "../features/insumoQuimico/InsumoQuimicoForm";
import { ListadoInsumosQuimicos } from "../features/insumoQuimico/ListadoInsumoQuimico";
import { AlertDelete, AlertConfirm } from "../components/ui";
import { handleDelete } from "../features/insumoQuimico/hooks/useInsumoQuimicoDelete";
import { useInsumoQuimicoSubmit } from "../features/insumoQuimico/hooks/useInsumoQuimicoSubmit";
import type { InsumoQuimico } from "../features/insumoQuimico/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function InsumoQuimicoPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [insumoQuimicoSeleccionado, setInsumoQuimicoSeleccionado] = useState<InsumoQuimico | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insumoQuimicoEliminar, setInsumoQuimicoEliminar] = useState<InsumoQuimico | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [insumoQuimicoAlta, setInsumoQuimicoAlta] = useState<InsumoQuimico | null>(null);
  const [altaAbierto, setAltaAbierto] = useState(false);
  const [refescar, setRefrescar] = useState(0);

  const confirmarEliminar = () => {
    handleDelete({
      insumoQuimico: insumoQuimicoEliminar,
      setLoading,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setInsumoQuimicoEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  const reactivar = useInsumoQuimicoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos-quimicos/",
    method: "PUT",
    id: insumoQuimicoAlta?.id,
    body: { activo: true },
    onSuccess: () => {
      setAltaAbierto(false);
      setInsumoQuimicoAlta(null);
      setRefrescar((r) => r + 1);
    },
  });

  const confirmarAlta = async () => {
    if (!insumoQuimicoAlta) return;
    setError("");
    const res = await reactivar.submit();
    if (res.status === "error") {
      setError(res.message);
    }
  };

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      {vista === "listado" && (
        <ListadoInsumosQuimicos
          key={refescar}
          onCrear={() => {
            setError("");
            setVista("crear");
          }}
          onModificar={(insumoQuimico) => {
            setError("");
            setInsumoQuimicoSeleccionado(insumoQuimico);
            setVista("modificar");
          }}
          onEliminar={(insumoQuimico) => {
            setError("");
            setInsumoQuimicoEliminar(insumoQuimico);
            setEliminarAbierto(true);
          }}
          onVer={(insumoQuimico) => {
            setError("");
            setInsumoQuimicoSeleccionado(insumoQuimico);
            setVista("ver");
          }}
          onDarAlta={(insumoQuimico) => {
            setError("");
            setInsumoQuimicoAlta(insumoQuimico);
            setAltaAbierto(true);
          }}
        />
      )}
      {vista === "ver" && insumoQuimicoSeleccionado && (
        <InsumoQuimicoForm
          modo='ver'
          insumoQuimico={insumoQuimicoSeleccionado}
          onCancelar={() => setVista("listado")}
        />
      )}
      {vista === "crear" && (
        <InsumoQuimicoForm
          modo='crear'
          onCancelar={() => setVista("listado")}
          onGuardado={() => setVista("listado")}
        />
      )}
      {vista === "modificar" && insumoQuimicoSeleccionado && (
        <InsumoQuimicoForm
          modo='modificar'
          insumoQuimico={insumoQuimicoSeleccionado}
          onCancelar={() => setVista("listado")}
          onGuardado={() => setVista("listado")}
        />
      )}

      <AlertDelete
        open={eliminarAbierto}
        name={insumoQuimicoEliminar?.nombre ?? null}
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
        message={`¿Esta seguro que quiere dar de alta a ${insumoQuimicoAlta?.nombre}?`}
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