import { BASE_URL } from "../config";
import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { apiFetch } from "../features/auth/apiFetch";
import { InsumoForm } from "../features/insumo/InsumoForm";
import { InsumoDetalle } from "../features/insumo/InsumoDetalle";
import { ListadoInsumos } from "../features/insumo/ListadoInsumo";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";
import { handleDelete } from "../features/insumo/hooks/useInsumoDelete";
import { useInsumoSubmit } from "../features/insumo/hooks/useInsumoSubmit";
import type { Insumo, LoteInsumo } from "../features/insumo/types";
import { LoteInsumoForm } from "../features/insumo/LoteInsumoForm";
import { ListadoLotesInsumo } from "../features/insumo/ListadoLotesInsumo";
import { LoteInsumoDetalle } from "../features/insumo/LoteInsumoDetalle";
import { InhabilitarLoteModal } from "../features/insumo/InhabilitarLoteModal";

type Vista = "listado" | "crear" | "modificar" | "ver" | "lotes";

export default function InsumoPage() {
  const navigate = useNavigate();
  const { insumoId } = useParams<{ insumoId?: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const editarId = searchParams.get("editarId");
  const origenState = location.state as {
    from?: string;
    padre?: { nombre: string; to: string };
  } | null;
  const from = origenState?.from;
  const padreOrigen = origenState?.padre;
  const [vista, setVista] = useState<Vista>("listado");
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(
    null,
  );

  useEffect(() => {
    if (!insumoId) {
      setVista((prev) => (prev === "lotes" ? "listado" : prev));
      return;
    }
    const idNum = Number(insumoId);
    if (!Number.isFinite(idNum) || insumoSeleccionado?.id === idNum) {
      setVista("lotes");
      return;
    }
    let activo = true;
    apiFetch(`${BASE_URL}/insumos/${idNum}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Insumo | null) => {
        if (activo && data) {
          setInsumoSeleccionado(data);
          setVista("lotes");
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [insumoId, insumoSeleccionado?.id]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insumoEliminar, setInsumoEliminar] = useState<Insumo | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [insumoAlta, setInsumoAlta] = useState<Insumo | null>(null);
  const [altaAbierto, setAltaAbierto] = useState(false);
  const [refescar, setRefrescar] = useState(0);
  const [insumoLote, setInsumoLote] = useState<Insumo | null>(null);
  const [loteVer, setLoteVer] = useState<LoteInsumo | null>(null);
  const [loteInhabilitar, setLoteInhabilitar] = useState<LoteInsumo | null>(
    null,
  );

  useEffect(() => {
    if (!editarId) return;
    let activo = true;
    apiFetch(`${BASE_URL}/insumos/${editarId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Insumo | null) => {
        if (activo && data) {
          setInsumoSeleccionado(data);
          setVista("modificar");
        }
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, [editarId]);

  const cerrarModalForm = () => {
    setError("");
    setVista("listado");
    if (searchParams.get("editarId")) {
      searchParams.delete("editarId");
      setSearchParams(searchParams, { replace: true, state: location.state });
    }
  };
  const confirmarEliminar = () => {
    handleDelete({
      insumo: insumoEliminar,
      setLoading,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setInsumoEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  const reactivar = useInsumoSubmit({
    endpoint: `${BASE_URL}/insumos/`,
    method: "PUT",
    id: insumoAlta?.id,
    body: { disponible: true },
    onSuccess: () => {
      setAltaAbierto(false);
      setInsumoAlta(null);
      setRefrescar((r) => r + 1);
    },
  });

  const confirmarAlta = async () => {
    if (!insumoAlta) return;
    setError("");
    const res = await reactivar.submit();
    if (res.status === "error") {
      setError(res.message);
    }
  };

  return (
    <>
      {/* Listado de insumos: se oculta mientras se miran los lotes de uno. */}
      {!insumoId && vista !== "lotes" && (
        <ListadoInsumos
          key={refescar}
          onVerAlimentosReferencia={() =>
            navigate("/alimentos-referencia", {
              state: { from: "/insumos", label: "Insumos" },
            })
          }
          onVerUnidades={() =>
            navigate("/unidades-de-medida", {
              state: { from: "/insumos", label: "Insumos" },
            })
          }
          onCrear={() => {
            setError("");
            setVista("crear");
          }}
          onModificar={(insumo) => {
            setError("");
            setInsumoSeleccionado(insumo);
            setVista("modificar");
          }}
          onEliminar={(insumo) => {
            setError("");
            setInsumoEliminar(insumo);
            setEliminarAbierto(true);
          }}
          onVer={(insumo) => {
            setError("");
            setInsumoSeleccionado(insumo);
            setVista("ver");
          }}
          onDarAlta={(insumo) => {
            setError("");
            setInsumoAlta(insumo);
            setAltaAbierto(true);
          }}
          onVerLotes={(insumo) => {
            setError("");
            setInsumoSeleccionado(insumo);
            navigate(`/insumos/${insumo.id}/lotes`);
          }}
        />
      )}

      {/* Lotes del insumo seleccionado, con el botón para registrar otro lote. */}
      {(insumoId || vista === "lotes") && insumoSeleccionado && (
        <ListadoLotesInsumo
          insumo={insumoSeleccionado}
          refreshKey={refescar}
          onVolver={() => {
            setVista("listado");
            navigate("/insumos");
          }}
          onNuevoLote={() => {
            setError("");
            setInsumoLote(insumoSeleccionado);
          }}
          onVerLote={(lote) => setLoteVer(lote)}
          onInhabilitarLote={(lote) => setLoteInhabilitar(lote)}
        />
      )}
      {vista === "ver" && insumoSeleccionado && (
        <InsumoDetalle
          insumo={insumoSeleccionado}
          onCerrar={() => setVista("listado")}
        />
      )}

      {(vista === "crear" || vista === "modificar") && (
        <FormModal open onClose={cerrarModalForm}>
          {vista === "crear" && (
            <InsumoForm
              modo='crear'
              onCancelar={cerrarModalForm}
              onGuardado={() => {
                cerrarModalForm();
                setRefrescar((r) => r + 1);
              }}
              enModal
            />
          )}

          {vista === "modificar" && insumoSeleccionado && (
            <InsumoForm
              modo='modificar'
              insumo={insumoSeleccionado}
              onCancelar={cerrarModalForm}
              onGuardado={() => {
                cerrarModalForm();
                if (from) {
                  navigate(
                    from,
                    padreOrigen
                      ? { state: { from: padreOrigen.to, label: padreOrigen.nombre } }
                      : undefined,
                  );
                } else {
                  setRefrescar((r) => r + 1);
                }
              }}
              enModal
            />
          )}
        </FormModal>
      )}

      {/* Alta de lote: se abre encima del listado de lotes y lo recarga al guardar. */}
      {insumoLote && (
        <FormModal open onClose={() => setInsumoLote(null)}>
          <LoteInsumoForm
            insumo={insumoLote}
            onCancelar={() => setInsumoLote(null)}
            onGuardado={() => {
              setInsumoLote(null);
              setRefrescar((r) => r + 1);
            }}
            enModal
          />
        </FormModal>
      )}

      {/* Detalle de un lote, con la sección de inhabilitación si corresponde. */}
      {loteVer && insumoSeleccionado && (
        <LoteInsumoDetalle
          lote={loteVer}
          insumo={insumoSeleccionado}
          onCerrar={() => setLoteVer(null)}
        />
      )}

      {/* Inhabilitar un lote: pide el motivo y recarga el listado al confirmar. */}
      {loteInhabilitar && insumoSeleccionado && (
        <InhabilitarLoteModal
          lote={loteInhabilitar}
          insumo={insumoSeleccionado}
          onCancelar={() => setLoteInhabilitar(null)}
          onInhabilitado={() => {
            setLoteInhabilitar(null);
            setRefrescar((r) => r + 1);
          }}
        />
      )}

      <AlertDelete
        open={eliminarAbierto}
        name={insumoEliminar?.nombre ?? null}
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
        message={`¿Esta seguro que quiere dar de alta a ${insumoAlta?.nombre}?`}
        loading={reactivar.isSubmitting}
        error={error}
        onConfirm={confirmarAlta}
        onCancel={() => {
          setAltaAbierto(false);
          setError("");
        }}
      />
    </>
  );
}