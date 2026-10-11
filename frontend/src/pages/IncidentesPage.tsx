import { useEffect, useState } from "react";
import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { IncidenteDetalle } from "../features/incidentes/IncidenteDetalle";
import { GestionTiposIncidente } from "../features/incidentes/GestionTiposIncidente";
import { GraficoIncidentesPorTipo } from "../features/incidentes/GraficoIncidentesPorTipo";
import { useEstadisticasIncidentes } from "../features/incidentes/hooks/useEstadisticasIncidentes";
import { HistorialFiltros } from "../features/historial/components/HistorialFiltros";
import { AlertMessage, FormModal, LoadingState } from "../components/ui";
import type { Incidente, EstadisticaTipoIncidente } from "../features/incidentes/types";

type Vista = "listado" | "ver";

const REFRESCO_MS = 30_000;

// Fecha local en formato AAAA-MM-DD (toISOString usaría UTC y en Argentina,
// pasadas las 21 h, devolvería el día siguiente).
const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const rango = (dias: number) => {
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  return { desde: aISO(desde), hasta: aISO(new Date()) };
};

export default function ListadoIncidentesPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [tipoModalAbierto, setTipoModalAbierto] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Período: lo que el usuario escribe vs. lo que ya se aplicó
  const [periodo, setPeriodo] = useState(() => rango(30));
  const [fechaDesde, setFechaDesde] = useState(periodo.desde);
  const [fechaHasta, setFechaHasta] = useState(periodo.hasta);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<EstadisticaTipoIncidente | null>(null);

  const { estadisticas, loading, error } = useEstadisticasIncidentes(periodo);

  // El listado también se actualiza solo (criterio 4)
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), REFRESCO_MS);
    return () => clearInterval(id);
  }, []);

  const aplicarFiltro = () => {
    if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta) return;
    setPeriodo({ desde: fechaDesde, hasta: fechaHasta });
    setTipoSeleccionado(null);
  };

  const aplicarRango = (dias: number) => {
    const r = rango(dias);
    setFechaDesde(r.desde);
    setFechaHasta(r.hasta);
    setPeriodo(r);
    setTipoSeleccionado(null);
  };

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      <Box textAlign="left">
        <HistorialFiltros
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          fechaMax={aISO(new Date())}
          onCambiarFechaDesde={setFechaDesde}
          onCambiarFechaHasta={setFechaHasta}
          onAplicarFiltro={aplicarFiltro}
          onResetFiltro={() => aplicarRango(30)}
          onSeleccionarRapido={aplicarRango}
        />

        {loading && <LoadingState message="Cargando estadística..." />}
        {!loading && error && <AlertMessage type="error" message={error} />}
        {!loading && !error && estadisticas.length === 0 && (
          <AlertMessage type="info" message="No hay incidentes en el período seleccionado." />
        )}
        {!loading && !error && estadisticas.length > 0 && (
          <GraficoIncidentesPorTipo
            datos={estadisticas}
            tipoSeleccionadoId={tipoSeleccionado?.tipo_id}
            onSeleccionarTipo={(tipo) =>
              setTipoSeleccionado((actual) => (actual?.tipo_id === tipo.tipo_id ? null : tipo))
            }
          />
        )}

        {tipoSeleccionado && (
          <HStack justify="space-between" bg="white" p={3} borderRadius="md" mb={4}>
            <Text fontSize="sm">
              Mostrando solo incidentes de tipo <b>{tipoSeleccionado.tipo}</b> entre {periodo.desde} y {periodo.hasta}
            </Text>
            <Button size="xs" variant="outline" onClick={() => setTipoSeleccionado(null)}>
              Quitar filtro
            </Button>
          </HStack>
        )}
      </Box>

      <ListadoIncidentes
        key={`${tipoSeleccionado?.tipo_id ?? "todos"}-${periodo.desde}-${periodo.hasta}`}
        tipoId={tipoSeleccionado?.tipo_id}
        desde={periodo.desde}
        hasta={periodo.hasta}
        refreshKey={refreshKey}
        onVer={(incidente) => {
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