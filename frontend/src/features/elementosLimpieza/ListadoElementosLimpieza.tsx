import { useState } from "react";
import { Badge, HStack, Button } from "@chakra-ui/react";
import { FiTrash2, FiEdit2, FiEye, FiCheckCircle, FiPlus, FiSettings, FiDroplet } from "react-icons/fi";
import { AlertMessage, DataTable, LoadingState, RowActionButton, RowActions, TablePagination, SelectField } from "../../components/ui";
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

const PAGE_SIZE = 5;

const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return "—";
    try {
        return new Date(fechaStr).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return fechaStr;
    }
};

const construirEndpoint = (filtroEstado: "todos" | "activos" | "inactivos") => {
    const base = "http://127.0.0.1:8000/elementos-limpieza/";
    if (filtroEstado === "activos") return `${base}?activo=true`;
    if (filtroEstado === "inactivos") return `${base}?activo=false`;
    return base;
};

export const ListadoElementosLimpieza = ({ onCrear, onCrearTipo, onModificar, onEliminar, onVer, onDarAlta }: ListadoElementosLimpiezaProps) => {
    const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("activos");
    const [page, setPage] = useState(1);

    const { data, loading, error } = useListadoData<ElementoLimpieza>({
        endpoint: construirEndpoint(filtroEstado),
        errorMessage: "No se pudo cargar la lista de elementos de limpieza.",
    });

    const inicio = (page - 1) * PAGE_SIZE;
    const itemsPaginados = data.slice(inicio, inicio + PAGE_SIZE);

    const handleCambiarFiltro = (nuevoFiltro: "todos" | "activos" | "inactivos") => {
        setFiltroEstado(nuevoFiltro);
        setPage(1);
    };

    const columnas: ColumnDef<ElementoLimpieza>[] = [
        { key: "codigo", label: "Código", render: (e) => e.codigo },
        { key: "nombre", label: "Nombre", render: (e) => e.nombre },
        {
            key: "asociado_a",
            label: "Asociado a",
            render: (e) => {
                if (e.sector) return <Badge colorPalette="blue" variant="subtle">Sector: {e.sector.nombre}</Badge>;
                if (e.equipo) return <Badge colorPalette="purple" variant="subtle">Equipo: {e.equipo.nombre}</Badge>;
                return <span style={{ color: "var(--chakra-colors-gray-400)" }}>Sin asignar</span>;
            },
        },
        { key: "frecuencia", label: "Frecuencia (días)", render: (e) => e.frecuencia_recambio_dias ? `${e.frecuencia_recambio_dias} días` : "—" },
        { key: "ultimo_recambio", label: "Último Recambio", render: (e) => formatearFecha(e.fecha_ultimo_recambio) },
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
                    <SelectField
                        label=""
                        options={[
                            { label: "Activos", value: "activos" },
                            { label: "Inactivos", value: "inactivos" },
                            { label: "Todos", value: "todos" },
                        ]}
                        value={filtroEstado}
                        onChange={(e) => handleCambiarFiltro(e.target.value as "todos" | "activos" | "inactivos")}
                    />
                    <Button variant="outline" colorPalette="green" onClick={onCrearTipo}>
                        <FiSettings /> Gestionar tipos
                    </Button>
                    <Button colorPalette="green" onClick={onCrear}>
                        <FiPlus /> Nuevo elemento
                    </Button>
                </HStack>
            </HStack>

            {loading && <LoadingState message="Cargando elementos de limpieza..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && data.length === 0 && <AlertMessage type="info" message="No hay elementos de limpieza para mostrar." />}
            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable items={itemsPaginados} columns={columnas} getRowKey={(e) => e.id} />
                    <TablePagination count={data.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} labelSingular="elemento" labelPlural="elementos" />
                </>
            )}
        </ListadoContainer>
    );
};