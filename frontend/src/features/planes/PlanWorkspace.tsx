import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, VStack } from "@chakra-ui/react";
import { FiClock } from "react-icons/fi";
import {
  AlertConfirm,
  AlertDelete,
  AlertMessage,
  FormModal,
} from "../../components/ui";
import { ListadoTareas } from "./ListadoTareas";
import { TareaForm } from "./TareaForm";
import { TareaDetalle } from "./TareaDetalle";
import { PlanForm } from "./PlanForm";
import type { PlanPOES, TareaPOES } from "./types";
import { usePlanCatalogs } from "./hooks/usePlanCatalogs";
import { planesApi } from "./hooks/planApi";

type Vista =
  | "listado"
  | "crearTarea"
  | "modificarTarea"
  | "verTarea"
  | "modificarPlan";

interface PlanWorkspaceProps {
  initialPlan: PlanPOES;
  esBorrador?: boolean;
  historialOrigen?: "nuevo-plan";
  onPromovido?: () => void;
  onCambio?: () => void;
}

export const PlanWorkspace = ({
  initialPlan,
  esBorrador = false,
  historialOrigen,
  onPromovido,
  onCambio,
}: PlanWorkspaceProps) => {
  const navigate = useNavigate();

  const irAlHistorial = () =>
    navigate(
      "/historial-planes",
      historialOrigen ? { state: { origen: historialOrigen } } : undefined,
    );

  const {
    catalogs,
    loading: cargandoCatalogs,
    error: errorCatalogos,
  } = usePlanCatalogs();

  const [plan, setPlan] = useState<PlanPOES | null>(initialPlan);
  const [tareas, setTareas] = useState<TareaPOES[]>([]);
  const [cargandoTareas, setCargandoTareas] = useState(true);
  const [errorTareas, setErrorTareas] = useState("");

  const [vista, setVista] = useState<Vista>("listado");
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaPOES | null>(
    null,
  );

  const [tareaBaja, setTareaBaja] = useState<TareaPOES | null>(null);
  const [bajaTareaAbierto, setBajaTareaAbierto] = useState(false);

  const [tareaAlta, setTareaAlta] = useState<TareaPOES | null>(null);
  const [altaTareaAbierto, setAltaTareaAbierto] = useState(false);

  const [bajaPlanAbierto, setBajaPlanAbierto] = useState(false);
  const [altaPlanAbierto, setAltaPlanAbierto] = useState(false);

  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  useEffect(() => {
    let active = true;
    planesApi
      .obtenerTareas(initialPlan.id)
      .then((ts) => {
        if (active) {
          setTareas(ts);
          setCargandoTareas(false);
          setErrorTareas("");
        }
      })
      .catch((e) => {
        if (active) {
          setErrorTareas(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar las tareas.",
          );
          setCargandoTareas(false);
        }
      });
    return () => {
      active = false;
    };
  }, [initialPlan.id]);

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
          message={
            esBorrador
              ? "El borrador fue descartado."
              : "No hay un plan vigente. El plan fue dado de baja."
          }
        />

        <Button colorPalette='green' onClick={irAlHistorial}>
          <FiClock /> Ver historial de planes
        </Button>
      </VStack>
    );
  }

  const confirmarBajaTarea = async () => {
    if (!tareaBaja) return;
    setCargandoAccion(true);
    setErrorAccion("");
    try {
      const actualizada = await planesApi.modificarTarea(tareaBaja.id, {
        activo: false,
      });
      setTareas((prev) =>
        prev.map((t) => (t.id === actualizada.id ? actualizada : t)),
      );
      setBajaTareaAbierto(false);
      setTareaBaja(null);
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo dar de baja la tarea.",
      );
    } finally {
      setCargandoAccion(false);
    }
  };

  const confirmarAltaTarea = async () => {
    if (!tareaAlta) return;
    setCargandoAccion(true);
    setErrorAccion("");
    try {
      const actualizada = await planesApi.modificarTarea(tareaAlta.id, {
        activo: true,
      });
      setTareas((prev) =>
        prev.map((t) => (t.id === actualizada.id ? actualizada : t)),
      );
      setAltaTareaAbierto(false);
      setTareaAlta(null);
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo dar de alta la tarea.",
      );
    } finally {
      setCargandoAccion(false);
    }
  };

  const confirmarBajaPlan = async () => {
    if (!plan) return;
    setCargandoAccion(true);
    setErrorAccion("");
    try {
      if (esBorrador) {
        await planesApi.descartarBorrador(plan.id);
      } else {
        await planesApi.archivarPlan(plan.id);
      }
      setBajaPlanAbierto(false);
      setPlan(null);
      setTareas([]);
      onCambio?.();
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo dar de baja el plan.",
      );
    } finally {
      setCargandoAccion(false);
    }
  };

  const confirmarAltaPlan = async () => {
    if (!plan) return;
    setCargandoAccion(true);
    setErrorAccion("");
    try {
      await planesApi.activarPlan(plan.id);
      setAltaPlanAbierto(false);
      onPromovido?.();
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo dar de alta el plan.",
      );
    } finally {
      setCargandoAccion(false);
    }
  };

  const guardarTarea = (tarea: TareaPOES) => {
    setTareas((prev) => {
      const existe = prev.some((t) => t.id === tarea.id);
      return existe
        ? prev.map((t) => (t.id === tarea.id ? tarea : t))
        : [...prev, tarea];
    });
    setVista("listado");
    setTareaSeleccionada(null);
  };

  const guardarPlan = (planActualizado: PlanPOES) => {
    setPlan(planActualizado);
    setVista("listado");
  };

  return (
    <>
      <ListadoTareas
        plan={plan}
        tareas={tareas}
        catalogs={catalogs}
        loading={cargandoTareas}
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
        onHistorial={irAlHistorial}
        onModificarPlan={() => setVista("modificarPlan")}
        onDarBajaPlan={() => setBajaPlanAbierto(true)}
        onDarAltaPlan={esBorrador ? () => setAltaPlanAbierto(true) : undefined}
      />

      {(errorTareas || errorCatalogos) && (
        <VStack maxW='7xl' mx='auto' mt={4} gap={2}>
          {errorTareas && <AlertMessage type='error' message={errorTareas} />}
          {errorCatalogos && (
            <AlertMessage type='error' message={errorCatalogos} />
          )}
        </VStack>
      )}

      {(cargandoCatalogs || cargandoTareas) && (
        <VStack maxW='7xl' mx='auto' mt={4} gap={2} />
      )}

      {vista === "verTarea" && tareaSeleccionada && (
        <TareaDetalle
          tarea={tareaSeleccionada}
          catalogs={catalogs}
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
              planId={plan.id}
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
        loading={cargandoAccion}
        error={errorAccion}
        onConfirm={confirmarBajaTarea}
        onCancel={() => {
          setBajaTareaAbierto(false);
          setTareaBaja(null);
          setErrorAccion("");
        }}
      />

      <AlertConfirm
        open={altaTareaAbierto}
        title='Dar de Alta'
        message={`¿Estás seguro que querés dar de alta la tarea "${tareaAlta?.nombre}"?`}
        loading={cargandoAccion}
        error={errorAccion}
        onConfirm={confirmarAltaTarea}
        onCancel={() => {
          setAltaTareaAbierto(false);
          setTareaAlta(null);
          setErrorAccion("");
        }}
      />

      <AlertConfirm
        open={bajaPlanAbierto}
        title={esBorrador ? "Descartar borrador" : "Dar de baja el plan"}
        message={
          esBorrador
            ? `¿Estás seguro que querés descartar el borrador "${plan.nombre}"? Se eliminará definitivamente.`
            : `¿Estás seguro que querés dar de baja el plan "${plan.nombre}"? Pasará a ser histórico.`
        }
        loading={cargandoAccion}
        error={errorAccion}
        onConfirm={confirmarBajaPlan}
        onCancel={() => {
          setBajaPlanAbierto(false);
          setErrorAccion("");
        }}
      />

      {esBorrador && (
        <AlertConfirm
          open={altaPlanAbierto}
          title='Dar de alta el plan'
          message={`¿Estás seguro que querés dar de alta el plan "${plan.nombre}" como plan vigente? Debe tener al menos una tarea.`}
          loading={cargandoAccion}
          error={errorAccion}
          onConfirm={confirmarAltaPlan}
          onCancel={() => {
            setAltaPlanAbierto(false);
            setErrorAccion("");
          }}
        />
      )}
    </>
  );
};
