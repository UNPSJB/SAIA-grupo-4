import { useState } from 'react';
import { Box, Button, Input, VStack, Heading, Field, NativeSelectRoot, NativeSelectField, HStack, Text, Alert} from '@chakra-ui/react';
import { FiSave, FiXCircle, FiBox} from 'react-icons/fi';

interface FormValues {
  nombre: string;
  categoria: string;
  ubicacion: string;
}

interface CrearEquipoProps {
  onCancelar?: () => void;
}

export const CrearEquipo = ({ onCancelar }: CrearEquipoProps) => {
    const [datos, setDatos] = useState<FormValues>({nombre: '', categoria: '', ubicacion: ''});
    const [errores, setErrores] = useState<{ nombre?: string; categoria?: string; otros?: string}>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nuevosErrores: { nombre?: string; categoria?: string; otros?: string} = {};

        setSuccess(false);
        if (!datos.nombre.trim()) {
            nuevosErrores.nombre = "Por favor, ingrese un nombre válido"; 
        } else {
            const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9 ]{1,100}$/.test(datos.nombre);
            if(!nombreValido) {
                nuevosErrores.nombre = "El nombre contiene caracteres no permitidos";    
            }
        }

        if (!datos.categoria.trim()) {
            nuevosErrores.categoria = "Por favor, seleccione una categoría";
        }
        
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        setLoading(true);

        try {
            const payload = {
                nombre: datos.nombre,
                categoria: datos.categoria,
                ubicacion: datos.ubicacion.trim() || undefined
            };

            const res = await fetch(
                'http://127.0.0.1:8000/equipos/',
                {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                },
            );

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            setDatos({ nombre: '', categoria: '', ubicacion: '' });
            setErrores({}); 
            setSuccess(true);
        } catch (err: any){
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? '';
            let mensajeError = 'Ocurrió un error inesperado';

            switch (errorCode) {
                case '400':
                    mensajeError = 'El equipo ya existe o los datos son inválidos.';
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
                <FiBox style={{ display: 'inline', marginRight: 8 }}/>
                Nuevo Equipo
            </Heading>

            <form onSubmit={handleSubmit}>
                <VStack gap={4}>
                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                            type="text"
                            placeholder="Ej: Heladera Mostrador"
                            value={datos.nombre}
                            onChange={(e) => {
                                setDatos({ ...datos, nombre: e.target.value });
                                setErrores(prev => ({ ...prev, nombre: undefined }));
                            }}
                        />
                        {errores.nombre && <Text color="red.500" fontSize="sm">{errores.nombre}</Text>}
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Categoría</Field.Label>
                        <NativeSelectRoot>
                            <NativeSelectField 
                                placeholder="Selecciona una categoría" 
                                value={datos.categoria}
                                onChange={(e) => {
                                    setDatos({ ...datos, categoria: e.target.value });
                                    setErrores(prev => ({ ...prev, categoria: undefined }));
                                }}
                            >
                                <option value="heladera">Heladera</option>
                                <option value="horno">Horno</option>
                                <option value="balanza">Balanza</option>
                                <option value="termometro">Termómetro</option>
                                <option value="otro">Otro</option>
                            </NativeSelectField>
                        </NativeSelectRoot>
                        {errores.categoria && <Text color="red.500" fontSize="sm">{errores.categoria}</Text>}
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Ubicación (Opcional)</Field.Label>
                        <Input
                            type="text"
                            placeholder="Ej: Cocina Principal"
                            value={datos.ubicacion}
                            onChange={(e) => setDatos({ ...datos, ubicacion: e.target.value })}
                        />
                    </Field.Root>

                    <HStack justify="center" width="100%">
                        <Button loading={loading} loadingText="Guardando..." type="submit" colorPalette="green">
                            <FiSave/> Guardar
                        </Button>
                        <Button colorPalette="red" variant="outline" onClick={onCancelar}>
                            <FiXCircle/> Cancelar
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
                            <Alert.Title>¡El equipo ha sido cargado exitosamente!</Alert.Title>
                        </Alert.Root>
                    }
                </VStack>
            </form>
        </Box>
    );
};