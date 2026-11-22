import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { useState } from "react";
import { Badge, Box, HStack, Button } from "@chakra-ui/react";
import {
  FiBox,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiEye,
  FiPlus,
  FiPackage,
  FiDatabase,
} from "react-icons/fi";
import { FaRuler} from "react-icons/fa";
import {
  AlertMessage,
  DataTable,
  FiltrosBar,
  FiltroSelect,
  FiltroTexto,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Insumo } from "./types";
import type { ColumnDef } from "../../components/ui";
import { armarFiltros, etiquetaOpcion } from "../../utils/exportacion";

interface ListadoInsumosProps {
  onCrear?: () => void;
  onModificar?: (insumo: Insumo) => void;
  onEliminar?: (insumo: Insumo) => void;
  onVer?: (insumo: Insumo) => void;
  onDarAlta?: (insumo: Insumo) => void;
  onVerUnidades?: () => void;
  onVerLotes?: (insumo: Insumo) => void,
  onVerAlimentosReferencia?: () => void;
}

const ETIQUETAS_TIPO: Record<string, string> = {
  "materia prima": "Materia Prima",
  aditivo: "Aditivo",
  envase: "Envase",
  otro: "Otro",
};

const formatearTipo = (categoria?: string | null) => {
  const clave = (categoria || "").trim().toLowerCase();
  return ETIQUETAS_TIPO[clave] || categoria || "—";
};

// Arma el endpoint del listado: solo se manda cada filtro si tiene valor.
const construirEndpoint = (
  busqueda: string,
  estado: string,
  tipo: string,
  nutricion: string,
) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);
  if (estado === "disponible") params.set("disponible", "true");
  if (estado === "no_disponible") params.set("disponible", "false");
  if (tipo) params.set("categoria", tipo);
  if (nutricion) params.set("nutricion", nutricion);

  const query = params.toString();
  return `${BASE_URL}/insumos/${query ? `?${query}` : ""}`;
};

const OPCIONES_TIPO = [
  { label: "Materia Prima", value: "materia prima" },
  { label: "Aditivo", value: "aditivo" },
  { label: "Envase", value: "envase" },
  { label: "Otro", value: "otro" },
];

const OPCIONES_NUTRICION = [
  { label: "Completa", value: "completa" },
  { label: "Completa (modificada)", value: "modificada" },
  { label: "Pendiente", value: "pendiente" },
  { label: "No aplica (Envase)", value: "no_aplica" },
];

const OPCIONES_ESTADO = [
  { label: "Activos", value: "disponible" },
  { label: "Inactivos", value: "no_disponible" },
];

export const ListadoInsumos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerUnidades,
  onVerLotes,
  onVerAlimentosReferencia,
}: ListadoInsumosProps) => {
  // Búsqueda: se escribe en borrador y se aplica con Enter o "Filtrar".
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const [tipo, setTipo] = useState("");
  const [tipoAplicado, setTipoAplicado] = useState("");

  const [nutricion, setNutricion] = useState("");
  const [nutricionAplicada, setNutricionAplicada] = useState("");

  const [estado, setEstado] = useState("");
  const [estadoAplicado, setEstadoAplicado] = useState("");

  const hayFiltros =
    busqueda.trim() !== "" || tipo !== "" || nutricion !== "" || estado !== "";
  const hayAplicados =
    busquedaAplicada !== "" ||
    tipoAplicado !== "" ||
    nutricionAplicada !== "" ||
    estadoAplicado !== "";

  // La página vuelve a 1 sola cuando cambia el endpoint (lo resuelve el hook)
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Insumo>({
      endpoint: construirEndpoint(
        busquedaAplicada,
        estadoAplicado,
        tipoAplicado,
        nutricionAplicada,
      ),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de insumos.",
    });

  const aplicar = () => {
    setBusquedaAplicada(busqueda.trim());
    setTipoAplicado(tipo);
    setNutricionAplicada(nutricion);
    setEstadoAplicado(estado);
    setPage(1);
  };

  const limpiar = () => {
    setBusqueda("");
    setBusquedaAplicada("");
    setTipo("");
    setTipoAplicado("");
    setNutricion("");
    setNutricionAplicada("");
    setEstado("");
    setEstadoAplicado("");
    setPage(1);
  };

  const filtrosExportacion = armarFiltros([
    ["Búsqueda", busquedaAplicada],
    ["Tipo", etiquetaOpcion(OPCIONES_TIPO, tipoAplicado)],
    ["Nutrición", etiquetaOpcion(OPCIONES_NUTRICION, nutricionAplicada)],
    ["Estado", etiquetaOpcion(OPCIONES_ESTADO, estadoAplicado)],
  ]);

  const columnas: ColumnDef<Insumo>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (insumo) => insumo.nombre,
    },
    {
      key: "categoria",
      label: "Tipo",
      render: (insumo) => formatearTipo(insumo.categoria),
    },
    {
      key: "unidad_medida",
      label: "Unidad de medida",
      render: (insumo) =>
        `${insumo.unidad_medida.nombre} (${insumo.unidad_medida.simbolo})`,
    },
    {
      key: "nutricion",
      label: "Nutrición",
      render: (insumo) => {
        if ((insumo.categoria || "").trim().toLowerCase() === "envase") {
          return "—";
        }
        if (insumo.nutricion_completa && insumo.es_nutricion_modificada) {
          return <Badge colorPalette='blue'>Completa (modificada)</Badge>;
        }
        if (insumo.nutricion_completa) {
          return <Badge colorPalette='green'>Completa</Badge>;
        }
        return <Badge colorPalette='yellow'>Pendiente</Badge>;
      },
    },
    {
      key: "disponible",
      label: "Estado",
      valorExportacion: (insumo) => (insumo.disponible ? "Activo" : "Inactivo"),
      render: (insumo) => (
        <Badge colorPalette={insumo.disponible ? "green" : "red"}>
          {insumo.disponible ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      exportable: false,
      align: "end",
      render: (insumo) => (
        <RowActions>
          <RowActionButton
            icon={FiPackage}
            label='Ver lotes'
            colorPalette='purple'
            onClick={() => onVerLotes?.(insumo)}
          />
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(insumo)}
            visible={insumo.disponible}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(insumo)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(insumo)}
            visible={insumo.disponible}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(insumo)}
            visible={!insumo.disponible}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <ListadoHeader title="Insumos" icon={FiBox}>
        <HStack gap={2} wrap="wrap">
          <Button
            variant="outline"
            colorPalette="green"
            onClick={onVerAlimentosReferencia}
          >
            <FiDatabase /> Alimentos de referencia
          </Button>
          <Button
            variant="outline"
            colorPalette="green"
            onClick={onVerUnidades}
          >
            <FaRuler /> Unidades de medida
          </Button>
          <Button colorPalette="green" onClick={onCrear}>
            <FiPlus /> Nuevo insumo
          </Button>
        </HStack>
      </ListadoHeader>

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel='Buscar insumo'
            placeholder='Nombre, tipo, unidad o nutrición...'
            value={busqueda}
            onChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Tipo de insumo'
            placeholder='Todos los tipos'
            options={OPCIONES_TIPO}
            value={tipo}
            onChange={setTipo}
          />
          <FiltroSelect
            ariaLabel='Estado nutricional del insumo'
            placeholder='Toda la nutrición'
            options={OPCIONES_NUTRICION}
            value={nutricion}
            onChange={setNutricion}
          />
          <FiltroSelect
            ariaLabel='Estado del insumo'
            placeholder='Todos los estados'
            options={OPCIONES_ESTADO}
            value={estado}
            onChange={setEstado}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando insumos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            hayAplicados
              ? "No hay insumos que coincidan con los filtros."
              : "Todavía no hay insumos cargados."
          }
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            exportarItems={data}
            exportarTitulo="Insumos"
            exportarFiltros={filtrosExportacion}
            columns={columnas}
            getRowKey={(insumo) => insumo.id}
          />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='insumo'
            labelPlural='insumos'
          />
        </>
      )}
    </ListadoContainer>
  );
};