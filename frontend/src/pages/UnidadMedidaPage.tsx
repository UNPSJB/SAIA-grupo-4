import { BASE_URL } from "../config";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button } from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import { UnidadMedidaForm } from "../features/unidadMedida/UnidadMedidaForm";
import { UnidadMedidaDetalle } from "../features/unidadMedida/UnidadMedidaDetalle";
import { ListadoUnidadMedida } from "../features/unidadMedida/ListadoUnidadMedida";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";
import { handleDelete } from "../features/unidadMedida/hooks/useUnidadMedidaDelete";
import { useUnidadMedidaSubmit } from "../features/unidadMedida/hooks/useUnidadMedidaSubmit";
import type { UnidadMedida } from "../features/unidadMedida/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function UnidadMedidaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vista, setVista] = useState<Vista>("listado");
  const [unidadSeleccionada, setUnidadSeleccionada] =
    useState<UnidadMedida | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unidadEliminar, setUnidadEliminar] = useState<UnidadMedida | null>(
    null,
  );
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [unidadAlta, setUnidadAlta] = useState<UnidadMedida | null>(null);
  const [altaAbierto, setAltaAbierto] = useState(false);
  const [refrescar, setRefrescar] = useState(0);

  const confirmarEliminar = () => {
    handleDelete({
      unidad: unidadEliminar,
      setLoading,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setUnidadEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  const reactivar = useUnidadMedidaSubmit({
    endpoint: `${BASE_URL}/unidades-de-medida/`,
    method: "PUT",
    id: unidadAlta?.id,
    body: { disponible: true },
    onSuccess: () => {
      setAltaAbierto(false);
      setUnidadAlta(null);
      setRefrescar((r) => r + 1);
    },
  });

  const confirmarAlta = async () => {
    if (!unidadAlta) return;
    setError("");
    const res = await reactivar.submit();
    if (res.status === "error") {
      setError(res.message);
    }
  };

  // El listado de unidades se abre desde Insumos y desde Insumos Químicos; el
  // origen viaja en el state para poder ofrecer el botón de volver correcto.
  const origen = location.state as { from?: string; label?: string } | null;
  const volverA = origen?.from;
  const volverLabel = origen?.label;

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      {volverA && (
        <Box maxW='4xl' mx='auto' mb={-4} textAlign='left'>
          <Button
            variant='ghost'
            colorPalette='green'
            onClick={() => navigate(volverA)}
          >
            <FiArrowLeft /> Volver a {volverLabel}
          </Button>
        </Box>
      )}
      <ListadoUnidadMedida
        key={refrescar}
        onCrear={() => {
          setError("");
          setVista("crear");
        }}
        onModificar={(unidad) => {
          setError("");
          setUnidadSeleccionada(unidad);
          setVista("modificar");
        }}
        onEliminar={(unidad) => {
          setError("");
          setUnidadEliminar(unidad);
          setEliminarAbierto(true);
        }}
        onVer={(unidad) => {
          setError("");
          setUnidadSeleccionada(unidad);
          setVista("ver");
        }}
        onDarAlta={(unidad) => {
          setError("");
          setUnidadAlta(unidad);
          setAltaAbierto(true);
        }}
      />
      {vista === "ver" && unidadSeleccionada && (
        <UnidadMedidaDetalle
          unidad={unidadSeleccionada}
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
            <UnidadMedidaForm
              modo='crear'
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
              enModal
            />
          )}
          {vista === "modificar" && unidadSeleccionada && (
            <UnidadMedidaForm
              modo='modificar'
              unidad={unidadSeleccionada}
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
              enModal
            />
          )}
        </FormModal>
      )}

      <AlertDelete
        open={eliminarAbierto}
        name={unidadEliminar?.nombre ?? null}
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
        message={`¿Esta seguro que quiere dar de alta a ${unidadAlta?.nombre}?`}
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
