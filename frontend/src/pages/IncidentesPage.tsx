import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { IncidenteDetalle } from "../features/incidentes/IncidenteDetalle";
import { AlertConfirm, FormModal } from "../components/ui";
import { useIncidentesSubmit } from "../features/incidentes/hooks/useIncidentesSubmit";
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

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      <ListadoIncidentes
        key={refrescar}
        onVer={(incidente) => {
          setError("");
          setIncidenteSeleccionado(incidente);
          setVista("ver");
        }}
        onGestionarTipos={() => setTipoModalAbierto(true)}
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
    </Box>
  );
}