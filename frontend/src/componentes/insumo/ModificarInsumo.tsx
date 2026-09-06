import { useState } from "react";
import { Box, Button, Input, VStack, Heading, Field, NativeSelectRoot, NativeSelectField, HStack, Text, Alert } from "@chakra-ui/react";
import { FiSave, FiXCircle, FiEdit2 } from "react-icons/fi";

interface Insumo {
  id: number;
  nombre: string;
  unidad_medida: string;
}

interface FormValues {
  nombre: string;
  unidad_medida: string;
}

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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nuevosErrores: { nombre?: string; unidad_medida?: string; otros?: string } = {};

        setSuccess(false);
        if (!datos.nombre.trim()) {
            nuevosErrores.nombre = "Por favor, ingrese un nombre valido";
        } else {
            const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{1,50}$/.test(datos.nombre);
            if (!nombreValido) {
                nuevosErrores.nombre = "El nombre solo debe contener letras mayusculas o minusculas";
            }
        }

        if (!datos.unidad_medida.trim()) {
            nuevosErrores.unidad_medida = "Por favor, ingrese una unidad de medida";
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        setLoading(true);

        try {
            const nombre = datos.nombre.toLocaleLowerCase();
            const unidad_medida = datos.unidad_medida;

            const res = await fetch(
                `http://127.0.0.1:8000/insumos/${insumo.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, unidad_medida }),
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            setErrores({});
            setSuccess(true);
            onGuardado?.();
        } catch (err: any) {
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? '';

            let mensajeError = 'No se pudo modificar el insumo.';

            switch (errorCode) {
                case '400':
                    mensajeError = 'Datos inválidos.';
                    break;
                case '404':
                    mensajeError = 'Insumo no existe.';
                    break;
                case '500':
                    mensajeError = 'Error interno del servidor.';
                    break;
                default:
                    mensajeError = `Error ${errorCode || 'desconocido'}`;
            }
            nuevosErrores.otros = mensajeError;
            setErrores(nuevosErrores);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box maxW="xl" mx="auto" mt={20} p={20} borderWidth="1px" borderRadius="lg" boxShadow="lg">
            <Heading size="4xl" mb={15} textAlign="left" color="green">
                <FiEdit2 />
                Modificar Insumo
            </Heading>

            <form onSubmit={handleSubmit}>
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
                            Guardar cambios
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