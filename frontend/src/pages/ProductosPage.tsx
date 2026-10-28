import { BASE_URL } from "../config";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { ProductoForm } from "../features/productos/ProductosForm";
import { ProductoDetalle } from "../features/productos/ProductosDetalle";
import { ListadoProductos } from "../features/productos/ListadoProductos";
import { AlertDelete, AlertConfirm, FormModal } from "../components/ui";
import { handleDelete } from "../features/productos/hooks/useProductoDelete";
import { useProductoSubmit } from "../features/productos/hooks/useProductoSubmit";
import type { Producto } from "../features/productos/types";

type Vista = "listado" | "crear" | "modificar" | "ver";

export default function ProductosPage() {
  const navigate = useNavigate();
  const [vista, setVista] = useState<Vista>("listado");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productoEliminar, setProductoEliminar] = useState<Producto | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [productoAlta, setProductoAlta] = useState<Producto | null>(null);
  const [altaAbierto, setAltaAbierto] = useState(false);
  const [refescar, setRefrescar] = useState(0);
  const confirmarEliminar = () => {
    handleDelete({
      producto: productoEliminar,
      setLoading,
      setError,
      onSuccess: () => {
        setEliminarAbierto(false);
        setProductoEliminar(null);
        setRefrescar((r) => r + 1);
      },
    });
  };

  const reactivar = useProductoSubmit({
    endpoint: `${BASE_URL}/productos/`,
    method: "PUT",
    id: productoAlta?.id,
    body: { activo: true },
    onSuccess: () => {
      setAltaAbierto(false);
      setProductoAlta(null);
      setRefrescar((r) => r + 1);
    },
  });

  const confirmarAlta = async () => {
    if (!productoAlta) return;
    setError("");
    const res = await reactivar.submit();
    if (res.status === "error") {
      setError(res.message);
    }
  };

  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      <ListadoProductos 
        key={refescar}
        onVerUnidades={() =>
          navigate("/unidades-de-medida", {
            state: { from: "/productos", label: "Productos" },
          })
        }
        onCrear={() => {
          setError("");
          setVista("crear");
        }}
        onModificar={(p) => {
          setError("");
          setProductoSeleccionado(p);
          setVista("modificar");
        }}
        onEliminar={(p) => {
          setError("");
          setProductoEliminar(p);
          setEliminarAbierto(true);
        }}
        onVer={(p) => {
          setError("");
          setProductoSeleccionado(p);
          setVista("ver");
        }}
        onDarAlta={(p) => {
          setError("");
          setProductoAlta(p);
          setAltaAbierto(true);
        }}
      />
      {vista === "ver" && productoSeleccionado && (
        <ProductoDetalle
          producto={productoSeleccionado}
          onCerrar={() => setVista("listado")}
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
            <ProductoForm
              modo='crear'
              onCancelar={() => setVista("listado")}
              onGuardado={() => {
                setVista("listado");
                setRefrescar((r) => r + 1);
              }}
              enModal
            />
          )}

          {vista === "modificar" && productoSeleccionado && (
            <ProductoForm
              modo='modificar'
              producto={productoSeleccionado}
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
        name={productoEliminar?.nombre ?? null}
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
        message={`¿Esta seguro que quiere dar de alta a ${productoAlta?.nombre}?`}
        loading={reactivar.isSubmitting}
        error={error}
        onConfirm={confirmarAlta}
        onCancel={() => {
          setAltaAbierto(false);
          setError("");
        }}
      />
    </Box>
  );
}