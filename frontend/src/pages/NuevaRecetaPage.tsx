import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, HStack } from "@chakra-ui/react";
import { FiBookOpen, FiList, FiPlus } from "react-icons/fi";
import {
  AlertMessage,
  FormModal,
  LoadingState,
} from "../components/ui";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import { RecetaForm } from "../features/recetas/RecetaForm";
import RecetaWorkspace from "../features/recetas/RecetaWorkspace";
import { useRecetaBorrador } from "../features/recetas/hooks/useRecetaBorrador";
import type { Receta } from "../features/recetas/types";

export default function NuevaRecetaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recetaIdParam = searchParams.get("recetaId");
  const recetaId = recetaIdParam ? Number(recetaIdParam) : undefined;

  const { loading, error, receta, recargar } = useRecetaBorrador(recetaId);
  const [crearAbierto, setCrearAbierto] = useState(false);

  const guardarReceta = (nueva: Receta) => {
    setCrearAbierto(false);
    navigate(`/nueva-receta?recetaId=${nueva.id}`);
  };

  if (loading) {
    return (
      <Box p={10} bg="gray.100" minH="100vh">
        <Box maxW="7xl" mx="auto" mt={20}>
          <LoadingState message="Cargando nueva receta..." />
        </Box>
      </Box>
    );
  }

  if (receta) {
    return (
      <>
        <RecetaWorkspace
          key={receta.id}
          initialReceta={receta}
          onCambio={recargar}
          onPromovido={() => navigate("/recetas")}
          onCrearReceta={() => setCrearAbierto(true)}
        />

        <FormModal
          open={crearAbierto}
          onClose={() => setCrearAbierto(false)}
        >
          <RecetaForm
            modo="crear"
            onCancelar={() => setCrearAbierto(false)}
            onGuardado={guardarReceta}
            enModal
          />
        </FormModal>
      </>
    );
  }

  return (
    <ListadoContainer maxW="6xl">
      <ListadoHeader title="Nueva Receta" icon={FiBookOpen}>
        <HStack justify="space-between" mb={6} align="center">
          <Button
            variant="outline"
            colorPalette="green"
            onClick={() => navigate("/recetas")}
          >
            <FiList /> Ver listado
          </Button>
          <Button
            variant="solid"
            colorPalette="green"
            onClick={() => setCrearAbierto(true)}
          >
            <FiPlus /> Crear Receta
          </Button>
        </HStack>
      </ListadoHeader>

      {error ? (
        <AlertMessage type="error" message={error} />
      ) : (
        <AlertMessage
          type="info"
          message="No hay recetas en borrador. Para empezar, creá una nueva receta."
        />
      )}

      <FormModal open={crearAbierto} onClose={() => setCrearAbierto(false)}>
        <RecetaForm
          modo="crear"
          onCancelar={() => setCrearAbierto(false)}
          onGuardado={guardarReceta}
          enModal
        />
      </FormModal>
    </ListadoContainer>
  );
}
