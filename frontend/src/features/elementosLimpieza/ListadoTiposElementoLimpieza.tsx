import { Badge, HStack, Button } from "@chakra-ui/react";
import { FiTag, FiEdit2, FiTrash2, FiCheckCircle, FiPlus } from "react-icons/fi";
import { AlertMessage, DataTable, LoadingState, RowActionButton, RowActions, TablePagination } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { TipoElementoLimpieza } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoTiposElementoLimpiezaProps {
    onCrear?: () => void;
    onModificar?: (tipo: TipoElementoLimpieza) => void;
    onEliminar?: (tipo: TipoElementoLimpieza) => void;
    onDarAlta?: (tipo: TipoElementoLimpieza) => void;
}

export const ListadoTiposElementoLimpieza = ({ onCrear, onModificar, onEliminar, onDarAlta }: ListadoTiposElementoLimpiezaProps) => {
    const { data, loading, error, page, setPage, itemsPaginados } = useListadoData<TipoElementoLimpieza>({
        endpoint: "http://127.0.0.1:8000/tipos-elemento-limpieza/",
        pageSize: 5,
        errorMessage: "No se pudo cargar la lista de tipos.",
    });

    const columnas: ColumnDef<TipoElementoLimpieza>[] = [
        { key: "nombre", label: "Nombre", render: (t) => t.nombre },
        { key: "prefijo", label: "Prefijo", render: (t) => t.prefijo },
        {
            key: "activo",
            label: "Estado",
            render: (t) => (
                <Badge colorPalette={t.activo ? "green" : "red"}>
                    {t.activo ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            key: "acciones",
            label: "Acciones",
            align: "end",
            render: (t) => (
                <RowActions>
                    <RowActionButton icon={FiEdit2} label="Modificar" colorPalette="blue" onClick={() => onModificar?.(t)} visible={t.activo} />
                    <RowActionButton icon={FiTrash2} label="Eliminar" colorPalette="red" onClick={() => onEliminar?.(t)} visible={t.activo} />
                    <RowActionButton icon={FiCheckCircle} label="Dar de alta" colorPalette="green" onClick={() => onDarAlta?.(t)} visible={!t.activo} />
                </RowActions>
            ),
        },
    ];

    return (
        <ListadoContainer>
            <HStack justify="space-between" mb={6} align="center">
                <ListadoHeader title="Tipos de Elemento de Limpieza" icon={FiTag} />
                <Button colorPalette="green" onClick={onCrear}>
                    <FiPlus /> Nuevo tipo
                </Button>
            </HStack>

            {loading && <LoadingState message="Cargando tipos..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && data.length === 0 && <AlertMessage type="info" message="Todavía no hay tipos cargados." />}
            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable items={itemsPaginados} columns={columnas} getRowKey={(t) => t.id} />
                    <TablePagination count={data.length} page={page} pageSize={5} onPageChange={setPage} labelSingular="tipo" labelPlural="tipos" />
                </>
            )}
        </ListadoContainer>
    );
};