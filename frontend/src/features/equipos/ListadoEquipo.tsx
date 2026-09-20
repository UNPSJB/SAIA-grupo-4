import { Badge } from "@chakra-ui/react";
import {
    FiThermometer,
    FiEdit2,
    FiTrash2,
    FiCheckCircle,
    FiEye,
} from "react-icons/fi";
import {
    AlertMessage,
    DataTable,
    LoadingState,
    RowActionButton,
    RowActions,
    TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Equipo } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoEquiposProps {
    onCrear?: () => void;
    onModificar?: (equipo: Equipo) => void;
    onEliminar?: (equipo: Equipo) => void;
    onVer?: (equipo: Equipo) => void;
    onDarAlta?: (equipo: Equipo) => void;
}

const ENDPOINT = "http://127.0.0.1:8000/equipos/";
const ITEMS_POR_PAGINA = 5;

export const ListadoEquipos = ({
    onCrear,
    onModificar,
    onEliminar,
    onVer,
    onDarAlta,
}: ListadoEquiposProps) => {
    const { data, loading, error, page, setPage, itemsPaginados } =
        useListadoData<Equipo>({
            endpoint: ENDPOINT,
            pageSize: ITEMS_POR_PAGINA,
            errorMessage: "No se pudo cargar la lista de equipos.",
        });

    const columnas: ColumnDef<Equipo>[] = [
        {
            key: "nombre",
            label: "Nombre",
            render: (equipo) => equipo.nombre,
        },
        {
            key: "marca",
            label: "Marca",
            render: (equipo) => equipo.marca,
        },
        {
            key: "numero_serie",
            label: "N° Serie",
            render: (equipo) => equipo.numero_serie,
        },
        {
            key: "sector",
            label: "Sector",
            render: (equipo) => equipo.sector.nombre,
        },
        {
            key: "activo",
            label: "Estado",
            render: (equipo) => (
                <Badge colorPalette={equipo.activo ? "green" : "red"}>
                    {equipo.activo ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            key: "acciones",
            label: "Acciones",
            align: "end",
            render: (equipo) => (
                <RowActions>
                    <RowActionButton
                        icon={FiEdit2}
                        label="Modificar"
                        colorPalette="blue"
                        onClick={() => onModificar?.(equipo)}
                        visible={equipo.activo}
                    />
                    <RowActionButton
                        icon={FiEye}
                        label="Ver"
                        colorPalette="yellow"
                        onClick={() => onVer?.(equipo)}
                    />
                    <RowActionButton
                        icon={FiTrash2}
                        label="Eliminar"
                        colorPalette="red"
                        onClick={() => onEliminar?.(equipo)}
                        visible={equipo.activo}
                    />
                    <RowActionButton
                        icon={FiCheckCircle}
                        label="Dar de alta"
                        colorPalette="green"
                        onClick={() => onDarAlta?.(equipo)}
                        visible={!equipo.activo}
                    />
                </RowActions>
            ),
        },
    ];

    return (
        <ListadoContainer>
            <ListadoHeader
                title="Equipos"
                icon={FiThermometer}
                buttonLabel="Nuevo equipo"
                onCrear={onCrear}
            />

            {loading && <LoadingState message="Cargando equipos..." />}

            {!loading && error && <AlertMessage type="error" message={error} />}

            {!loading && !error && data.length === 0 && (
                <AlertMessage type="info" message="Todavía no hay equipos cargados." />
            )}

            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable
                        items={itemsPaginados}
                        columns={columnas}
                        getRowKey={(equipo) => equipo.id}
                    />

                    <TablePagination
                        count={data.length}
                        page={page}
                        pageSize={ITEMS_POR_PAGINA}
                        onPageChange={setPage}
                        labelSingular="equipo"
                        labelPlural="equipos"
                    />
                </>
            )}
        </ListadoContainer>
    );
};