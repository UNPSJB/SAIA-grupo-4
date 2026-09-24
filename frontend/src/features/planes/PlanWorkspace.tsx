import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, VStack } from "@chakra-ui/react";
import { FiClock } from "react-icons/fi";
import {
  AlertConfirm,
  AlertDelete,
  FormModal,
  AlertMessage,
} from "../../components/ui";
import { ListadoTareas } from "./ListadoTareas";
import { TareaForm } from "./TareaForm";
import { TareaDetalle } from "./TareaDetalle";
import { PlanForm } from "./PlanForm";
import type { PlanPoe, TareaLimpieza } from "./types";

type Vista =
  | "listado"
  | "crearTarea"
  | "modificarTarea"
  | "verTarea"
  | "modificarPlan";

const clonarTarea = (t: TareaLimpieza): TareaLimpieza => ({
  ...t,
  pasos: [...t.pasos],
  dias: [...t.dias],
  quimicos: [...t.quimicos],
  elementos: [...t.elementos],
});

interface PlanWorkspaceProps {
  initialPlan: PlanPoe;
  initialTareas: TareaLimpieza[];
  esBorrador?: boolean;
  onPromover?: (plan: PlanPoe, tareas: TareaLimpieza[]) => void;
}

export const PlanWorkspace = ({
  initialPlan,
  initialTareas,
  esBorrador = false,
  onPromover,
}: PlanWorkspaceProps) => {
  const navigate = useNavigate();

  const [plan, setPlan] = useState<PlanPoe | null>(initialPlan);
  const [tareas, setTareas] = useState<TareaLimpieza[]>(() =>
    initialTareas.map(clonarTarea),
  );

  const [vista, setVista] = useState<Vista>("listado");
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaLimpieza | null>(null);

  const [tareaBaja, setTareaBaja] = useState<TareaLimpieza | null>(null);
  const [bajaTareaAbierto, setBajaTareaAbierto] = useState(false);

  const [tareaAlta, setTareaAlta] = useState<TareaLimpieza | null>(null);
  const [altaTareaAbierto, setAltaTareaAbierto] = useState(false);

  const [bajaPlanAbierto, setBajaPlanAbierto] = useState(false);

  const [altaPlanAbierto, setAltaPlanAbierto] = useState(false);

  if (!plan) {
    return (
      <VStack
        maxW='4xl'
        mx='auto'
        mt={20}
        p={10}
        borderWidth='1px'
        borderRadius='lg'
        boxShadow='lg'
        bg='white'
        gap={4}
      >
        <AlertMessage
          type='info'
          message='No hay un plan vigente. El plan fue dado de baja.'
        />
        <Button colorPalette='green' onClick={() => navigate("/historial-planes")}>
          <FiClock /> Ver historial de planes
        </Button>
      </VStack>
    );
  }

  const confirmarBajaTarea = () => {
    if (!tareaBaja) return;
    setTareas((prev) =>
      prev.map((t) => (t.id === tareaBaja.id ? { ...t, activo: false } : t)),
    );
    setBajaTareaAbierto(false);
    setTareaBaja(null);
  };

  const confirmarAltaTarea = () => {
    if (!tareaAlta) return;
    setTareas((prev) =>
      prev.map((t) => (t.id === tareaAlta.id ? { ...t, activo: true } : t)),
    );
    setAltaTareaAbierto(false);
    setTareaAlta(null);
  };

  const confirmarBajaPlan = () => {
    setPlan(null);
    setTareas([]);
    setBajaPlanAbierto(false);
  };

  const confirmarAltaPlan = () => {
    if (!plan) return;
    onPromover?.(plan, tareas);
    setAltaPlanAbierto(false);
  };

  const guardarTarea = (tarea: TareaLimpieza) => {
    setTareas((prev) => {
      const existe = prev.some((t) => t.id === tarea.id);
      return existe
        ? prev.map((t) => (t.id === tarea.id ? tarea : t))
        : [...prev, tarea];
    });
    setVista("listado");
    setTareaSeleccionada(null);
  };

  const guardarPlan = (planActualizado: PlanPoe) => {
    setPlan(planActualizado);
    setVista("listado");
  };

  return (
    <>
      <ListadoTareas
        plan={plan}
        tareas={tareas}
        esBorrador={esBorrador}
        onAgregarTarea={() => setVista("crearTarea")}
        onModificarTarea={(tarea) => {
          setTareaSeleccionada(tarea);
          setVista("modificarTarea");
        }}
        onVerTarea={(tarea) => {
          setTareaSeleccionada(tarea);
          setVista("verTarea");
        }}
        onDarBajaTarea={(tarea) => {
          setTareaBaja(tarea);
          setBajaTareaAbierto(true);
        }}
        onDarAltaTarea={(tarea) => {
          setTareaAlta(tarea);
          setAltaTareaAbierto(true);
        }}
        onHistorial={() => navigate("/historial-planes")}
        onModificarPlan={() => setVista("modificarPlan")}
        onDarBajaPlan={() => setBajaPlanAbierto(true)}
        onDarAltaPlan={esBorrador ? () => setAltaPlanAbierto(true) : undefined}
      />

      {vista === "verTarea" && tareaSeleccionada && (
        <TareaDetalle
          tarea={tareaSeleccionada}
          onCerrar={() => setVista("listado")}
        />
      )}

      {(vista === "crearTarea" || vista === "modificarTarea") && (
        <FormModal
          open
          onClose={() => {
            setVista("listado");
            setTareaSeleccionada(null);
          }}
        >
          {vista === "crearTarea" && (
            <TareaForm
              modo='crear'
              onCancelar={() => setVista("listado")}
              onGuardado={guardarTarea}
              enModal
            />
          )}
          {vista === "modificarTarea" && tareaSeleccionada && (
            <TareaForm
              modo='modificar'
              tarea={tareaSeleccionada}
              onCancelar={() => setVista("listado")}
              onGuardado={guardarTarea}
              enModal
            />
          )}
        </FormModal>
      )}

      {vista === "modificarPlan" && (
        <FormModal open onClose={() => setVista("listado")}>
          <PlanForm
            plan={plan}
            onCancelar={() => setVista("listado")}
            onGuardado={guardarPlan}
            enModal
          />
        </FormModal>
      )}

      <AlertDelete
        open={bajaTareaAbierto}
        title='Baja de tarea'
        name={tareaBaja?.nombre ?? null}
        loading={false}
        onConfirm={confirmarBajaTarea}
        onCancel={() => {
          setBajaTareaAbierto(false);
          setTareaBaja(null);
        }}
      />

      <AlertConfirm
        open={altaTareaAbierto}
        title='Dar de Alta'
        message={`¿Estás seguro que querés dar de alta la tarea "${tareaAlta?.nombre}"?`}
        onConfirm={confirmarAltaTarea}
        onCancel={() => {
          setAltaTareaAbierto(false);
          setTareaAlta(null);
        }}
      />

      <AlertConfirm
        open={bajaPlanAbierto}
        title='Dar de baja el plan'
        message={`¿Estás seguro que querés dar de baja el plan "${plan.nombre_plan}" ${plan.version}? Esta acción no se puede deshacer.`}
        onConfirm={confirmarBajaPlan}
        onCancel={() => setBajaPlanAbierto(false)}
      />

      {esBorrador && (
        <AlertConfirm
          open={altaPlanAbierto}
          title='Dar de alta el plan'
          message={`¿Estás seguro que querés dar de alta el plan "${plan.nombre_plan}" ${plan.version}? Pasara a ser el plan vigente.`}
          onConfirm={confirmarAltaPlan}
          onCancel={() => setAltaPlanAbierto(false)}
        />
      )}
    </>
  );
};