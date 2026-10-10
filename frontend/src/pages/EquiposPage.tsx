import { BASE_URL } from "../config";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { apiFetch } from "../features/auth/apiFetch";
import { useRenovacion } from "../features/vencimientos/hooks/useRenovacion";
import { EquipoForm } from "../features/equipos/EquipoForm";
import { EquipoDetalle } from "../features/equipos/EquipoDetalle";
import { ListadoEquipos } from "../features/equipos/ListadoEquipo";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";
import { handleDelete } from "../features/equipos/hooks/useEquipoDelete";
import { useEquipoSubmit } from "../features/equipos/hooks/useEquipoSubmit";
import type { Equipo } from "../features/equipos/types";
import {RegistrarCalibracionModal} from "../features/equipos/RegistrarCalibracionModal";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function EquiposPage() {
  const [vista, setVista] = useState<Vista>("listado");
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // La campana de notificaciones llega aca con `?detalle=<id>` (ruta_detalle de
  // la fila consolidada): el parametro abre el detalle del equipo, igual que
  // hace ElementosLimpiezaPage con los elementos de limpieza.
  const [searchParams, setSearchParams] = useSearchParams();
  const detalleParam = searchParams.get("detalle");

  // Registrar una calibracion aca tambien baja el badge de la campana, porque
  // no hay navegacion por el tablero que dispare su refresco.
  const { notificarGuardado } = useRenovacion();

  useEffect(() => {
    if (!detalleParam) return;
    let activo = true;

    apiFetch(`${BASE_URL}/equipos/${detalleParam}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((equipo: Equipo) => {
        if (!activo) return;
        setError("");
        setEquipoSeleccionado(equipo);
        setVista("ver");
      })
      .catch(() => {
        if (activo) setError("No se pudo cargar el equipo.");
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

  const [equipoEliminar, setEquipoEliminar] = useState<Equipo | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);

  const [equipoAlta, setEquipoAlta] = useState<Equipo | null>(null);
  const [altaAbierto, setAltaAbierto] = useState(false);

  const [refrescar, setRefrescar] = useState(0);

  const [equipoCalibrar, setEquipoCalibrar] = useState<Equipo | null>(null);
  const [calibracionAbierta, setCalibracionAbierta] = useState(false);

  const confirmarEliminar = () => {
    handleDelete({
      equipo: equipoEliminar,
      setLoading,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setEquipoEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  const reactivar = useEquipoSubmit({
    endpoint: `${BASE_URL}/equipos/`,
    method: "PUT",
    id: equipoAlta?.id,
    body: { activo: true },
    onSuccess: () => {
      setAltaAbierto(false);
      setEquipoAlta(null);
      setRefrescar((r) => r + 1);
    },
  });

  const confirmarAlta = async () => {
    if (!equipoAlta) return;
    setError("");
    const res = await reactivar.submit();
    if (res.status === "error") {
      setError(res.message);
    }
  };

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      <ListadoEquipos
        key={refrescar}
        onCrear={() => setVista("crear")}
        onModificar={(equipo) => {
          setError("");
          setEquipoSeleccionado(equipo);
          setVista("modificar");
        }}
        onEliminar={(equipo) => {
          setError("");
          setEquipoEliminar(equipo);
          setEliminarAbierto(true);
        }}
        onVer={(equipo) => {
          setError("");
          setEquipoSeleccionado(equipo);
          setVista("ver");
        }}
        onDarAlta={(equipo) => {
          setError("");
          setEquipoAlta(equipo);
          setAltaAbierto(true);
        }}
        onRegistrarCalibracion={(equipo) => {
        setError("");
        setEquipoCalibrar(equipo);
        setCalibracionAbierta(true);
    }}
      />

      {vista === "ver" && equipoSeleccionado && (
        <EquipoDetalle
          equipo={equipoSeleccionado}
          onCerrar={() => {
            setVista("listado");
            limpiarDetalleParam();
          }}
        />
      )}

      {(vista === "crear" || vista === "modificar") && (
        <FormModal
          open
          onClose={() => {
            setError("");
            setVista("listado");
          }}
        >
          {vista === "crear" && (
            <EquipoForm
              modo='crear'
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
              enModal
            />
          )}

          {vista === "modificar" && equipoSeleccionado && (
            <EquipoForm
              modo='modificar'
              equipo={equipoSeleccionado}
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
              enModal
            />
          )}
        </FormModal>
      )}

      <AlertDelete
        open={eliminarAbierto}
        name={equipoEliminar?.nombre ?? null}
        loading={loading}
        error={error}
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setEliminarAbierto(false);
          setError("");
        }}
      />

      <AlertConfirm
        open={altaAbierto}
        title='Dar de Alta'
        message={`¿Estás seguro que querés dar de alta el equipo ${equipoAlta?.nombre}?`}
        loading={reactivar.isSubmitting}
        error={error}
        onConfirm={confirmarAlta}
        onCancel={() => {
          setAltaAbierto(false);
          setError("");
        }}
      />
      <RegistrarCalibracionModal
        isOpen={calibracionAbierta}
        equipo={equipoCalibrar}
        onClose={() => {
        setCalibracionAbierta(false);
        setEquipoCalibrar(null);
        }}
        onSuccess={() => {
          setRefrescar((r) => r + 1); // Recarga la grilla
          notificarGuardado();
      }}
  />
    </Box>
  );
}
