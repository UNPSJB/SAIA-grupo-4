import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { IncidenteDetalle } from "../features/incidentes/IncidenteDetalle";
import { AccionIncidenteDialog } from "../features/incidentes/AccionIncidenteDialog";
import { useListadoData } from "../hooks/useListadoData";
import type { Incidente } from "../features/incidentes/types";
import type { Persona } from "../features/personal/types";

type Vista = "listado" | "ver";

export default function ListadoIncidentesPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [refrescar, setRefrescar] = useState(0);
  const [accion, setAccion] = useState<{
    incidente: Incidente;
    modo: "cierre" | "reapertura";
  } | null>(null);

  const { data: personas } = useListadoData<Persona>({
    endpoint: "http://127.0.0.1:8000/personal/",
    errorMessage: "No se pudo cargar el personal.",
  });
  const responsables = personas.filter((p) => p.activo);

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      <ListadoIncidentes
        refreshKey={refrescar}
        onVer={(incidente) => {
          setIncidenteSeleccionado(incidente);
          setVista("ver");
        }}
        onCerrar={(incidente) => setAccion({ incidente, modo: "cierre" })}
        onReabrir={(incidente) => setAccion({ incidente, modo: "reapertura" })}
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
          onSuccess={() => setRefrescar((k) => k + 1)}
        />
      )}
    </Box>
  );
}