import { useState } from "react";
import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { Badge, Box, Wrap, HStack, Button } from "@chakra-ui/react";
import { FiUser, FiEdit2, FiTrash2, FiEye, FiCheckCircle, FiAward, FiPlus, FiFileText, FiCalendar } from "react-icons/fi";
import { AlertMessage, COLOR_ESTADO, DataTable, ETIQUETA_ESTADO, FiltroSelect, FiltrosBar, FiltroTexto, LoadingState, RowActionButton, RowActions, TablePagination } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Persona } from "./types";
import type { ColumnDef } from "../../components/ui";
import type { DocumentoPersonal } from "../documentosPersonal/types";

type FiltrosPersonal = {
    busqueda: string;
    documentoId: string;
    estado: string;
};

const FILTROS_INICIALES: FiltrosPersonal = { busqueda: "", documentoId: "", estado: "" };

const OPCIONES_ESTADO = [
    { label: "Con vencidos", value: "vencido" },
    { label: "Con próximos a vencer", value: "proximo" },
    { label: "Con vigentes", value: "vigente" },
];

// Arma el endpoint del listado: solo se mandan los filtros que tienen valor.
const construirEndpoint = (filtros: FiltrosPersonal) => {
    const params = new URLSearchParams();
    if (filtros.busqueda.trim()) params.set("busqueda", filtros.busqueda.trim());
    if (filtros.documentoId) params.set("documento_id", filtros.documentoId);
    if (filtros.estado) params.set("estado", filtros.estado);

    const query = params.toString();
    return `${BASE_URL}/personal/${query ? `?${query}` : ""}`;
};

interface ListadoPersonalProps {
    onCrear?: () => void;
    onModificar?: (persona: Persona) => void;
    onEliminar?: (persona: Persona) => void;
    onVer?: (persona: Persona) => void;
    onDarAlta?: (persona: Persona) => void;
    onVerCapacidades?: () => void;
    onVerDocumentos?: () => void;
    onRegistrarVencimiento?: (persona: Persona) => void;
}

export const ListadoPersonal = ({ onCrear, onModificar, onEliminar, onVer, onDarAlta, onVerCapacidades, onVerDocumentos, onRegistrarVencimiento }: ListadoPersonalProps) => {
    // Borrador: lo que el usuario está por aplicar. Aplicados: lo único que llega al endpoint.
    const [borrador, setBorrador] = useState<FiltrosPersonal>(FILTROS_INICIALES);
    const [aplicados, setAplicados] = useState<FiltrosPersonal>(FILTROS_INICIALES);

    const { data, loading, error, page, setPage, itemsPaginados } = useListadoData<Persona>({
        endpoint: construirEndpoint(aplicados),
        pageSize: ITEMS_POR_PAGINA,
        errorMessage: "No se pudo cargar la lista de personal.",
    });

    // Tipos de documento para el filtro por tipo de vencimiento
    const { data: documentos } = useListadoData<DocumentoPersonal>({
        endpoint: `${BASE_URL}/documentos-personal/`,
        errorMessage: "No se pudieron cargar los documentos.",
    });

    const hayFiltros = borrador.busqueda !== "" || borrador.documentoId !== "" || borrador.estado !== "";
    const hayAplicados = aplicados.busqueda !== "" || aplicados.documentoId !== "" || aplicados.estado !== "";

    // Cada aplicación vuelve a la primera página, para no caer en una página vacía.
    const aplicar = () => {
        setAplicados(borrador);
        setPage(1);
    };

    const limpiar = () => {
        setBorrador(FILTROS_INICIALES);
        setAplicados(FILTROS_INICIALES);
        setPage(1);
    };

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
            key: "vencimientos",
            label: "Vencimientos",
            render: (p) => {
                const vencimientos = p.vencimientos || [];
                if (vencimientos.length === 0) return <span style={{ color: "gray" }}>Ninguno</span>;
                return (
                    <Wrap gap={1}>
                        {vencimientos.map((v) => (
                            <Badge
                                key={v.id}
                                colorPalette={v.estado ? COLOR_ESTADO[v.estado] : "gray"}
                                title={v.estado ? ETIQUETA_ESTADO[v.estado] : undefined}
                            >
                                {v.documento.nombre}
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
                    <RowActionButton icon={FiCalendar} label="Registrar vencimiento" colorPalette="purple" onClick={() => onRegistrarVencimiento?.(p)} visible={p.activo} />
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
                    <Button variant="outline" colorPalette="green" onClick={onVerDocumentos}>
                        <FiFileText /> Documentos
                    </Button>
                    <Button colorPalette="green" onClick={onCrear}>
                        <FiPlus /> Nueva persona
                    </Button>
                </HStack>
            </HStack>

            <Box mb={4}>
                <FiltrosBar onAplicar={aplicar} onLimpiar={limpiar} hayFiltrosActivos={hayFiltros} loading={loading}>
                    <FiltroTexto
                        ariaLabel="Buscar persona"
                        placeholder="Nombre, apellido o DNI"
                        value={borrador.busqueda}
                        onChange={(valor) => setBorrador({ ...borrador, busqueda: valor })}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") aplicar();
                        }}
                    />
                    <FiltroSelect
                        ariaLabel="Tipo de vencimiento"
                        placeholder="Todos los documentos"
                        options={documentos.filter((d) => d.activo).map((d) => ({ label: d.nombre, value: String(d.id) }))}
                        value={borrador.documentoId}
                        onChange={(valor) => setBorrador({ ...borrador, documentoId: valor })}
                    />
                    <FiltroSelect
                        ariaLabel="Estado de los vencimientos"
                        placeholder="Todos los estados"
                        options={OPCIONES_ESTADO}
                        value={borrador.estado}
                        onChange={(valor) => setBorrador({ ...borrador, estado: valor })}
                    />
                </FiltrosBar>
            </Box>

            {loading && <LoadingState message="Cargando personal..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && data.length === 0 && (
                <AlertMessage type="info" message={hayAplicados ? "No hay personal que coincida con los filtros seleccionados." : "Todavía no hay personal cargado."} />
            )}
            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable items={itemsPaginados} columns={columnas} getRowKey={(p) => p.id} />
                    <TablePagination count={data.length} page={page} pageSize={ITEMS_POR_PAGINA} onPageChange={setPage} labelSingular="persona" labelPlural="personas" />
                </>
            )}
        </ListadoContainer>
    );
};