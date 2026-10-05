import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { AlertConfirm, FormModal } from "../components/ui";
import { useIncidentesSubmit } from "../features/incidentes/hooks/useIncidentesSubmit";
import type { Incidente } from "../features/incidentes/types";

type Vista = "listado" | "ver";

export default function ListadoIncidentesPage() {
  const navigate = useNavigate();
  const [vista, setVista] = useState<Vista>("listado");
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refrescar, setRefrescar] = useState(0);

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      <ListadoIncidentes
        key={refrescar}
        onVer={(incidente) => {
          setError("");
          setIncidenteSeleccionado(incidente);
          setVista("ver");
        }}
      />
      {vista === "ver" && incidenteSeleccionado && (
        <IncidenteDetalle
          incidente={incidenteSeleccionado}
          onCancelar={() => setVista("listado")}
        />
      )}
      />
    </Box>
  );
}