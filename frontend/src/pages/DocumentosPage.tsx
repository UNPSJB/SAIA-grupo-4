import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import { ListadoDocumentos } from "../features/documentos/ListadoDocumentos";
import { DocumentoForm } from "../features/documentos/DocumentoForm";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";

import { handleDelete } from "../features/documentos/hooks/useDocumentoDelete";
import { useDocumentoSubmit } from "../features/documentos/hooks/useDocumentoSubmit";
import type { Documento } from "../features/documentos/types";

import { SubirVersionModal } from "../features/documentos/components/SubirVersionModal";
import { RegistrarRevisionModal } from "../features/documentos/components/RegistrarRevisionModal";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function DocumentosPage() {
  const navigate = useNavigate();

  // Estados de navegación y selección principal
  const [vista, setVista] = useState<Vista>("listado");
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | undefined>(undefined);
  const [refrescar, setRefrescar] = useState(0);
  const [error, setError] = useState("");

  // Estados para modales de confirmación (Baja y Reactivación)
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [documentoEliminar, setDocumentoEliminar] = useState<Documento | null>(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);

  const [altaAbierto, setAltaAbierto] = useState(false);
  const [documentoAlta, setDocumentoAlta] = useState<Documento | null>(null);

  // Estados para modales secundarios de versionado 
  const [versionModalAbierto, setVersionModalAbierto] = useState(false);
  const [revisionModalAbierto, setRevisionModalAbierto] = useState(false);

  const reactivar = useDocumentoSubmit({
    endpoint: "http://127.0.0.1:8000/documentos/",
    method: "PATCH",
    id: documentoAlta?.id,
    body: { activo: true },
    onSuccess: () => {
      setAltaAbierto(false);
      setDocumentoAlta(null);
      setRefrescar((r) => r + 1);
    },
  });

  const confirmarEliminacion = async () => {
    await handleDelete({
      documento: documentoEliminar,
      setLoading: setLoadingEliminar,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setDocumentoEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  const confirmarAlta = async () => {
    if (!documentoAlta) return;
    setError("");
    const res = await reactivar.submit();
    if (res.status === "error") setError(res.message);
  };

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      <ListadoDocumentos
        key={refrescar} // Fuerza el re-fetch cuando cambia
        onCrear={() => {
          setDocumentoSeleccionado(undefined);
          setVista("crear");
        }}
        onModificar={(doc) => {
          setError("");
          setDocumentoSeleccionado(doc);
          setVista("modificar");
        }}
        onVer={(doc) => {
          setError("");
          setDocumentoSeleccionado(doc);
          setVista("ver");
        }}
        onEliminar={(doc) => {
          setError("");
          setDocumentoEliminar(doc);
          setEliminarAbierto(true);
        }}
        onDarAlta={(doc) => {
          setError("");
          setDocumentoAlta(doc);
          setAltaAbierto(true);
        }}
        // Navegamos al historial usando react-router-dom
        onVerHistorial={(doc) => navigate(`/documentos/${doc.id}/historial`)}
        
        onSubirVersion={(doc) => {
          setError("");
          setDocumentoSeleccionado(doc);
          setVersionModalAbierto(true);
        }}
        onRegistrarRevision={(doc) => {
          setError("");
          setDocumentoSeleccionado(doc);
          setRevisionModalAbierto(true);
        }}
      />

      {/* MODAL PRINCIPAL: Alta y Edición de Carátula */}
      {(vista === "crear" || vista === "modificar" || vista === "ver") && (
        <FormModal
          open
          onClose={() => {
            setError("");
            setVista("listado");
          }}
        >
          <DocumentoForm
            modo={vista}
            documento={documentoSeleccionado}
            enModal={true}
            onCancelar={() => {
              setError("");
              setVista("listado");
            }}
            onGuardado={() => {
              setVista("listado");
              setRefrescar((r) => r + 1);
            }}
          />
        </FormModal>
      )}

      {/* ALERTAS DE CONFIRMACIÓN */}
      <AlertDelete
        open={eliminarAbierto}
        onCancel={() => setEliminarAbierto(false)}
        onConfirm={confirmarEliminacion}
        title="Dar de baja Documento"
        name={documentoEliminar?.titulo || "el documento"} // AlertDelete espera un 'name'
        loading={loadingEliminar}
        error={error}
      />

      <AlertConfirm
        open={altaAbierto}
        onCancel={() => setAltaAbierto(false)}
        onConfirm={confirmarAlta}
        title="Reactivar Documento"
        message={`¿Estás seguro de que deseas volver a activar el documento "${documentoAlta?.titulo}"?`} // AlertConfirm espera un 'message'
        loading={reactivar.isSubmitting}
        error={error}
      />

      {/* MODALES SECUNDARIOS: SubirVersionModal y RegistrarRevisionModal.
          Se desmontan al cerrar, así cada apertura arranca con el formulario limpio. */}
      {versionModalAbierto && documentoSeleccionado && (
        <SubirVersionModal
          open
          documento={documentoSeleccionado}
          onClose={() => setVersionModalAbierto(false)}
          onExito={() => {
            setVersionModalAbierto(false);
            setRefrescar((r) => r + 1);
          }}
        />
      )}

      {revisionModalAbierto && documentoSeleccionado && (
        <RegistrarRevisionModal
          open
          documento={documentoSeleccionado}
          onClose={() => setRevisionModalAbierto(false)}
          onExito={() => {
            setRevisionModalAbierto(false);
            setRefrescar((r) => r + 1);
          }}
        />
      )}
      
    </Box>
  );
}