import { useAuth } from "../features/auth/useAuth";
import { esOperador, esAdministrador } from "../features/auth/roles";
import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { IncidenteDetalle } from "../features/incidentes/IncidenteDetalle";
import { AlertConfirm, FormModal } from "../components/ui";
import { useIncidentesSubmit } from "../features/incidentes/hooks/useIncidentesSubmit";
import { IncidenteForm } from "../features/incidentes/IncidentesForm"
import type { Incidente } from "../features/incidentes/types";
import { GestionTiposIncidente } from "../features/incidentes/GestionTiposIncidente";

type Vista = "listado" | "ver";

export default function ListadoIncidentesPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refrescar, setRefrescar] = useState(0);
  
  const [tipoModalAbierto, setTipoModalAbierto] = useState(false);

  const [crearAbierto, setCrearAbierto] = useState(false);

  // obtengo el usuario para validar sus capacidades
  const { usuario } = useAuth();

  // valido que sea operador
  const puedeCrearIncidentes = esOperador(usuario);

  // valido que sea admin
  const puedeGestionarTipos = esAdministrador(usuario);

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      <ListadoIncidentes
        key={refrescar}
        onVer={(incidente) => {
          setError("");
          setIncidenteSeleccionado(incidente);
          setVista("ver");
        }}
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
              setRefrescar((r) => r + 1);
            }}
            enModal
          />
        </FormModal>
      )}
    </Box>
  );
}