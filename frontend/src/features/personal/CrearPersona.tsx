import { useState } from 'react';
import { Box, Button, Input, VStack, Heading, Field, HStack, Text, Alert } from '@chakra-ui/react';
import { FiSave, FiXCircle, FiUser } from 'react-icons/fi';

interface FormValues {
  nombre: string;
  legajo: string;
  fecha_alta: string;
}

interface CrearPersonaProps {
  onCancelar?: () => void;
}

export const CrearPersona = ({ onCancelar }: CrearPersonaProps) => {
    const [datos, setDatos] = useState<FormValues>({ nombre: '', legajo: '', fecha_alta: '' });
    const [errores, setErrores] = useState<{ nombre?: string; legajo?: string; fecha_alta?: string; otros?: string }>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nuevosErrores: { nombre?: string; legajo?: string; fecha_alta?: string; otros?: string } = {};

        setSuccess(false);

        if (!datos.nombre.trim()) {
            nuevosErrores.nombre = "Por favor, ingrese un nombre válido";
        } else {
            const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{1,50}$/.test(datos.nombre);
            if (!nombreValido) {
                nuevosErrores.nombre = "El nombre solo debe contener letras";
            }
        }

        if (!datos.legajo.trim()) {
            nuevosErrores.legajo = "Por favor, ingrese un legajo";
        } else if (!/^\d+$/.test(datos.legajo)) {
            nuevosErrores.legajo = "El legajo debe ser numérico";
        }

        if (!datos.fecha_alta.trim()) {
            nuevosErrores.fecha_alta = "Por favor, ingrese la fecha de alta";
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(
                'http://127.0.0.1:8000/personal/',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: datos.nombre,
                        legajo: Number(datos.legajo),
                        fecha_alta: datos.fecha_alta,
                    }),
                },
            );

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            setDatos({ nombre: '', legajo: '', fecha_alta: '' });
            setErrores({});
            setSuccess(true);
        } catch (err: any) {
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? '';

            let mensajeError = 'Ocurrió un error inesperado';

            switch (errorCode) {
                case '400':
                    mensajeError = 'La persona ya existe (legajo duplicado).';
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
                <FiUser style={{ display: 'inline', marginRight: 8 }} />
                Nueva Persona
            </Heading>

            <form onSubmit={handleSubmit}>
                <VStack gap={4}>
                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            value={datos.nombre}
                            onChange={(e) => {
                                setDatos({ ...datos, nombre: e.target.value });
                                setErrores((prev) => ({ ...prev, nombre: undefined }));
                            }}
                        />
                        {errores.nombre && <Text color="red.500" fontSize="sm">{errores.nombre}</Text>}
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Legajo</Field.Label>
                        <Input
                            type="text"
                            placeholder="Ej: 1234"
                            value={datos.legajo}
                            onChange={(e) => {
                                setDatos({ ...datos, legajo: e.target.value });
                                setErrores((prev) => ({ ...prev, legajo: undefined }));
                            }}
                        />
                        {errores.legajo && <Text color="red.500" fontSize="sm">{errores.legajo}</Text>}
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Fecha de alta</Field.Label>
                        <Input
                            type="date"
                            value={datos.fecha_alta}
                            onChange={(e) => {
                                setDatos({ ...datos, fecha_alta: e.target.value });
                                setErrores((prev) => ({ ...prev, fecha_alta: undefined }));
                            }}
                        />
                        {errores.fecha_alta && <Text color="red.500" fontSize="sm">{errores.fecha_alta}</Text>}
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
                            <Alert.Title>La persona ha sido cargada exitosamente!</Alert.Title>
                        </Alert.Root>
                    }
                </VStack>
            </form>
        </Box>
    );
};