import { Badge, Wrap, HStack, Button } from "@chakra-ui/react";
import { FiUser, FiEdit2, FiTrash2, FiEye, FiCheckCircle, FiAward, FiPlus } from "react-icons/fi";
import { AlertMessage, DataTable, LoadingState, RowActionButton, RowActions, TablePagination } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Persona } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoPersonalProps {
    onCrear?: () => void;
    onModificar?: (persona: Persona) => void;
    onEliminar?: (persona: Persona) => void;
    onVer?: (persona: Persona) => void;
    onDarAlta?: (persona: Persona) => void;
    onVerCapacidades?: () => void;
}

export const ListadoPersonal = ({ onCrear, onModificar, onEliminar, onVer, onDarAlta, onVerCapacidades }: ListadoPersonalProps) => {
    const { data, loading, error, page, setPage, itemsPaginados } = useListadoData<Persona>({
        endpoint: "http://127.0.0.1:8000/personal/",
        pageSize: 5,
        errorMessage: "No se pudo cargar la lista de personal.",
    });

    const columnas: ColumnDef<Persona>[] = [
        { key: "nombre", label: "Nombre completo", render: (p) => `${p.nombre} ${p.apellido}` },
        { key: "dni", label: "DNI", render: (p) => p.dni },
        { key: "legajo", label: "Legajo", render: (p) => p.legajo },
        {
            key: "capacidades",
            label: "Capacidades",
            render: (p) => {
                const activas = (p.capacidades || []).filter((c) => c.activo);
                if (activas.length === 0) return <span style={{ color: "gray" }}>Ninguna</span>;
                return (
                    <Wrap gap={1}>
                        {activas.map((c) => (
                            <Badge 
                                key={c.id} 
                                colorPalette={c.capacidad.tipo === "sistema" ? "blue" : "yellow"} 
                                variant="subtle" 
                                textTransform="capitalize"
                            >
                                {c.capacidad.nombre}
                            </Badge>
                        ))}
                    </Wrap>
                );
            },
        },
        {
            key: "activo",
            label: "Estado",
            render: (p) => (
                <Badge colorPalette={p.activo ? "green" : "red"}>
                    {p.activo ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            key: "acciones",
            label: "Acciones",
            align: "end",
            render: (p) => (
                <RowActions>
                    <RowActionButton icon={FiEdit2} label="Modificar" colorPalette="blue" onClick={() => onModificar?.(p)} visible={p.activo} />
                    <RowActionButton icon={FiEye} label="Ver" colorPalette="yellow" onClick={() => onVer?.(p)} />
                    <RowActionButton icon={FiTrash2} label="Eliminar" colorPalette="red" onClick={() => onEliminar?.(p)} visible={p.activo} />
                    <RowActionButton icon={FiCheckCircle} label="Dar de alta" colorPalette="green" onClick={() => onDarAlta?.(p)} visible={!p.activo} />
                </RowActions>
            ),
        },
    ];

    return (
        <ListadoContainer>
            <HStack justify="space-between" mb={6} align="center">
                <ListadoHeader title="Personal" icon={FiUser} />
                <HStack gap={2}>
                    <Button variant="outline" colorPalette="green" onClick={onVerCapacidades}>
                        <FiAward /> Capacidades
                    </Button>
                    <Button colorPalette="green" onClick={onCrear}>
                        <FiPlus /> Nueva persona
                    </Button>
                </HStack>
            </HStack>
            
            {loading && <LoadingState message="Cargando personal..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && data.length === 0 && <AlertMessage type="info" message="Todavía no hay personal cargado." />}
            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable items={itemsPaginados} columns={columnas} getRowKey={(p) => p.id} />
                    <TablePagination count={data.length} page={page} pageSize={5} onPageChange={setPage} labelSingular="persona" labelPlural="personas" />
                </>
            )}
        </ListadoContainer>
    );
};