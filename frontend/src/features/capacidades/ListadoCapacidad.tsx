import { Badge, Box } from "@chakra-ui/react";
import { FiAward, FiEdit2, FiTrash2, FiEye, FiCheckCircle, FiLock } from "react-icons/fi";
import { AlertMessage, DataTable, LoadingState, RowActionButton, RowActions, TablePagination } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Capacidad } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoCapacidadesProps {
    onCrear?: () => void;
    onModificar?: (capacidad: Capacidad) => void;
    onEliminar?: (capacidad: Capacidad) => void;
    onVer?: (capacidad: Capacidad) => void;
    onDarAlta?: (capacidad: Capacidad) => void;
}

export const ListadoCapacidades = ({ onCrear, onModificar, onEliminar, onVer, onDarAlta }: ListadoCapacidadesProps) => {
    const { data, loading, error, page, setPage, itemsPaginados } = useListadoData<Capacidad>({
        endpoint: "http://127.0.0.1:8000/capacidades/",
        pageSize: 5,
        errorMessage: "No se pudo cargar la lista de capacidades.",
    });

    const columnas: ColumnDef<Capacidad>[] = [
        { key: "nombre", label: "Nombre", render: (cap) => cap.nombre },
        { 
            key: "tipo", 
            label: "Tipo", 
            render: (cap) => (
                <Badge colorPalette={cap.tipo === "sistema" ? "blue" : "yellow"}>
                    {cap.tipo === "sistema" ? "Sistema" : "Personalizada"}
                </Badge>
            ) 
        },
        {
            key: "activo",
            label: "Estado",
            render: (cap) => (
                <Badge colorPalette={cap.activo ? "green" : "red"}>
                    {cap.activo ? "Activa" : "Inactiva"}
                </Badge>
            ),
        },
        {
            key: "acciones",
            label: "Acciones",
            align: "end",
            render: (cap) => (
                <RowActions>
                    {cap.tipo === "sistema" ? (
                        <>
                            <RowActionButton icon={FiEye} label="Ver" colorPalette="yellow" onClick={() => onVer?.(cap)} />
                            <Box as="span" title="Esta capacidad no tiene acciones">
                                <RowActionButton icon={FiLock} label="Bloqueado" colorPalette="gray" onClick={() => {}} />
                            </Box>
                        </>
                    ) : (
                        <>
                            {/* Personalizada: Editar, Ver y Eliminar (en ese orden) */}
                            <RowActionButton icon={FiEdit2} label="Modificar" colorPalette="blue" onClick={() => onModificar?.(cap)} visible={cap.activo} />
                            
                            <RowActionButton icon={FiEye} label="Ver" colorPalette="yellow" onClick={() => onVer?.(cap)} />
                            
                            <RowActionButton icon={FiTrash2} label="Eliminar" colorPalette="red" onClick={() => onEliminar?.(cap)} visible={cap.activo} />
                            <RowActionButton icon={FiCheckCircle} label="Dar de alta" colorPalette="green" onClick={() => onDarAlta?.(cap)} visible={!cap.activo} />
                        </>
                    )}
                </RowActions>
            ),
        },
    ];

    return (
        <ListadoContainer>
            <ListadoHeader title="Capacidades" icon={FiAward} buttonLabel="Nueva capacidad" onCrear={onCrear} />
            {loading && <LoadingState message="Cargando capacidades..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && data.length === 0 && <AlertMessage type="info" message="Todavía no hay capacidades cargadas." />}
            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable items={itemsPaginados} columns={columnas} getRowKey={(cap) => cap.id} />
                    <TablePagination count={data.length} page={page} pageSize={5} onPageChange={setPage} labelSingular="capacidad" labelPlural="capacidades" />
                </>
            )}
        </ListadoContainer>
    );
};