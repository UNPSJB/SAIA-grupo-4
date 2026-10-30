import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  Field,
  HStack,
  Input,
  Portal,
  Text,
  VStack,
  Alert,
} from "@chakra-ui/react";
import { FiPackage } from "react-icons/fi";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import {
  DataTable,
  LoadingState,
  TablePagination,
  AlertMessage,
  type ColumnDef,
} from "../components/ui";
import { getProductos, createProducto } from "../features/productos/productosService";
import type { Producto } from "../features/productos/types";

const ITEMS_POR_PAGINA = 5;

export const ProductosPage = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [nombreNuevo, setNombreNuevo] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorModal, setErrorModal] = useState<string>("");

  const cargarProductos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProductos();
      setProductos(data);
    } catch {
      setError("No se pudo cargar la lista de productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleCrearProducto = async () => {
    if (!nombreNuevo.trim()) {
      setErrorModal("El nombre del producto es obligatorio.");
      return;
    }
    setGuardando(true);
    setErrorModal("");
    try {
      await createProducto({ nombre: nombreNuevo.trim() });
      setNombreNuevo("");
      setOpenModal(false);
      await cargarProductos();
    } catch (err: any) {
      if (err instanceof Error) {
        setErrorModal(err.message);
      } else {
        setErrorModal("Ya existe un producto con ese nombre o hubo un error.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const columnas: ColumnDef<Producto>[] = [
    {
      key: "id",
      label: "ID",
      w: "100px",
      render: (prod) => <Badge colorPalette="green">#{prod.id}</Badge>,
    },
    {
      key: "nombre",
      label: "Nombre",
      render: (prod) => prod.nombre,
    },
    {
      key: "estado",
      label: "Estado",
      w: "140px",
      render: (prod) => (
        <Badge colorPalette={prod.activo ? "green" : "red"}>
          {prod.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  const inicio = (page - 1) * ITEMS_POR_PAGINA;
  const itemsPaginados = productos.slice(inicio, inicio + ITEMS_POR_PAGINA);

  return (
    <ListadoContainer>
      <ListadoHeader
        title="Maestro de Productos"
        icon={FiPackage}
        buttonLabel="Nuevo Producto"
        onCrear={() => {
          setErrorModal("");
          setNombreNuevo("");
          setOpenModal(true);
        }}
      />

      {loading ? (
        <LoadingState message="Cargando productos..." />
      ) : error ? (
        <AlertMessage type="error" message={error} />
      ) : productos.length === 0 ? (
        <Text color="gray.500">No hay productos registrados aún.</Text>
      ) : (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(prod) => prod.id}
          />
          <TablePagination
            count={productos.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular="producto"
            labelPlural="productos"
          />
        </>
      )}

      {/* Modal para Crear Nuevo Producto */}
      <Dialog.Root
        open={openModal}
        onOpenChange={(e) => !e.open && setOpenModal(false)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Crear Nuevo Producto</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Nombre del Producto</Field.Label>
                    <Input
                      placeholder="Ej: Harina 0000"
                      value={nombreNuevo}
                      onChange={(e) => setNombreNuevo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleCrearProducto();
                        }
                        }}
                    />
                  </Field.Root>
                  {errorModal && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Title>{errorModal}</Alert.Title>
                    </Alert.Root>
                  )}
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack gap={2}>
                  <Button
                    variant="outline"
                    colorPalette="red"
                    onClick={() => setOpenModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    colorPalette="green"
                    onClick={handleCrearProducto}
                    loading={guardando}
                  >
                    Guardar Producto
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </ListadoContainer>
  );
};