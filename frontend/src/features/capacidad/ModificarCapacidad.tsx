import { useState } from "react";
import { Box, Button, Input, VStack, Heading, Field, HStack, Text, Alert } from "@chakra-ui/react";
import { FiSave, FiXCircle, FiEdit2 } from "react-icons/fi";

interface Capacidad {
  id: number;
  nombre: string;
}

interface FormValues {
  nombre: string;
}

interface ModificarCapacidadProps {
    capacidad: Capacidad;
    onCancelar?: () => void;
    onGuardado?: () => void;
}

export const ModificarCapacidad = ({ capacidad, onCancelar, onGuardado }: ModificarCapacidadProps) => {
    const [datos, setDatos] = useState<FormValues>({
        nombre: capacidad.nombre
    });
    const [errores, setErrores] = useState<{ nombre?: string; otros?: string }>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nuevosErrores: { nombre?: string; otros?: string } = {};

        setSuccess(false);
        if (!datos.nombre.trim()) {
            nuevosErrores.nombre = "Por favor, ingrese un nombre valido";
        } else {
            const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{1,100}$/.test(datos.nombre);
            if (!nombreValido) {
                nuevosErrores.nombre = "El nombre solo debe contener letras mayusculas o minusculas";
            }
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        setLoading(true);

        try {
            const nombre = datos.nombre.toLocaleLowerCase();

            const res = await fetch(
                `http://127.0.0.1:8000/capacidades/${capacidad.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre }),
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            setErrores({});
            setSuccess(true);
            onGuardado?.();
        } catch (err: any) {
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? '';

            let mensajeError = 'No se pudo modificar la capacidad.';

            switch (errorCode) {
                case '400':
                    mensajeError = 'La capacidad ya existe.';
                    break;
                case '404':
                    mensajeError = 'La capacidad no existe.';
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
                <FiEdit2 style={{ display: 'inline', marginRight: 8 }}/>
                Modificar Capacidad
            </Heading>

            <form onSubmit={handleSubmit}>
                <VStack gap={4}>
                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                            type="text"
                            placeholder="Ej: Manipulación de alimentos"
                            value={datos.nombre}
                            onChange={(e) => {
                                setDatos({ ...datos, nombre: e.target.value });
                                setErrores((prev) => ({ ...prev, nombre: undefined }));
                            }}
                        />
                        {errores.nombre && <Text color="red.500" fontSize="sm">{errores.nombre}</Text>}
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
                            <Alert.Title>Capacidad modificada exitosamente!</Alert.Title>
                        </Alert.Root>
                    }
                </VStack>
            </form>
        </Box>
    );
}
