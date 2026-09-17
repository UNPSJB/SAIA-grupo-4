import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { InsumoForm } from "../features/insumo/InsumoForm";
import { ListadoInsumos } from "../features/insumo/ListadoInsumo";
import { AlertDelete } from "../components/ui";
import { handleDelete } from "../features/insumo/useInsumoDelete";
import type { Insumo } from "../features/insumo/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function InsumoPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insumoEliminar, setInsumoEliminar] = useState<Insumo | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [refescar, setRefrescar] = useState(0);
  const confirmarEliminar = () => {
    handleDelete({
      insumo: insumoEliminar,
      setLoading,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setInsumoEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      {vista === "listado" && (
        <ListadoInsumos
          key={refescar}
          onCrear={() => setVista("crear")}
          onModificar={(insumo) => {
            setInsumoSeleccionado(insumo);
            setVista("modificar");
          }}
          onEliminar={(insumo) => {
            setInsumoEliminar(insumo);
            setEliminarAbierto(true);
          }}
          onVer={(insumo) => {
            setInsumoSeleccionado(insumo);
            setVista("ver");
          }}
        />
      )}
      {vista === "ver" && insumoSeleccionado && (
        <InsumoForm
          modo='ver'
          insumo={insumoSeleccionado}
          onCancelar={() => setVista("listado")}
        />
      )}
      {vista === "crear" && (
        <InsumoForm
          modo='crear'
          onCancelar={() => setVista("listado")}
          onGuardado={() => setVista("listado")}
        />
      )}
      {vista === "modificar" && insumoSeleccionado && (
        <InsumoForm
          modo='modificar'
          insumo={insumoSeleccionado}
          onCancelar={() => setVista("listado")}
          onGuardado={() => setVista("listado")}
        />
      )}

      <AlertDelete
        open={eliminarAbierto}
        name={insumoEliminar?.nombre ?? null}
        loading={loading}
        error={error}
        onConfirm={confirmarEliminar}
        onCancel={() => setEliminarAbierto(false)}
      />
    </Box>
  );
}
