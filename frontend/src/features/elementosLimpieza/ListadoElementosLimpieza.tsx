import { Badge, HStack, Button } from "@chakra-ui/react";
import { FiTrash2, FiEdit2, FiEye, FiCheckCircle, FiPlus, FiTag, FiDroplet  } from "react-icons/fi";
import { AlertMessage, DataTable, LoadingState, RowActionButton, RowActions, TablePagination } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { ElementoLimpieza } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoElementosLimpiezaProps {
    onCrear?: () => void;
    onCrearTipo?: () => void;
    onModificar?: (elemento: ElementoLimpieza) => void;
    onEliminar?: (elemento: ElementoLimpieza) => void;
    onVer?: (elemento: ElementoLimpieza) => void;
    onDarAlta?: (elemento: ElementoLimpieza) => void;
}

const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return "—";
    try {
        return new Date(fechaStr).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return fechaStr;
    }
};

export const ListadoElementosLimpieza = ({ onCrear, onCrearTipo, onModificar, onEliminar, onVer, onDarAlta }: ListadoElementosLimpiezaProps) => {
    const { data, loading, error, page, setPage, itemsPaginados } = useListadoData<ElementoLimpieza>({
        endpoint: "http://127.0.0.1:8000/elementos-limpieza/",
        pageSize: 5,
        errorMessage: "No se pudo cargar la lista de elementos de limpieza.",
    });

    const columnas: ColumnDef<ElementoLimpieza>[] = [
        { key: "tipo", label: "Tipo", render: (e) => e.tipo?.nombre ?? "—" },
        { key: "sector", label: "Sector", render: (e) => e.sector?.nombre ?? "Sin asignar" },
        { key: "equipo", label: "Equipo", render: (e) => e.equipo?.nombre ?? "Sin asignar" },
        { key: "frecuencia", label: "Frecuencia (días)", render: (e) => e.frecuencia_recambio_dias ?? "—" },
        { key: "ultimo_recambio", label: "Último recambio", render: (e) => formatearFecha(e.fecha_ultimo_recambio) },
        {
            key: "activo",
            label: "Estado",
            render: (e) => (
                <Badge colorPalette={e.activo ? "green" : "red"}>
                    {e.activo ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            key: "acciones",
            label: "Acciones",
            align: "end",
            render: (e) => (
                <RowActions>
                    <RowActionButton icon={FiEdit2} label="Modificar" colorPalette="blue" onClick={() => onModificar?.(e)} visible={e.activo} />
                    <RowActionButton icon={FiEye} label="Ver" colorPalette="yellow" onClick={() => onVer?.(e)} />
                    <RowActionButton icon={FiTrash2} label="Eliminar" colorPalette="red" onClick={() => onEliminar?.(e)} visible={e.activo} />
                    <RowActionButton icon={FiCheckCircle} label="Dar de alta" colorPalette="green" onClick={() => onDarAlta?.(e)} visible={!e.activo} />
                </RowActions>
            ),
        },
    ];

    return (
        <ListadoContainer>
            <HStack justify="space-between" mb={6} align="center">
                <ListadoHeader title="Elementos de Limpieza" icon={FiDroplet} />
                <HStack gap={2}>
                    <Button variant="outline" colorPalette="green" onClick={onCrearTipo}>
                        <FiPlus /> Nuevo tipo
                    </Button>
                    <Button colorPalette="green" onClick={onCrear}>
                        <FiPlus /> Nuevo elemento
                    </Button>
                </HStack>
            </HStack>

            {loading && <LoadingState message="Cargando elementos de limpieza..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && data.length === 0 && <AlertMessage type="info" message="Todavía no hay elementos de limpieza cargados." />}
            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable items={itemsPaginados} columns={columnas} getRowKey={(e) => e.id} />
                    <TablePagination count={data.length} page={page} pageSize={5} onPageChange={setPage} labelSingular="elemento" labelPlural="elementos" />
                </>
            )}
        </ListadoContainer>
    );
};