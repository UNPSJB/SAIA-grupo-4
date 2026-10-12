import { Badge } from "@chakra-ui/react";
import { FiFileText, FiEdit2, FiTrash2, FiCheckCircle } from "react-icons/fi";
import { AlertMessage, DataTable, LoadingState, RowActionButton, RowActions, TablePagination } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { DocumentoPersonal } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoDocumentosPersonalProps {
    onCrear?: () => void;
    onModificar?: (documento: DocumentoPersonal) => void;
    onEliminar?: (documento: DocumentoPersonal) => void;
    onDarAlta?: (documento: DocumentoPersonal) => void;
}

export const ListadoDocumentosPersonal = ({ onCrear, onModificar, onEliminar, onDarAlta }: ListadoDocumentosPersonalProps) => {
    const { data, loading, error, page, setPage, itemsPaginados } = useListadoData<DocumentoPersonal>({
        endpoint: "http://127.0.0.1:8000/documentos-personal/",
        pageSize: 5,
        errorMessage: "No se pudo cargar la lista de documentos.",
    });

    const columnas: ColumnDef<DocumentoPersonal>[] = [
        { key: "nombre", label: "Nombre", render: (doc) => doc.nombre },
        { key: "vigencia_dias", label: "Vigencia", render: (doc) => `${doc.vigencia_dias} días` },
        {
            key: "activo",
            label: "Estado",
            render: (doc) => (
                <Badge colorPalette={doc.activo ? "green" : "red"}>
                    {doc.activo ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            key: "acciones",
            label: "Acciones",
            align: "end",
            render: (doc) => (
                <RowActions>
                    <RowActionButton icon={FiEdit2} label="Modificar" colorPalette="blue" onClick={() => onModificar?.(doc)} visible={doc.activo} />
                    <RowActionButton icon={FiTrash2} label="Eliminar" colorPalette="red" onClick={() => onEliminar?.(doc)} visible={doc.activo} />
                    <RowActionButton icon={FiCheckCircle} label="Dar de alta" colorPalette="green" onClick={() => onDarAlta?.(doc)} visible={!doc.activo} />
                </RowActions>
            ),
        },
    ];

    return (
        <ListadoContainer>
            <ListadoHeader title="Documentos de personal" icon={FiFileText} buttonLabel="Nuevo documento" onCrear={onCrear} />
            {loading && <LoadingState message="Cargando documentos..." />}
            {!loading && error && <AlertMessage type="error" message={error} />}
            {!loading && !error && data.length === 0 && <AlertMessage type="info" message="Todavía no hay documentos cargados." />}
            {!loading && !error && data.length > 0 && (
                <>
                    <DataTable items={itemsPaginados} columns={columnas} getRowKey={(doc) => doc.id} />
                    <TablePagination count={data.length} page={page} pageSize={5} onPageChange={setPage} labelSingular="documento" labelPlural="documentos" />
                </>
            )}
        </ListadoContainer>
    );
};
