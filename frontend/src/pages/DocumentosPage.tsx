import { useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ListadoDocumentos } from "../features/documentos/ListadoDocumentos";
import { DocumentoForm } from "../features/documentos/DocumentoForm";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";
import { BASE_URL } from "../config";
import { apiFetch } from "../features/auth/apiFetch";
import { useRenovacion } from "../features/vencimientos/hooks/useRenovacion";

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

  // La campana de notificaciones llega aca con `?detalle=<id>` (ruta_detalle de
  // la fila consolidada): el parametro abre el detalle del documento, igual que
  // hace EquiposPage con los equipos.
  const [searchParams, setSearchParams] = useSearchParams();
  const detalleParam = searchParams.get("detalle");

  // Registrar una revisión o subir una versión desde acá también baja el badge
  // de la campana: no hay navegación por el tablero que dispare su refresco.
  const { notificarGuardado } = useRenovacion();

  useEffect(() => {
    if (!detalleParam) return;
    let activo = true;

    apiFetch(`${BASE_URL}/documentos/${detalleParam}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((documento: Documento) => {
        if (!activo) return;
        setError("");
        setDocumentoSeleccionado(documento);
        setVista("ver");
      })
      .catch(() => {
        if (activo) setError("No se pudo cargar el documento.");
      });

    return () => {
      activo = false;
    };
  }, [detalleParam]);

  // Limpia el parametro al cerrar el detalle. Sin esto, volver a la pagina
  // reabriria el modal otra vez.
  const limpiarDetalleParam = () => {
    if (!searchParams.get("detalle")) return;
    searchParams.delete("detalle");
    setSearchParams(searchParams, { replace: true });
  };

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
    endpoint: `${BASE_URL}/documentos/`,
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
            limpiarDetalleParam();
          }}
        >
          <DocumentoForm
            modo={vista}
            documento={documentoSeleccionado}
            enModal={true}
            onCancelar={() => {
              setError("");
              setVista("listado");
              limpiarDetalleParam();
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
            notificarGuardado();
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
            notificarGuardado();
          }}
        />
      )}
      
    </Box>
  );
}