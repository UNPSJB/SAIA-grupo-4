import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { FiTool } from "react-icons/fi";
import { AlertMessage, FormModal } from "../components/ui";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import { PlanForm } from "../features/planes/PlanForm";
import { PlanWorkspace } from "../features/planes/PlanWorkspace";
import { setPlanVigente } from "../features/planes/mockData";
import type { PlanPoe, TareaLimpieza } from "../features/planes/types";

export default function NuevoPlanPage() {
  const navigate = useNavigate();
  const [borrador, setBorrador] = useState<PlanPoe | null>(null);
  const [crearAbierto, setCrearAbierto] = useState(false);

  const guardarBorrador = (plan: PlanPoe) => {
    setBorrador(plan);
    setCrearAbierto(false);
  };

  const promover = (plan: PlanPoe, tareas: TareaLimpieza[]) => {
    setPlanVigente(plan, tareas);
    navigate("/plan-poes");
  };

  if (borrador) {
    return (
      <Box p={10} bg='gray.100' minH='100vh'>
        <PlanWorkspace
          key={borrador.id}
          initialPlan={borrador}
          initialTareas={[]}
          esBorrador
          onPromover={promover}
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
