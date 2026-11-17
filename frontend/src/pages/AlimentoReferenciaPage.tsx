import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button } from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import { AlertDelete, FormModal } from "../components/ui";
import { AlimentoReferenciaDetalle } from "../features/alimentoReferencia/AlimentoReferenciaDetalle";
import { AlimentoReferenciaForm } from "../features/alimentoReferencia/AlimentoReferenciaForm";
import { ListadoAlimentoReferencia } from "../features/alimentoReferencia/ListadoAlimentoReferencia";
import { handleDeleteAlimentoReferencia } from "../features/alimentoReferencia/hooks/useAlimentoReferenciaDelete";
import type { AlimentoReferencia } from "../features/alimentoReferencia/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function AlimentoReferenciaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vista, setVista] = useState<Vista>("listado");
  const [seleccionado, setSeleccionado] = useState<AlimentoReferencia | null>(
    null,
  );
  const [alimentoEliminar, setAlimentoEliminar] =
    useState<AlimentoReferencia | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refrescar, setRefrescar] = useState(0);

  const origen = location.state as { from?: string; label?: string } | null;
  const volverA = origen?.from;
  const volverLabel = origen?.label;

  const confirmarEliminar = () => {
    handleDeleteAlimentoReferencia({
      alimento: alimentoEliminar,
      setLoading,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setAlimentoEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      {volverA && (
        <Box maxW='8xl' mx='auto' mb={-4} textAlign='left'>
          <Button
            variant='ghost'
            colorPalette='green'
            onClick={() => navigate(volverA)}
          >
            <FiArrowLeft /> Volver a {volverLabel}
          </Button>
        </Box>
      )}

      <ListadoAlimentoReferencia
        key={refrescar}
        onCrear={() => {
          setError("");
          setVista("crear");
        }}
        onModificar={(item) => {
          setError("");
          setSeleccionado(item);
          setVista("modificar");
        }}
        onEliminar={(item) => {
          setError("");
          setAlimentoEliminar(item);
          setEliminarAbierto(true);
        }}
        onVer={(item) => {
          setError("");
          setSeleccionado(item);
          setVista("ver");
        }}
      />

      {vista === "ver" && seleccionado && (
        <AlimentoReferenciaDetalle
          alimento={seleccionado}
          onCerrar={() => setVista("listado")}
        />
      )}

      {(vista === "crear" || vista === "modificar") && (
        <FormModal
          open
          onClose={() => {
            setError("");
            setVista("listado");
          }}
        >
          {vista === "crear" && (
            <AlimentoReferenciaForm
              modo='crear'
              enModal
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
            />
          )}
          {vista === "modificar" && seleccionado && (
            <AlimentoReferenciaForm
              modo='modificar'
              alimento={seleccionado}
              enModal
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
            />
          )}
        </FormModal>
      )}

      <AlertDelete
        open={eliminarAbierto}
        name={alimentoEliminar?.alimento ?? null}
        loading={loading}
        error={error}
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setEliminarAbierto(false);
          setError("");
        }}
      />
    </Box>
  );
}
