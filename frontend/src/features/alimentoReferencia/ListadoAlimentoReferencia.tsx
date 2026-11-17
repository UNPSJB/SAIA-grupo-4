import { BASE_URL } from "../../config";
import { useEffect, useState } from "react";
import { Badge, Box, Button, HStack } from "@chakra-ui/react";
import {
  FiDatabase,
  FiEdit2,
  FiEye,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { apiFetch } from "../auth/apiFetch";
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
import type { ColumnDef } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { AlimentoReferencia } from "./types";

interface ListadoAlimentoReferenciaProps {
  onCrear?: () => void;
  onModificar?: (alimento: AlimentoReferencia) => void;
  onEliminar?: (alimento: AlimentoReferencia) => void;
  onVer?: (alimento: AlimentoReferencia) => void;
}

const ITEMS_POR_PAGINA_REFERENCIA = 10;

const formatearNum = (val: number | string) =>
  Number(val ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const construirEndpoint = (q: string, categoria: string, origen: string) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoria) params.set("categoria", categoria);
  if (origen === "sara") params.set("es_oficial_sara", "true");
  if (origen === "propio") params.set("es_oficial_sara", "false");
  const query = params.toString();
  return `${BASE_URL}/alimentos-referencia/${query ? `?${query}` : ""}`;
};

export const ListadoAlimentoReferencia = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
}: ListadoAlimentoReferenciaProps) => {
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categoriaAplicada, setCategoriaAplicada] = useState("");
  const [origen, setOrigen] = useState("");
  const [origenAplicado, setOrigenAplicado] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);

  useEffect(() => {
    let activo = true;
    apiFetch(`${BASE_URL}/alimentos-referencia/categorias`)
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: string[]) => {
        if (activo && Array.isArray(lista)) {
          setCategorias(lista);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const hayFiltros =
    busqueda.trim() !== "" || categoria !== "" || origen !== "";
  const hayAplicados =
    busquedaAplicada !== "" || categoriaAplicada !== "" || origenAplicado !== "";

  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<AlimentoReferencia>({
      endpoint: construirEndpoint(
        busquedaAplicada,
        categoriaAplicada,
        origenAplicado,
      ),
      pageSize: ITEMS_POR_PAGINA_REFERENCIA,
      errorMessage: "No se pudieron cargar los alimentos de referencia.",
    });

  const aplicar = () => {
    setBusquedaAplicada(busqueda.trim());
    setCategoriaAplicada(categoria);
    setOrigenAplicado(origen);
    setPage(1);
  };

  const limpiar = () => {
    setBusqueda("");
    setBusquedaAplicada("");
    setCategoria("");
    setCategoriaAplicada("");
    setOrigen("");
    setOrigenAplicado("");
    setPage(1);
  };

  const columnas: ColumnDef<AlimentoReferencia>[] = [
    {
      key: "codigo",
      label: "Código",
      render: (item) => item.codigo || "—",
    },
    {
      key: "alimento",
      label: "Alimento",
      render: (item) => item.alimento,
    },
    {
      key: "categoria",
      label: "Categoría",
      render: (item) => item.categoria || "—",
    },
    {
      key: "energia_kcal",
      label: "Energía (kcal)",
      render: (item) => formatearNum(item.energia_kcal),
    },
    {
      key: "carbohidratos_g",
      label: "HC (g)",
      render: (item) => formatearNum(item.carbohidratos_g),
    },
    {
      key: "proteinas_g",
      label: "Prot. (g)",
      render: (item) => formatearNum(item.proteinas_g),
    },
    {
      key: "grasas_totales_g",
      label: "Grasas (g)",
      render: (item) => formatearNum(item.grasas_totales_g),
    },
    {
      key: "sodio_mg",
      label: "Sodio (mg)",
      render: (item) => formatearNum(item.sodio_mg),
    },
    {
      key: "origen",
      label: "Origen",
      render: (item) => (
        <Badge colorPalette={item.es_oficial_sara ? "purple" : "grey"}>
          {item.es_oficial_sara ? "Oficial SARA 2" : "Propio"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (item) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(item)}
            visible={!item.es_oficial_sara}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(item)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(item)}
            visible={!item.es_oficial_sara}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader title='Alimentos de Referencia (SARA 2)' icon={FiDatabase} />
        <Button colorPalette='green' onClick={onCrear}>
          <FiPlus /> Nuevo Alimento de Referencia
        </Button>
      </HStack>

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel='Buscar alimento de referencia'
            placeholder='Nombre, código o categoría'
            value={busqueda}
            onChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Categoría del alimento'
            placeholder='Todas las categorías'
            options={categorias.map((c) => ({ label: c, value: c }))}
            value={categoria}
            onChange={setCategoria}
          />
          <FiltroSelect
            ariaLabel='Origen del alimento'
            placeholder='Todos los orígenes'
            options={[
              { label: "Oficial SARA 2", value: "sara" },
              { label: "Propios", value: "propio" },
            ]}
            value={origen}
            onChange={setOrigen}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando alimentos de referencia...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            hayAplicados
              ? "No hay alimentos de referencia que coincidan con los filtros."
              : "Todavía no hay alimentos de referencia cargados."
          }
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(item) => item.id}
          />
          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA_REFERENCIA}
            onPageChange={setPage}
            labelSingular='alimento de referencia'
            labelPlural='alimentos de referencia'
          />
        </>
      )}
    </ListadoContainer>
  );
};
