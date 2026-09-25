import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { FiTool } from "react-icons/fi";
import {
  AlertMessage,
  FormModal,
  LoadingState,
} from "../components/ui";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import { PlanForm } from "../features/planes/PlanForm";
import { PlanWorkspace } from "../features/planes/PlanWorkspace";
import { usePlanData } from "../features/planes/hooks/usePlanData";

export default function NuevoPlanPage() {
  const navigate = useNavigate();
  const { loading, error, borrador, reload } = usePlanData();
  const [crearAbierto, setCrearAbierto] = useState(false);

  const guardarBorrador = () => {
    setCrearAbierto(false);
    reload();
  };

  if (loading) {
    return (
      <Box p={10} bg='gray.100' minH='100vh'>
        <Box maxW='7xl' mx='auto' mt={20}>
          <LoadingState message='Cargando nuevo plan...' />
        </Box>
      </Box>
    );
  }

  if (borrador) {
    return (
      <Box p={10} bg='gray.100' minH='100vh'>
        <PlanWorkspace
          key={borrador.id}
          initialPlan={borrador}
          esBorrador
          onPromovido={() => navigate("/plan-poes")}
          onCambio={reload}
        />
      </Box>
    );
  }

  return (
    <ListadoContainer maxW='6xl'>
      <ListadoHeader
        title='Nuevo Plan POES'
        icon={FiTool}
        buttonLabel='Crear plan'
        onCrear={() => setCrearAbierto(true)}
      />

      {error && <AlertMessage type='error' message={error} />}

      <AlertMessage
        type='info'
        message='Todavía no hay un borrador de plan cargado. Para empezar, creá un nuevo plan.'
      />

      <FormModal open={crearAbierto} onClose={() => setCrearAbierto(false)}>
        <PlanForm
          modo='crear'
          onCancelar={() => setCrearAbierto(false)}
          onGuardado={guardarBorrador}
          enModal
        />
      </FormModal>
    </ListadoContainer>
  );
}