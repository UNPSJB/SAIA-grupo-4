import { useState } from 'react';
import { Box, Button, Input, VStack, Heading, Field, HStack, Text, Alert } from '@chakra-ui/react';
import { FiSave, FiXCircle, FiAward } from 'react-icons/fi';

interface FormValues {
  nombre: string;
}

interface CrearCapacidadProps {
  onCancelar?: () => void;
}

export const CrearCapacidad = ({ onCancelar }: CrearCapacidadProps) => {
    const [datos, setDatos] = useState<FormValues>({ nombre: '' });
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
            // Verificamos que el nombre sean caracteres y no numeros o simbolos
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
                'http://127.0.0.1:8000/capacidades/',
                {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre }),
                },
            );

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            setDatos({ nombre: '' });
            setErrores({});
            setSuccess(true);
        } catch (err: any) {
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? '';

            let mensajeError = 'Ocurrió un error inesperado';

            switch (errorCode) {
                case '400':
                mensajeError = 'La capacidad ya existe.';
                break;
                case '500':
                mensajeError = 'Error interno del servidor. Intente más tarde.';
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
                <FiAward style={{ display: 'inline', marginRight: 8 }}/>
                Nueva Capacidad
            </Heading>

            <form onSubmit={handleSubmit}>
                <VStack gap={4}>
                    <Field.Root>
                    <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                        type="text"
                        placeholder="Ej: Manipulación de alimentos"
                        value={datos.nombre}
                        onChange={(e) => {setDatos({ ...datos, nombre: e.target.value });
                                          setErrores(prev => ({ ...prev, nombre: undefined }))}}
                        />
                        {errores.nombre && <Text color="red.500" fontSize="sm">{errores.nombre}</Text>}
                    </Field.Root>

                    <HStack justify="center" width="100%">
                        <Button loading={loading} loadingText="Guardando..." type="submit" colorPalette="green">
                            <FiSave/>
                            Guardar
                        </Button>
                        <Button colorPalette="red" variant="outline" onClick={onCancelar}>
                            <FiXCircle/>
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
                        <Alert.Title>La capacidad ha sido cargada exitosamente!</Alert.Title>
                    </Alert.Root>
                    }
                </VStack>
            </form>
        </Box>
    );
};
