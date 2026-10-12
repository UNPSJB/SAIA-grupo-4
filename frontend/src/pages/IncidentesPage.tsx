import { useAuth } from "../features/auth/useAuth";
import { esOperador, esAdministrador } from "../features/auth/roles";
import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { IncidenteDetalle } from "../features/incidentes/IncidenteDetalle";
import { FormModal } from "../components/ui";
import { IncidenteForm } from "../features/incidentes/IncidentesForm";
import type { Incidente } from "../features/incidentes/types";
import { GestionTiposIncidente } from "../features/incidentes/GestionTiposIncidente";
import { AccionIncidenteDialog } from "../features/incidentes/AccionIncidenteDialog";
import { useListadoData } from "../hooks/useListadoData";
import type { Persona } from "../features/personal/types";

type Vista = "listado" | "ver";

export default function IncidentesPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [refrescar, setRefrescar] = useState(0);
  const [tipoModalAbierto, setTipoModalAbierto] = useState(false);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [accion, setAccion] = useState<{
    incidente: Incidente;
    modo: "cierre" | "reapertura";
  } | null>(null);

  // obtengo el usuario para validar sus capacidades
  const { usuario } = useAuth();

  // valido que sea operador
  const puedeCrearIncidentes = esOperador(usuario);

  // valido que sea admin
  const puedeGestionarTipos = esAdministrador(usuario);

  const { data: personas } = useListadoData<Persona>({
    endpoint: "http://127.0.0.1:8000/personal/",
    errorMessage: "No se pudo cargar el personal.",
  });
  const responsables = personas.filter((persona) => persona.activo);

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      <ListadoIncidentes
        refreshKey={refrescar}
        onVer={(incidente) => {
          setIncidenteSeleccionado(incidente);
          setVista("ver");
        }}
        onCerrar={(incidente) => setAccion({ incidente, modo: "cierre" })}
        onReabrir={(incidente) => setAccion({ incidente, modo: "reapertura" })}
        onGestionarTipos={
          puedeGestionarTipos
            ? () => setTipoModalAbierto(true)
            : undefined
        }
        onCrear={
          puedeCrearIncidentes
            ? () => setCrearAbierto(true)
            : undefined
        }
      />

      {vista === "ver" && incidenteSeleccionado && (
        <IncidenteDetalle
          incidente={incidenteSeleccionado}
          onCancelar={() => setVista("listado")}
        />
      )}

      {accion && (
        <AccionIncidenteDialog
          incidente={accion.incidente}
          modo={accion.modo}
          personas={responsables}
          onClose={() => setAccion(null)}
          onSuccess={() => setRefrescar((actual) => actual + 1)}
        />
      )}

      {tipoModalAbierto && (
        <FormModal open onClose={() => setTipoModalAbierto(false)}>
          <GestionTiposIncidente />
        </FormModal>
      )}

      {crearAbierto && (
        <FormModal open onClose={() => setCrearAbierto(false)}>
          <IncidenteForm
            modo="crear"
            onCancelar={() => setCrearAbierto(false)}
            onGuardado={() => {
              setCrearAbierto(false);
              setRefrescar((actual) => actual + 1);
            }}
            enModal
          />
        </FormModal>
      )}
    </Box>
  );
}