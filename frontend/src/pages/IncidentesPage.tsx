import { useEffect, useState } from "react";
import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { useAuth } from "../features/auth/useAuth";
import { esAdministrador, esOperador } from "../features/auth/roles";
import { ListadoIncidentes } from "../features/incidentes/ListadoIncidentes";
import { IncidenteDetalle } from "../features/incidentes/IncidenteDetalle";
import { AccionIncidenteDialog } from "../features/incidentes/AccionIncidenteDialog";
import { GestionTiposIncidente } from "../features/incidentes/GestionTiposIncidente";
import { GraficoIncidentesPorTipo } from "../features/incidentes/GraficoIncidentesPorTipo";
import { useEstadisticasIncidentes } from "../features/incidentes/hooks/useEstadisticasIncidentes";
import { IncidenteForm } from "../features/incidentes/IncidentesForm";
import { useListadoData } from "../hooks/useListadoData";
import { HistorialFiltros } from "../features/historial/components/HistorialFiltros";
import { AlertMessage, FormModal, LoadingState } from "../components/ui";
import type {
  EstadisticaTipoIncidente,
  Incidente,
} from "../features/incidentes/types";
import type { Persona } from "../features/personal/types";

type Vista = "listado" | "ver";

const REFRESCO_MS = 30_000;

const aISO = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

const rango = (dias: number) => {
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  return { desde: aISO(desde), hasta: aISO(new Date()) };
};

export default function IncidentesPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [incidenteSeleccionado, setIncidenteSeleccionado] =
    useState<Incidente | null>(null);
  const [refrescar, setRefrescar] = useState(0);
  const [tipoModalAbierto, setTipoModalAbierto] = useState(false);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [accion, setAccion] = useState<{
    incidente: Incidente;
    modo: "cierre" | "reapertura";
  } | null>(null);
  const [periodo, setPeriodo] = useState(() => rango(30));
  const [fechaDesde, setFechaDesde] = useState(periodo.desde);
  const [fechaHasta, setFechaHasta] = useState(periodo.hasta);
  const [tipoSeleccionado, setTipoSeleccionado] =
    useState<EstadisticaTipoIncidente | null>(null);

  const { usuario } = useAuth();
  const puedeCrearIncidentes = esOperador(usuario);
  const puedeGestionarTipos = esAdministrador(usuario);
  const { data: personas } = useListadoData<Persona>({
    endpoint: "http://127.0.0.1:8000/personal/",
    errorMessage: "No se pudo cargar el personal.",
  });
  const responsables = personas.filter((persona) => persona.activo);
  const { estadisticas, loading, error } = useEstadisticasIncidentes(periodo);

  useEffect(() => {
    const id = setInterval(() => setRefrescar((actual) => actual + 1), REFRESCO_MS);
    return () => clearInterval(id);
  }, []);

  const aplicarFiltro = () => {
    if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta) return;
    setPeriodo({ desde: fechaDesde, hasta: fechaHasta });
    setTipoSeleccionado(null);
  };

  const aplicarRango = (dias: number) => {
    const nuevoPeriodo = rango(dias);
    setFechaDesde(nuevoPeriodo.desde);
    setFechaHasta(nuevoPeriodo.hasta);
    setPeriodo(nuevoPeriodo);
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
          <AlertMessage
            type="info"
            message="No hay incidentes en el período seleccionado."
          />
        )}
        {!loading && !error && estadisticas.length > 0 && (
          <GraficoIncidentesPorTipo
            datos={estadisticas}
            tipoSeleccionadoId={tipoSeleccionado?.tipo_id}
            onSeleccionarTipo={(tipo) =>
              setTipoSeleccionado((actual) =>
                actual?.tipo_id === tipo.tipo_id ? null : tipo,
              )
            }
          />
        )}

        {tipoSeleccionado && (
          <HStack
            justify="space-between"
            bg="white"
            p={3}
            borderRadius="md"
            mb={4}
          >
            <Text fontSize="sm">
              Mostrando incidentes del tipo <b>{tipoSeleccionado.tipo}</b>{" "}
              entre {periodo.desde} y {periodo.hasta}.
            </Text>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setTipoSeleccionado(null)}
            >
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
