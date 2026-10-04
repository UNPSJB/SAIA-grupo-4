import { useState } from "react";
import { Badge } from "@chakra-ui/react";
import { FiAlertCircle, FiEye, FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import {
  AlertMessage,
  COLOR_ESTADO,
  DataTable,
  ETIQUETA_ESTADO,
  LoadingState,
  RowActionButton,
  RowActions,
  SemaforoFecha,
  TablePagination,
} from "../../components/ui";
import type { ColumnDef } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import { VencimientosFiltros } from "./VencimientosFiltros";
import { COLOR_CATEGORIA, construirEndpoint } from "./utils";
import type {
  CategoriaDisponible,
  EstadoVencimiento,
  Vencimiento,
} from "./types";

export const ListadoVencimientos = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<EstadoVencimiento | "">("");
  const [categoria, setCategoria] = useState("");

  // El endpoint se rearma con los filtros: useListadoData vuelve a pedir los
  // datos cada vez que la URL cambia, sin necesidad de un hook propio.
  const { data, loading, error, page, setPage, pageSize, itemsPaginados } =
    useListadoData<Vencimiento>({
      endpoint: construirEndpoint(estado, categoria),
      errorMessage: "No se pudo cargar la lista de vencimientos.",
    });

  // Las categorías salen del servidor, no de una lista fija en el código.
  const { data: categorias } = useListadoData<CategoriaDisponible>({
    endpoint: "http://127.0.0.1:8000/vencimientos/categorias",
    errorMessage: "No se pudieron cargar las categorías de vencimientos.",
  });

  // Cada cambio de filtro vuelve a la primera página: si no, se puede caer en
  // una página vacía al filtrar sobre un resultado más corto.
  const handleEstadoChange = (valor: EstadoVencimiento | "") => {
    setEstado(valor);
    setPage(1);
  };

  const handleCategoriaChange = (valor: string) => {
    setCategoria(valor);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setEstado("");
    setCategoria("");
    setPage(1);
  };

  const columnas: ColumnDef<Vencimiento>[] = [
    {
      key: "categoria",
      label: "Categoría",
      w: "180px",
      render: (v) => (
        <Badge colorPalette={COLOR_CATEGORIA[v.categoria]} variant='subtle'>
          {v.entidad}
        </Badge>
      ),
    },
    {
      key: "concepto",
      label: "Concepto",
      w: "220px",
      truncate: true,
      render: (v) => v.concepto,
    },
    {
      key: "detalle",
      label: "Detalle",
      w: "160px",
      render: (v) =>
        v.detalle ?? (
          <span style={{ color: "var(--chakra-colors-gray-400)" }}>—</span>
        ),
    },
    {
      key: "vencimiento",
      label: "Vencimiento",
      w: "150px",
      render: (v) => (
        <SemaforoFecha
          estado={v.estado}
          fecha={v.fecha_vencimiento}
          diasRestantes={v.dias_restantes}
        />
      ),
    },
    {
      key: "estado",
      label: "Estado",
      w: "110px",
      render: (v) => (
        <Badge colorPalette={COLOR_ESTADO[v.estado]}>
          {ETIQUETA_ESTADO[v.estado]}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      w: "80px",
      render: (v) => (
        <RowActions>
          <RowActionButton
            icon={FiRefreshCw}
            label='Aplicar cambios'
            colorPalette='green'
            title='Cambio'
            onClick={() => navigate(v.ruta_detalle)}
          />
          {/* Criterio 3: el backend ya devuelve la ruta con el registro
              seleccionado, así que el frontend no sabe de qué módulo viene
              la fila. */}
          <RowActionButton
            icon={FiEye}
            label='Ver detalle'
            colorPalette='yellow'
            title='Ver detalle'
            onClick={() => navigate(v.ruta_detalle)}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer maxW='6x1'>
      <ListadoHeader title='Vencimientos' icon={FiAlertCircle} />

      <VencimientosFiltros
        estado={estado}
        categoria={categoria}
        categorias={categorias}
        onEstadoChange={handleEstadoChange}
        onCategoriaChange={handleCategoriaChange}
        onLimpiar={limpiarFiltros}
      />

      {loading && <LoadingState message='Cargando vencimientos...' />}
      {!loading && error && <AlertMessage type='error' message={error} />}
      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message='No hay vencimientos que coincidan con los filtros seleccionados.'
        />
      )}
      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(v) => v.id}
            minW='900px'
          />
          <TablePagination
            count={data.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            labelSingular='vencimiento'
            labelPlural='vencimientos'
          />
        </>
      )}
    </ListadoContainer>
  );
};
