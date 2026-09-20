import { Badge } from "@chakra-ui/react";
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
    LoadingState,
    RowActionButton,
    RowActions,
    TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Sector } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoSectoresProps {
    onCrear?: () => void;
    onModificar?: (sector: Sector) => void;
    onEliminar?: (sector: Sector) => void;
    onVer?: (sector: Sector) => void;
    onDarAlta?: (sector: Sector) => void;
}

const ENDPOINT = "http://127.0.0.1:8000/sectores/";
const ITEMS_POR_PAGINA = 5;

export const ListadoSectores = ({
    onCrear,
    onModificar,
    onEliminar,
    onVer,
    onDarAlta,
}: ListadoSectoresProps) => {
    const { data, loading, error, page, setPage, itemsPaginados } =
        useListadoData<Sector>({
            endpoint: ENDPOINT,
            pageSize: ITEMS_POR_PAGINA,
            errorMessage: "No se pudo cargar la lista de sectores.",
        });

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

            {loading && <LoadingState message="Cargando sectores..." />}

            {!loading && error && <AlertMessage type="error" message={error} />}

            {!loading && !error && data.length === 0 && (
                <AlertMessage type="info" message="Todavía no hay sectores cargados." />
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