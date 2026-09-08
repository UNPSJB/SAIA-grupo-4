import { useState } from "react";
import { Box, Button, Input, VStack, Heading, Field, NativeSelectRoot, NativeSelectField, HStack, Text, Alert } from "@chakra-ui/react";
import { FiSave, FiXCircle, FiEdit2 } from "react-icons/fi";
import type { Equipo } from './ListadoEquipo';



interface FormValues {
  nombre: string;
  categoria: string;
  ubicacion: string;
}

interface ModificarEquipoProps {
    equipo: Equipo;
    onCancelar?: () => void;
    onGuardado?: () => void;
}

export const ModificarEquipo = ({ equipo, onCancelar, onGuardado }: ModificarEquipoProps) => {
    const [datos, setDatos] = useState<FormValues>({
        nombre: equipo.nombre,
        categoria: equipo.categoria,
        ubicacion: equipo.ubicacion || ''
    });
    const [errores, setErrores] = useState<{ nombre?: string; categoria?: string; otros?: string }>({});
    const [loading, setLoading] = useState(false);
    

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nuevosErrores: { nombre?: string; categoria?: string; otros?: string } = {};

    
        if (!datos.nombre.trim()) {
            nuevosErrores.nombre = "Por favor, ingrese un nombre válido";
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
                `http://127.0.0.1:8000/equipos/${equipo.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            setErrores({});
        
            onGuardado?.();
        } catch (err: any) {
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? '';
            let mensajeError = 'No se pudo modificar el equipo.';

            switch (errorCode) {
                case '400':
                    mensajeError = 'El nombre de equipo ya existe o es inválido.';
                    break;
                case '404':
                    mensajeError = 'El equipo no existe.';
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
        <Box maxW="xl" mx="auto" mt={20} p={10} borderWidth="1px" borderRadius="lg" boxShadow="lg" bg="white">
            <Heading size="2xl" mb={10} textAlign="left" color="blue.600">
                <FiEdit2 style={{ display: 'inline', marginRight: 8 }}/>
                Modificar Equipo
            </Heading>

            <form onSubmit={handleSubmit}>
                <VStack gap={4}>
                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                            type="text"
                            value={datos.nombre}
                            onChange={(e) => {
                                setDatos({ ...datos, nombre: e.target.value });
                                setErrores((prev) => ({ ...prev, nombre: undefined }));
                            }}
                        />
                        {errores.nombre && <Text color="red.500" fontSize="sm">{errores.nombre}</Text>}
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Categoría</Field.Label>
                        <NativeSelectRoot>
                            <NativeSelectField
                                value={datos.categoria}
                                onChange={(e) => {
                                    setDatos({ ...datos, categoria: e.target.value });
                                    setErrores((prev) => ({ ...prev, categoria: undefined }));
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
                            value={datos.ubicacion}
                            onChange={(e) => setDatos({ ...datos, ubicacion: e.target.value })}
                        />
                    </Field.Root>

                    <HStack justify="center" width="100%" mt={4}>
                        <Button loading={loading} loadingText="Guardando..." type="submit" colorPalette="blue">
                            <FiSave /> Guardar
                        </Button>
                        <Button colorPalette="red" variant="outline" onClick={onCancelar}>
                            <FiXCircle /> Cancelar
                        </Button>
                    </HStack>

                    {errores.otros && 
                        <Alert.Root status="error" mt={4}>
                            <Alert.Indicator />
                            <Alert.Title>{errores.otros}</Alert.Title>
                        </Alert.Root>
                    }
                </VStack>
            </form>
        </Box>
    );
};