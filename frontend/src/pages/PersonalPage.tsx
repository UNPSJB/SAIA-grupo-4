import { BASE_URL } from "../config";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, CloseButton } from "@chakra-ui/react";
import { apiFetch } from "../features/auth/apiFetch";
import { useRenovacion } from "../features/vencimientos/hooks/useRenovacion";
import { PersonalForm } from "../features/personal/PersonalForm";
import { PersonalDetalle } from "../features/personal/PersonaDetalle";
import { ListadoPersonal } from "../features/personal/ListadoPersonal";
import { RegistrarVencimientoForm } from "../features/personal/RegistrarVencimientoForm";
import { AlertDelete, AlertConfirm, FormModal, type AsociacionOperativa, } from "../components/ui";
import { handleDelete } from "../features/personal/hooks/usePersonalDelete";
import { usePersonalSubmit } from "../features/personal/hooks/usePersonalSubmit";
import type { Persona } from "../features/personal/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function PersonalPage() {
  const navigate = useNavigate();
  const [vista, setVista] = useState<Vista>("listado");
  const [personaSeleccionada, setPersonaSeleccionada] =
    useState<Persona | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asociacionesBaja, setAsociacionesBaja] = useState<AsociacionOperativa[]>([]);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [advertenciasBaja, setAdvertenciasBaja] = useState<AsociacionOperativa[]>([]);

  // La campana de notificaciones llega aca con `?detalle=<id>` (ruta_detalle de
  // la fila consolidada): el parametro abre el detalle de la persona, igual que
  // hace EquiposPage con los equipos.
  const [searchParams, setSearchParams] = useSearchParams();
  const detalleParam = searchParams.get("detalle");

  // Registrar o renovar un vencimiento aca tambien baja el badge de la campana,
  // porque no hay navegacion que dispare su refresco.
  const { notificarGuardado } = useRenovacion();

  useEffect(() => {
    if (!detalleParam) return;
    let activo = true;

    apiFetch(`${BASE_URL}/personal/${detalleParam}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((persona: Persona) => {
        if (!activo) return;
        setError("");
        setPersonaSeleccionada(persona);
        setVista("ver");
      })
      .catch(() => {
        if (activo) setError("No se pudo cargar la persona.");
      });

    return () => {
      activo = false;
    };
  }, [detalleParam]);

  // Limpia el parametro al cerrar el detalle. Sin esto, volver a la pagina
  // reabriria el modal otra vez.
  const limpiarDetalleParam = () => {
    if (!searchParams.get("detalle")) return;
    searchParams.delete("detalle");
    setSearchParams(searchParams, { replace: true });
  };

  const [personaEliminar, setPersonaEliminar] = useState<Persona | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);

  const [personaAlta, setPersonaAlta] = useState<Persona | null>(null);
  const [altaAbierto, setAltaAbierto] = useState(false);

  const [personaVencimiento, setPersonaVencimiento] = useState<Persona | null>(null);

  const [refrescar, setRefrescar] = useState(0);

  const confirmarEliminar = () => {
    handleDelete({
      persona: personaEliminar, 
      motivo: motivoBaja,
      setLoading,
      setError,
      setAsociaciones: setAsociacionesBaja,
      onSuccess: (advertencias) => {
        setEliminarAbierto(false);
        setPersonaEliminar(null);
        setMotivoBaja("");
        setAsociacionesBaja([]);
        setAdvertenciasBaja(advertencias ?? []);
        setRefrescar((r) => r + 1);
      },
    });
  };

  const reactivar = usePersonalSubmit({
    endpoint: `${BASE_URL}/personal/`,
    method: "PUT",
    id: personaAlta?.id,
    body: { activo: true },
    onSuccess: () => {
      setAltaAbierto(false);
      setPersonaAlta(null);
      setRefrescar((r) => r + 1);
    },
  });

  const confirmarAlta = async () => {
    if (!personaAlta) return;
    setError("");
    const res = await reactivar.submit();
    if (res.status === "error") setError(res.message);
  };

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      {advertenciasBaja.length > 0 && (
        <Box maxW='6xl' mx='auto' mb={4} textAlign='left'>
          <Alert.Root status='warning'>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                Personal dado de baja con asociaciones operativas activas
              </Alert.Title>
              <Alert.Description>
                Quedarán con alerta hasta ser actualizadas:{" "}
                {advertenciasBaja.map((a) => a.nombre).join(", ")}.
              </Alert.Description>
            </Alert.Content>
            <CloseButton
              pos='relative'
              top='-1'
              insetEnd='-1'
              onClick={() => setAdvertenciasBaja([])}
            />
          </Alert.Root>
        </Box>
      )}
      <ListadoPersonal
        key={refrescar}
        onVerCapacidades={() =>
          navigate("/capacidades", {
            state: { from: "/personal", label: "Personal" },
          })
        }
        onVerDocumentos={() =>
          navigate("/documentos-personal", {
            state: { from: "/personal", label: "Personal" },
          })
        }
        onCrear={() => setVista("crear")}
        onModificar={(persona) => {
          setError("");
          setPersonaSeleccionada(persona);
          setVista("modificar");
        }}
        onEliminar={(persona) => {
          setError("");
          setAsociacionesBaja([]);
          setMotivoBaja("");
          setPersonaEliminar(persona);
          setEliminarAbierto(true);
        }}
        onVer={(persona) => {
          setError("");
          setPersonaSeleccionada(persona);
          setVista("ver");
        }}
        onDarAlta={(persona) => {
          setError("");
          setPersonaAlta(persona);
          setAltaAbierto(true);
        }}
        onRegistrarVencimiento={(persona) => setPersonaVencimiento(persona)}
      />

      {/* Modal de Registrar Vencimiento */}
      {personaVencimiento && (
        <FormModal open onClose={() => setPersonaVencimiento(null)}>
          <RegistrarVencimientoForm
            persona={personaVencimiento}
            onCancelar={() => setPersonaVencimiento(null)}
            onGuardado={() => {
              setPersonaVencimiento(null);
              setRefrescar((r) => r + 1);
              notificarGuardado();
            }}
            enModal
          />
        </FormModal>
      )}

      {/* Modal de Detalle (Vista) */}
      {vista === "ver" && personaSeleccionada && (
        <PersonalDetalle
          persona={personaSeleccionada}
          onCerrar={() => {
            setVista("listado");
            limpiarDetalleParam();
          }}
        />
      )}

      {/* Modal de Formularios (Crear / Modificar) */}
      {(vista === "crear" || vista === "modificar") && (
        <FormModal
          open
          onClose={() => {
            setError("");
            setVista("listado");
          }}
        >
          {vista === "crear" && (
            <PersonalForm
              modo='crear'
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
              enModal
            />
          )}

          {vista === "modificar" && personaSeleccionada && (
            <PersonalForm
              modo='modificar'
              persona={personaSeleccionada}
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
        title='Dar de baja Personal'
        confirmLabel='Dar de baja'
        name={
          personaEliminar
            ? `${personaEliminar.nombre} ${personaEliminar.apellido}`
            : null
        }
        loading={loading}
        error={error}
        asociaciones={asociacionesBaja}
        mostrarMotivo
        motivo={motivoBaja}
        onMotivoChange={setMotivoBaja}
        advertenciaVencido={
          personaEliminar?.operable === false
            ? "Esta persona está no operable por documentación vencida. Se permitirá la baja, pero las operaciones activas asociadas mostrarán una alerta."
            : undefined
        }
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setEliminarAbierto(false);
          setError("");
          setAsociacionesBaja([]);
          setMotivoBaja("");
        }}
      />

      <AlertConfirm
        open={altaAbierto}
        title='Dar de Alta'
        message={`¿Estás seguro que querés dar de alta a ${personaAlta?.nombre} ${personaAlta?.apellido}?`}
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
