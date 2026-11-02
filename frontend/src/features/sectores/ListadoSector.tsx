import { useState } from "react";
import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { Badge, Box } from "@chakra-ui/react";
import {
    FiMap,
    FiEdit2,
    FiTrash2,
    FiCheckCircle,
    FiEye,
} from "react-icons/fi";
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
import { useDebounce } from "../../hooks/useDebounce";
import type { Sector } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoSectoresProps {
    onCrear?: () => void;
    onModificar?: (sector: Sector) => void;
    onEliminar?: (sector: Sector) => void;
    onVer?: (sector: Sector) => void;
    onDarAlta?: (sector: Sector) => void;
}


const construirEndpoint = (busqueda: string, estado: string) => {
    const params = new URLSearchParams();
    if (busqueda) params.set("busqueda", busqueda);
    if (estado === "activo") params.set("activo", "true");
    if (estado === "inactivo") params.set("activo", "false");

    const query = params.toString();
    return `${BASE_URL}/sectores/${query ? `?${query}` : ""}`;
};

const OPCIONES_ESTADO = [
    { label: "Activos", value: "activo" },
    { label: "Inactivos", value: "inactivo" },
];

export const ListadoSectores = ({
    onCrear,
    onModificar,
    onEliminar,
    onVer,
    onDarAlta,
}: ListadoSectoresProps) => {
    // La búsqueda se aplica sola con debounce; el select espera a "Filtrar".
    const [busqueda, setBusqueda] = useState("");
    const busquedaAplicada = useDebounce(busqueda.trim(), 300);

    const [estado, setEstado] = useState("");
    const [estadoAplicado, setEstadoAplicado] = useState("");

    const hayFiltros = busqueda.trim() !== "" || estado !== "";
    const hayAplicados = busquedaAplicada !== "" || estadoAplicado !== "";

    const { data, loading, error, page, setPage, itemsPaginados } =
        useListadoData<Sector>({
            endpoint: construirEndpoint(busquedaAplicada, estadoAplicado),
            pageSize: ITEMS_POR_PAGINA,
            errorMessage: "No se pudo cargar la lista de sectores.",
        });

    const aplicar = () => {
        setEstadoAplicado(estado);
        setPage(1);
    };

    const limpiar = () => {
        setBusqueda("");
        setEstado("");
        setEstadoAplicado("");
        setPage(1);
    };

    const columnas: ColumnDef<Sector>[] = [
        {
            key: "nombre",
            label: "Nombre",
            render: (sector) => sector.nombre,
        },
        {
            key: "activo",
            label: "Estado",
            render: (sector) => (
                <Badge colorPalette={sector.activo ? "green" : "red"}>
                    {sector.activo ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            key: "acciones",
            label: "Acciones",
            align: "end",
            render: (sector) => (
                <RowActions>
                    <RowActionButton
                        icon={FiEdit2}
                        label="Modificar"
                        colorPalette="blue"
                        onClick={() => onModificar?.(sector)}
                        visible={sector.activo}
                    />
                    <RowActionButton
                        icon={FiEye}
                        label="Ver"
                        colorPalette="yellow"
                        onClick={() => onVer?.(sector)}
                    />
                    <RowActionButton
                        icon={FiTrash2}
                        label="Eliminar"
                        colorPalette="red"
                        onClick={() => onEliminar?.(sector)}
                        visible={sector.activo}
                    />
                    <RowActionButton
                        icon={FiCheckCircle}
                        label="Dar de alta"
                        colorPalette="green"
                        onClick={() => onDarAlta?.(sector)}
                        visible={!sector.activo}
                    />
                </RowActions>
            ),
        },
    ];

    return (
        <ListadoContainer>
            <ListadoHeader
                title="Sectores"
                icon={FiMap}
                buttonLabel="Nuevo sector"
                onCrear={onCrear}
            />
            <Box mb={4}>
               <FiltrosBar
                    onAplicar={aplicar}
                    onLimpiar={limpiar}
                    hayFiltrosActivos={hayFiltros}
                    loading={loading}
                >
                <FiltroTexto
                    ariaLabel="Buscar sector"
                    placeholder="Nombre del sector"
                    value={busqueda}
                    onChange={setBusqueda}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") aplicar();
                    }}
                />
                <FiltroSelect
                    ariaLabel="Estado del sector"
                    placeholder="Todos los estados"
                    options={OPCIONES_ESTADO}
                    value={estado}
                    onChange={setEstado}
                />
                </FiltrosBar>
            </Box>

            {loading && <LoadingState message="Cargando sectores..." />}

            {!loading && error && <AlertMessage type="error" message={error} />}

            {!loading && !error && data.length === 0 && (
                <AlertMessage
                    type="info"
                    message={
                        hayAplicados
                            ? "No hay sectores que coincidan con los filtros."
                            : "Todavía no hay sectores cargados."
                    }
                />
            )}

            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable
                        items={itemsPaginados}
                        columns={columnas}
                        getRowKey={(sector) => sector.id}
                    />

                    <TablePagination
                        count={data.length}
                        page={page}
                        pageSize={ITEMS_POR_PAGINA}
                        onPageChange={setPage}
                        labelSingular="sector"
                        labelPlural="sectores"
                    />
                </>
            )}
        </ListadoContainer>
    );
};