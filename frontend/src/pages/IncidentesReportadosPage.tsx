import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { BASE_URL } from "../config";
import { IncidenteDetalle } from "../features/incidentes/IncidenteDetalle";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { FormModal } from "../components/ui";
import { IncidenteForm } from "../features/incidentes/IncidentesForm";
import type { Incidente } from "../features/incidentes/types";

export default function IncidentesReportadosPage() {
    const [crearAbierto, setCrearAbierto] = useState(false);
    const [refrescar, setRefrescar] = useState(0);
    const [incidenteSeleccionado, setIncidenteSeleccionado] =
        useState<Incidente | null>(null);

    return (
        <Box p={{ base: 4, md: 10 }} bg='gray.100' minH='100vh'>
            <ListadoIncidentes
                key={refrescar}
                endpoint={`${BASE_URL}/incidentes/mis-reportes`}
                titulo="Mis incidentes reportados"
                onVer={setIncidenteSeleccionado}
                onCrear={() => setCrearAbierto(true)}
            />
            {incidenteSeleccionado && (
                <IncidenteDetalle
                    incidente={incidenteSeleccionado}
                    onCancelar={() => setIncidenteSeleccionado(null)}
                />
            )}
            {crearAbierto && (
                <FormModal open onClose={() => setCrearAbierto(false)}>
                    <IncidenteForm 
                        modo="crear"
                        onCancelar={() => setCrearAbierto(false)}
                        onGuardado={() => {
                            setCrearAbierto(false);
                            setRefrescar((r) => r + 1)
                        }}
                    />
                </FormModal>
            )}
        </Box>
    );
}