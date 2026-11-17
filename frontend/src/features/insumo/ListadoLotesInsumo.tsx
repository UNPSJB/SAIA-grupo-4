import { useState } from "react";
import { Badge, Button, HStack, Box } from "@chakra-ui/react";
import { FiArrowLeft, FiEye, FiPackage, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  FiltrosBar,
  FiltroSelect,
  FiltroTexto,
  LoadingState,
  RowActionButton,
  RowActions,
  SemaforoFecha,
  SemaforoLegend,
  TablePagination,
  textoSemaforo,
} from "../../components/ui";
import type { ColumnDef, EstadoSemaforo } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { BASE_URL } from "../../config";
import { useListadoData } from "../../hooks/useListadoData";
import { formatearFecha } from "../../utils/fecha";
import { armarFiltros, etiquetaOpcion } from "../../utils/exportacion";
import type { EstadoLote, Insumo, LoteInsumo } from "./types";
import { COLOR_ESTADO_LOTE, ETIQUETA_ESTADO_LOTE } from "./estadoLote";

interface ListadoLotesInsumoProps {
  /** Insumo cuyos lotes se listan. */
  insumo: Insumo;
  /** Vuelve al listado de insumos. */
  onVolver: () => void;
  /** Abre el alta de un lote para este insumo. */
  onNuevoLote: () => void;
  /** Abre el detalle de un lote. */
  onVerLote: (lote: LoteInsumo) => void;
  /** Abre el modal para inhabilitar un lote que no está inhabilitado. */
  onInhabilitarLote: (lote: LoteInsumo) => void;
  /** Se incrementa al registrar o inhabilitar un lote, para forzar la recarga. */
  refreshKey?: number;
}

// Filtros: el borrador es lo que se escribe; los aplicados son lo único que
// llega al endpoint (se aplican con Enter o "Filtrar").
type FiltrosLotes = {
  /** Texto libre contra el código del lote. Vacío es "sin búsqueda". */
  codigo: string;
  estado: EstadoLote | "";
  /** Orden por fecha de vencimiento. Vacío deja el orden por defecto (asc). */
  orden: "asc" | "desc" | "";
};

const FILTROS_INICIALES: FiltrosLotes = { codigo: "", estado: "", orden: "" };

const tieneFiltros = (filtros: FiltrosLotes) =>
  filtros.codigo.trim() !== "" || filtros.estado !== "" || filtros.orden !== "";

const OPCIONES_ESTADO = [
  { label: "Activos", value: "activo" },
  { label: "Vencidos", value: "vencido" },
  { label: "Inhabilitados", value: "inhabilitado" },
];

const OPCIONES_ORDEN = [
  { label: "Vencimiento: más próximo primero", value: "asc" },
  { label: "Vencimiento: más lejano primero", value: "desc" },
];

// Días de anticipación desde los que el semáforo marca "próximo a vencer".
const DIAS_PROXIMO_A_VENCER = 30;

/**
 * Semáforo de la columna "Vencimiento": evalúa únicamente la fecha contra hoy,
 * sin mirar si el lote está inhabilitado (eso lo dice la columna "Estado").
 * La regla de "vencido" es la misma del backend: fecha anterior a hoy.
 */
const semaforoDe = (
  fechaIso: string,
): { estado: EstadoSemaforo; diasRestantes: number } => {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-").map(Number);
  const hoy = new Date();
  const msPorDia = 24 * 60 * 60 * 1000;
  // Ambas fechas en UTC a medianoche: evita desfases por zona horaria u horario de verano.
  const vencimiento = Date.UTC(anio, mes - 1, dia);
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diasRestantes = Math.round((vencimiento - hoyUtc) / msPorDia);

  if (diasRestantes < 0) return { estado: "vencido", diasRestantes };
  if (diasRestantes <= DIAS_PROXIMO_A_VENCER) return { estado: "proximo", diasRestantes };
  return { estado: "vigente", diasRestantes };
};

// Arma el endpoint: el insumo siempre va; el resto solo si tiene valor.
const construirEndpoint = (insumoId: number, filtros: FiltrosLotes) => {
  const params = new URLSearchParams({ insumo_id: String(insumoId) });
  if (filtros.codigo) params.set("codigo_lote", filtros.codigo);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.orden) params.set("orden", filtros.orden);
  return `${BASE_URL}/lotes-insumo/?${params.toString()}`;
};

export const ListadoLotesInsumo = ({
  insumo,
  onVolver,
  onNuevoLote,
  onVerLote,
  onInhabilitarLote,
  refreshKey = 0,
}: ListadoLotesInsumoProps) => {
  const [borrador, setBorrador] = useState<FiltrosLotes>(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState<FiltrosLotes>(FILTROS_INICIALES);

  // El endpoint se rearma con los filtros aplicados: useListadoData vuelve a
  // pedir los datos cada vez que la URL cambia.
  const { data, loading, error, page, setPage, pageSize, itemsPaginados } =
    useListadoData<LoteInsumo>({
      endpoint: construirEndpoint(insumo.id, aplicados),
      refreshKey,
      errorMessage: "No se pudo cargar la lista de lotes.",
    });

  const aplicar = () => {
    setAplicados({ ...borrador, codigo: borrador.codigo.trim() });
    setPage(1);
  };

  const limpiar = () => {
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    setPage(1);
  };

  const filtrosExportacion = armarFiltros([
    ["Insumo", insumo.nombre],
    ["Búsqueda", aplicados.codigo],
    ["Estado", etiquetaOpcion(OPCIONES_ESTADO, aplicados.estado)],
    ["Orden", etiquetaOpcion(OPCIONES_ORDEN, aplicados.orden)],
  ]);

  const columnas: ColumnDef<LoteInsumo>[] = [
    {
      key: "codigo_lote",
      label: "Código de lote",
      render: (l) => l.codigo_lote,
    },
    {
      key: "fecha_vencimiento",
      label: "Vencimiento",
      w: "180px",
      valorExportacion: (l) => {
        const { estado, diasRestantes } = semaforoDe(l.fecha_vencimiento);
        return textoSemaforo(formatearFecha(l.fecha_vencimiento), estado, diasRestantes);
      },
      render: (l) => {
        const { estado, diasRestantes } = semaforoDe(l.fecha_vencimiento);
        return (
          <SemaforoFecha
            estado={estado}
            fecha={l.fecha_vencimiento}
            diasRestantes={diasRestantes}
          />
        );
      },
    },
    {
      key: "estado",
      label: "Estado",
      w: "140px",
      valorExportacion: (l) => ETIQUETA_ESTADO_LOTE[l.estado],
      render: (l) => (
        <Badge colorPalette={COLOR_ESTADO_LOTE[l.estado]}>
          {ETIQUETA_ESTADO_LOTE[l.estado]}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      exportable: false,
      align: "end",
      w: "120px",
      render: (l) => (
        <RowActions>
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVerLote(l)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Inhabilitar'
            colorPalette='red'
            onClick={() => onInhabilitarLote(l)}
            visible={l.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader title={`Lotes de ${insumo.nombre}`} icon={FiPackage} />
        <HStack gap={2}>
          <Button variant='outline' colorPalette='green' onClick={onVolver}>
            <FiArrowLeft /> Volver a insumos
          </Button>
          {/* El backend no permite registrar lotes de un insumo dado de baja. */}
          {insumo.disponible && (
            <Button colorPalette='green' onClick={onNuevoLote}>
              <FiPlus /> Nuevo lote
            </Button>
          )}
        </HStack>
      </HStack>

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={tieneFiltros(borrador)}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel='Buscar lote por código'
            placeholder='Código de lote'
            value={borrador.codigo}
            onChange={(valor) => setBorrador({ ...borrador, codigo: valor })}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Estado del lote'
            placeholder='Todos los estados'
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) =>
              setBorrador({ ...borrador, estado: valor as EstadoLote | "" })
            }
          />
          <FiltroSelect
            ariaLabel='Orden por fecha de vencimiento'
            placeholder='Ordenar por vencimiento'
            options={OPCIONES_ORDEN}
            value={borrador.orden}
            onChange={(valor) =>
              setBorrador({ ...borrador, orden: valor as FiltrosLotes["orden"] })
            }
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando lotes...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            tieneFiltros(aplicados)
              ? "No hay lotes que coincidan con los filtros."
              : "Este insumo todavía no tiene lotes registrados."
          }
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            exportarItems={data}
            exportarTitulo={`Lotes de ${insumo.nombre}`}
            exportarFiltros={filtrosExportacion}
            columns={columnas}
            getRowKey={(l) => l.id}
            minW='600px'
          />

          <SemaforoLegend />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            labelSingular='lote'
            labelPlural='lotes'
          />
        </>
      )}
    </ListadoContainer>
  );
};