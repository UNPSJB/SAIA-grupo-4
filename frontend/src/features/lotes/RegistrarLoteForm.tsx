import { useState, useEffect } from 'react';
import { 
  Box, Button, Input, VStack, Heading, Field, 
  NativeSelectRoot, NativeSelectField, HStack, Text, Alert, Dialog, Portal, IconButton 
} from '@chakra-ui/react';
import { FiSave, FiXCircle, FiPlus, FiBox, FiTrash2 } from 'react-icons/fi';
import { getProductos, createProducto } from '../productos/productosService';
import { createLote, asociarInsumosALote } from './lotesService';
import { useInsumos } from '../insumo/hooks/useInsumos';
import type { Producto } from '../productos/types';

interface RegistrarLoteFormProps {
  onSuccess?: () => void;
  onCancelar?: () => void;
  onLoteCreado?:() => void;
}

interface InsumoSeleccionado {
  insumo_id: string;
  cantidad: string;
}

export const RegistrarLoteForm = ({ onSuccess, onCancelar, onLoteCreado }: RegistrarLoteFormProps) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cantidad, setCantidad] = useState<string>('');

  // Estados para insumos asociados
  const { insumos: insumosMaestro } = useInsumos();
  const [insumosSeleccionados, setInsumosSeleccionados] = useState<InsumoSeleccionado[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Estado para el modal de "Crear Producto Nuevo"
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
      setProductoId(prodNuevo.id.toString());
      setNuevoNombreProducto('');
      setOpenNuevoProducto(false);
    } catch (err: any) {
      setErrorProducto(err.message || 'Ya existe un producto con ese nombre.');
    } finally {
      setLoadingProducto(false);
    }
  };

  const agregarInsumoFila = () => {
    setInsumosSeleccionados([...insumosSeleccionados, { insumo_id: '', cantidad: '' }]);
  };

  const eliminarInsumoFila = (index: number) => {
    const nuevos = insumosSeleccionados.filter((_, i) => i !== index);
    setInsumosSeleccionados(nuevos);
  };

  const actualizarInsumoFila = (index: number, campo: keyof InsumoSeleccionado, valor: string) => {
    const nuevos = [...insumosSeleccionados];
    nuevos[index][campo] = valor;
    setInsumosSeleccionados(nuevos);
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
      // 1. Crear el lote principal
      const loteCreado = await createLote({
        producto_id: parseInt(productoId, 10),
        fecha,
        cantidad: cantNum
      });

      // 2. Si hay insumos seleccionados, asociarlos
      if (insumosSeleccionados.length > 0) {
        const payloadInsumos = insumosSeleccionados.map((item) => ({
          insumo_id: parseInt(item.insumo_id, 10),
          cantidad: parseFloat(item.cantidad)
        }));

        await asociarInsumosALote(loteCreado.id, { insumos: payloadInsumos });
      }

      setSuccessMsg('¡Lote registrado y con insumos asociados con éxito!');
      setCantidad('');
      setInsumosSeleccionados([]);
      if (onSuccess) onSuccess();
      if (onLoteCreado) onLoteCreado();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el lote o asociar insumos.');
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

          {/* Sección de Insumos Asociados */}
          <Box borderTopWidth="1px" pt={3} mt={1}>
            <HStack justify="space-between" mb={3}>
              <Text fontWeight="bold" color="gray.700">Insumos Utilizados (Opcional)</Text>
              <Button size="sm" colorPalette="teal" variant="outline" onClick={agregarInsumoFila} type="button">
                <FiPlus /> Agregar Insumo
              </Button>
            </HStack>

            {insumosSeleccionados.map((item, index) => (
              <HStack key={index} mb={2} align="flex-end">
                <Field.Root flex={2}>
                  <Field.Label fontSize="sm">Insumo</Field.Label>
                  <NativeSelectRoot>
                    <NativeSelectField
                      placeholder="Seleccione insumo"
                      value={item.insumo_id}
                      onChange={(e) => actualizarInsumoFila(index, 'insumo_id', e.target.value)}
                    >
                      {insumosMaestro.map((ins: any) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre} {ins.unidad_medida ? `(${ins.unidad_medida.simbolo})` : ''}
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                </Field.Root>

                <Field.Root flex={1}>
                  <Field.Label fontSize="sm">Cantidad</Field.Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Cant."
                    value={item.cantidad}
                    onChange={(e) => actualizarInsumoFila(index, 'cantidad', e.target.value)}
                  />
                </Field.Root>

                <IconButton
                  aria-label="Eliminar insumo"
                  colorPalette="red"
                  variant="ghost"
                  onClick={() => eliminarInsumoFila(index)}
                  type="button"
                >
                  <FiTrash2 />
                </IconButton>
              </HStack>
            ))}
          </Box>

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

      {/* Modal alta rápida de Producto */}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCrearProducto();
                        }
                      }}
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