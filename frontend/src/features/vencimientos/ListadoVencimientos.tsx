import { useState } from "react";
import { Badge, HStack } from "@chakra-ui/react";
import { FiAlertCircle, FiEye } from "react-icons/fi";
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
import {
  FILTROS_INICIALES,
  type FiltrosVencimientos,
} from "./filtrosVencimientos";
import { VencimientosFiltros } from "./VencimientosFiltros";
import { renovacionDe } from "./renovacionVencimientos";
import { COLOR_CATEGORIA, construirEndpoint } from "./utils";
import type { CategoriaDisponible, Vencimiento } from "./types";

type Props = {
  /** Abre el detalle de una fila, en la misma vista. */
  onVerDetalle: (vencimiento: Vencimiento) => void;
  /** Abre la renovación. Solo se llama en categorías que la soportan. */
  onRenovar: (vencimiento: Vencimiento) => void;
  /** Se incrementa al guardar un recambio, para forzar la recarga. */
  refreshKey: number;
};

export const ListadoVencimientos = ({
  onVerDetalle,
  onRenovar,
  refreshKey,
}: Props) => {
  // Borrador: lo que el usuario está por aplicar. Aplicado: lo único que llega
  // al endpoint. Separarlos evita pedir datos en cada cambio de un desplegable.
  const [borrador, setBorrador] =
    useState<FiltrosVencimientos>(FILTROS_INICIALES);
  const [aplicados, setAplicados] =
    useState<FiltrosVencimientos>(FILTROS_INICIALES);

  const { data, loading, error, page, setPage, pageSize, itemsPaginados } =
    useListadoData<Vencimiento>({
      // El endpoint se rearma con los filtros aplicados: useListadoData vuelve a
      // pedir los datos cada vez que la URL cambia.
      endpoint: construirEndpoint(aplicados.estado, aplicados.categoria),
      refreshKey,
      errorMessage: "No se pudo cargar la lista de vencimientos.",
    });

  const { data: categorias } = useListadoData<CategoriaDisponible>({
    endpoint: "http://127.0.0.1:8000/vencimientos/categorias",
    errorMessage: "No se pudieron cargar las categorías de vencimientos.",
  });

  // Cada aplicación vuelve a la primera página: si no, se puede caer en una
  // página vacía al filtrar sobre un resultado más corto.
  const aplicar = () => {
    setAplicados(borrador);
    setPage(1);
  };

  const limpiar = () => {
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
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
      w: "110px",
      render: (v) => {
        const renovacion = renovacionDe(v.categoria);

        return (
          <RowActions>
            {/* El botón solo existe donde la categoría sabe renovarse. El
                dispatcher decide el ícono y el texto, así que sumar una
                categoría no obliga a tocar esta tabla. */}
            {renovacion && (
              <RowActionButton
                icon={renovacion.icono}
                label={renovacion.etiqueta}
                colorPalette={renovacion.colorPalette}
                title={renovacion.etiqueta}
                onClick={() => onRenovar(v)}
              />
            )}
            <RowActionButton
              icon={FiEye}
              label='Ver detalle'
              colorPalette='yellow'
              title='Ver detalle'
              onClick={() => onVerDetalle(v)}
            />
          </RowActions>
        );
      },
    },
  ];

  return (
    <ListadoContainer maxW='6xl'>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader title='Vencimientos' icon={FiAlertCircle} />

        <VencimientosFiltros
          filtros={borrador}
          categorias={categorias}
          onCambiar={setBorrador}
          onAplicar={aplicar}
          onLimpiar={limpiar}
          loading={loading}
        />
      </HStack>

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
