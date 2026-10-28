import { useState, useEffect } from 'react';
import { 
  Box, Button, Input, VStack, Heading, Field, 
  NativeSelectRoot, NativeSelectField, HStack, Text, Alert, Dialog, Portal 
} from '@chakra-ui/react';
import { FiSave, FiXCircle, FiPlus, FiBox } from 'react-icons/fi';
import { getProductos, createProducto } from '../productos/productosService';
import { createLote } from './lotesService';
import type { Producto } from '../productos/types';

interface RegistrarLoteFormProps {
  onSuccess?: () => void;
  onCancelar?: () => void;
}

export const RegistrarLoteForm = ({ onSuccess, onCancelar }: RegistrarLoteFormProps) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]); // Fecha de hoy por defecto
  const [cantidad, setCantidad] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const [openNuevoProducto, setOpenNuevoProducto] = useState(false);
  const [nuevoNombreProducto, setNuevoNombreProducto] = useState('');
  const [loadingProducto, setLoadingProducto] = useState(false);
  const [errorProducto, setErrorProducto] = useState('');

  const cargarProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch {
      setError('No se pudieron cargar los productos');
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // Handler para crear producto rápido
  const handleCrearProducto = async () => {
    if (!nuevoNombreProducto.trim()) {
      setErrorProducto('Ingrese un nombre válido para el producto');
      return;
    }
    setLoadingProducto(true);
    setErrorProducto('');
    try {
      const prodNuevo = await createProducto({ nombre: nuevoNombreProducto.trim() });
      await cargarProductos();
      setProductoId(prodNuevo.id.toString()); // Seleccionar automáticamente el recién creado
      setNuevoNombreProducto('');
      setOpenNuevoProducto(false);
    } catch (err: any) {
      setErrorProducto('Ya existe un producto con ese nombre o hubo un error.');
    } finally {
      setLoadingProducto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!productoId) {
      setError('Seleccione un producto.');
      return;
    }
    if (!fecha) {
      setError('Ingrese una fecha válida.');
      return;
    }
    const cantNum = parseFloat(cantidad);
    if (isNaN(cantNum) || cantNum <= 0) {
      setError('La cantidad producida debe ser mayor a cero.');
      return;
    }

    setLoading(true);
    try {
      await createLote({
        producto_id: parseInt(productoId, 10),
        fecha,
        cantidad: cantNum
      });

      setSuccessMsg('¡Lote de producción registrado con éxito!');
      setCantidad('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError('Error al registrar el lote. Verifique los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="xl" mx="auto" p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
      <Heading size="xl" mb={6} textAlign="left" color="green.700">
        <FiBox style={{ display: 'inline', marginRight: 8 }} />
        Registrar Lote de Producción
      </Heading>

      <form onSubmit={handleSubmit}>
        <VStack gap={4} align="stretch">
          <Field.Root>
            <Field.Label fontWeight="bold">Producto</Field.Label>
            <HStack>
              <NativeSelectRoot flex={1}>
                <NativeSelectField
                  placeholder="Seleccione un producto"
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </NativeSelectField>
              </NativeSelectRoot>
              <Button 
                variant="outline" 
                colorPalette="blue" 
                onClick={() => setOpenNuevoProducto(true)}
                type="button"
              >
                <FiPlus /> Nuevo
              </Button>
            </HStack>
          </Field.Root>

          <Field.Root>
            <Field.Label fontWeight="bold">Fecha de Producción</Field.Label>
            <Input 
              type="date" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)} 
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontWeight="bold">Cantidad Producida</Field.Label>
            <Input 
              type="number" 
              step="any"
              placeholder="Ej: 100.5" 
              value={cantidad} 
              onChange={(e) => setCantidad(e.target.value)} 
            />
          </Field.Root>

          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}

          {successMsg && (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Title>{successMsg}</Alert.Title>
            </Alert.Root>
          )}

          <HStack justify="flex-end" mt={4}>
            {onCancelar && (
              <Button variant="outline" colorPalette="red" onClick={onCancelar} type="button">
                <FiXCircle /> Cancelar
              </Button>
            )}
            <Button loading={loading} loadingText="Guardando..." type="submit" colorPalette="green">
              <FiSave /> Guardar Lote
            </Button>
          </HStack>
        </VStack>
      </form>

      {/* Modal para alta rápida de Producto */}
      <Dialog.Root open={openNuevoProducto} onOpenChange={(e) => !e.open && setOpenNuevoProducto(false)}>
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
                      placeholder="Ej: Pan Francés" 
                      value={nuevoNombreProducto} 
                      onChange={(e) => setNuevoNombreProducto(e.target.value)} 
                    />
                  </Field.Root>
                  {errorProducto && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Title>{errorProducto}</Alert.Title>
                    </Alert.Root>
                  )}
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack gap={2}>
                  <Button variant="outline" onClick={() => setOpenNuevoProducto(false)}>Cancelar</Button>
                  <Button colorPalette="blue" onClick={handleCrearProducto} loading={loadingProducto}>
                    Guardar Producto
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
};