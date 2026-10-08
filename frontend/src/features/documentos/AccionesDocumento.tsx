import { useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiFileText,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";

import { RowActionButton, RowActions } from "../../components/ui";
import type { Documento } from "./types";

interface AccionesDocumentoProps {
  documento: Documento;
  onModificar?: (doc: Documento) => void;
  onEliminar?: (doc: Documento) => void;
  onDarAlta?: (doc: Documento) => void;
  onVer?: (doc: Documento) => void;
  onSubirVersion?: (doc: Documento) => void;
  onRegistrarRevision?: (doc: Documento) => void;
  onVerHistorial?: (doc: Documento) => void;
}

/**
 * Acciones de una fila del listado de documentos.
 *
 * Son muchas, así que se muestran en dos vistas que se reemplazan en el mismo
 * lugar de la fila: las principales (ver, modificar, baja/reactivar) y, al
 * tocar la flecha, las de versionado (historial, PDF, subir versión,
 * registrar revisión).
 */
export const AccionesDocumento = ({
  documento,
  onModificar,
  onEliminar,
  onDarAlta,
  onVer,
  onSubirVersion,
  onRegistrarRevision,
  onVerHistorial,
}: AccionesDocumentoProps) => {
  const [verVersionado, setVerVersionado] = useState(false);

  if (verVersionado) {
    return (
      <RowActions>
        <RowActionButton
          icon={FiCalendar}
          label="Registrar Revisión"
          title="Registrar revisión del documento"
          colorPalette="teal"
          onClick={() => onRegistrarRevision?.(documento)}
          visible={documento.activo && !!documento.version_vigente}
        />
        <RowActionButton
          icon={FiFileText}
          label="Ver PDF Actual"
          title="Ver el PDF de la versión vigente"
          colorPalette="orange"
          onClick={() => {
            const url = documento.version_vigente?.archivo_url;
            if (url) window.open(url, "_blank");
          }}
          visible={!!documento.version_vigente?.archivo_url}
        />
        <RowActionButton
          icon={FiUpload}
          label="Subir Nueva Versión"
          title="Subir una nueva versión del PDF"
          colorPalette="purple"
          onClick={() => onSubirVersion?.(documento)}
          visible={documento.activo}
        />
        <RowActionButton
          icon={FiClock}
          label="Historial de Versiones"
          title="Ver el historial de versiones"
          colorPalette="yellow"
          onClick={() => onVerHistorial?.(documento)}
        />
        <RowActionButton
          icon={FiChevronLeft}
          label="Volver"
          title="Volver a las acciones principales"
          colorPalette="gray"
          onClick={() => setVerVersionado(false)}
        />
      </RowActions>
    );
  }

  return (
    <RowActions>
      <RowActionButton
        icon={FiEdit2}
        label="Modificar"
        title="Modificar el documento"
        colorPalette="blue"
        onClick={() => onModificar?.(documento)}
        visible={documento.activo}
      />
      <RowActionButton
        icon={FiEye}
        label="Ver Detalle"
        title="Ver el detalle del documento"
        colorPalette="yellow"
        onClick={() => onVer?.(documento)}
      />
      <RowActionButton
        icon={FiTrash2}
        label="Baja"
        title="Dar de baja el documento"
        colorPalette="red"
        onClick={() => onEliminar?.(documento)}
        visible={documento.activo}
      />
      <RowActionButton
        icon={FiCheckCircle}
        label="Reactivar"
        title="Reactivar el documento"
        colorPalette="green"
        onClick={() => onDarAlta?.(documento)}
        visible={!documento.activo}
      />
      <RowActionButton
        icon={FiChevronRight}
        label="Más acciones"
        title="Ver acciones de versionado"
        colorPalette="gray"
        onClick={() => setVerVersionado(true)}
      />
    </RowActions>
  );
};
