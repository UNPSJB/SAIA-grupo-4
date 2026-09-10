import { useState } from "react";
import { Box, Button, Input, VStack, Heading, Field, NativeSelectRoot, NativeSelectField, HStack, Text, Alert } from "@chakra-ui/react";
import { FiSave, FiXCircle, FiEdit2 } from "react-icons/fi";
import { useInsumoSubmit } from '../../utils/insumo/useInsumoSubmit';
import type { FormValues, Insumo} from '../../utils/insumo/types';


interface ModificarInsumoProps {
    insumo: Insumo;
    onCancelar?: () => void;
    onGuardado?: () => void;
}

export const ModificarInsumo = ({ insumo, onCancelar, onGuardado }: ModificarInsumoProps) => {
    const [datos, setDatos] = useState<FormValues>({
        nombre: insumo.nombre,
        unidad_medida: insumo.unidad_medida
    });
    const [errores, setErrores] = useState<{ nombre?: string; unidad_medida?: string; otros?: string }>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);


    const handleSubmit = useInsumoSubmit({
      endpoint: 'http://127.0.0.1:8000/insumos/',
      method: 'PUT',
      id: insumo.id,
      onSuccess: () => {
        onGuardado?.();
      }
    });

    return (
        <Box maxW="xl" mx="auto" mt={20} p={20} borderWidth="1px" borderRadius="lg" boxShadow="lg">
            <Heading size="4xl" mb={15} textAlign="left" color="green">
                <FiEdit2 style={{ display: 'inline', marginRight: 8 }}/>
                Modificar Insumo
            </Heading>

            <form onSubmit={(e) => handleSubmit(e, datos, setDatos, setErrores, setLoading, setSuccess)}>
                <VStack gap={4}>
                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                            type="text"
                            placeholder="Ej: Arroz"
                            value={datos.nombre}
                            onChange={(e) => {
                                setDatos({ ...datos, nombre: e.target.value });
                                setErrores((prev) => ({ ...prev, nombre: undefined }));
                            }}
                        />
                        {errores.nombre && <Text color="red.500" fontSize="sm">{errores.nombre}</Text>}
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Unidad de medida</Field.Label>
                        <NativeSelectRoot>
                            <NativeSelectField
                                placeholder="Selecciona una opción"
                                value={datos.unidad_medida}
                                onChange={(e) => {
                                    setDatos({ ...datos, unidad_medida: e.target.value });
                                    setErrores((prev) => ({ ...prev, unidad_medida: undefined }));
                                }}
                            >
                                <option value="litros">Litros</option>
                                <option value="kilogramos">Kilogramos</option>
                                <option value="gramos">Gramos</option>
                                <option value="unidades">Unidades</option>
                            </NativeSelectField>
                        </NativeSelectRoot>
                        {errores.unidad_medida && <Text color="red.500" fontSize="sm">{errores.unidad_medida}</Text>}
                    </Field.Root>

                    <HStack justify="center" width="100%">
                        <Button loading={loading} loadingText="Guardando..." type="submit" colorPalette="green">
                            <FiSave />
                            Guardar
                        </Button>
                        <Button colorPalette="red" variant="outline" onClick={onCancelar}>
                            <FiXCircle />
                            Cancelar
                        </Button>
                    </HStack>

                    {errores.otros && 
                        <Alert.Root status="error">
                            <Alert.Indicator />
                            <Alert.Title>{errores.otros}</Alert.Title>
                        </Alert.Root>
                    }

                    {success &&
                        <Alert.Root status="success">
                            <Alert.Indicator />
                            <Alert.Title>Insumo modificado exitosamente!</Alert.Title>
                        </Alert.Root>
                    }
                </VStack>
            </form>
        </Box>
    );
}