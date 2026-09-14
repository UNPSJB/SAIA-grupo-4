import { useState, useEffect } from "react";
import { Box, Button, Input, VStack, Heading, Field, HStack, Text, Alert, Checkbox } from "@chakra-ui/react";
import { FiSave, FiXCircle, FiEdit2 } from "react-icons/fi";

interface Persona {
  id: number;
  nombre: string;
  legajo: number;
  fecha_alta: string;
}

interface FormValues {
  nombre: string;
  legajo: string;
  fecha_alta: string;
}

interface Capacidad {
  id: number;
  nombre: string;
}

interface ModificarPersonaProps {
    persona: Persona;
    onCancelar?: () => void;
    onGuardado?: () => void;
}

export const ModificarPersona = ({ persona, onCancelar, onGuardado }: ModificarPersonaProps) => {
    const [datos, setDatos] = useState<FormValues>({
        nombre: persona.nombre,
        legajo: String(persona.legajo),
        fecha_alta: persona.fecha_alta,
    });
    const [errores, setErrores] = useState<{ nombre?: string; legajo?: string; fecha_alta?: string; otros?: string }>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [capacidadesDisponibles, setCapacidadesDisponibles] = useState<Capacidad[]>([]);
    const [capacidadesAsignadas, setCapacidadesAsignadas] = useState<number[]>([]);
    const [capacidadesSeleccionadas, setCapacidadesSeleccionadas] = useState<number[]>([]);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/capacidades/')
            .then((res) => res.json())
            .then((data) => setCapacidadesDisponibles(data))
            .catch(() => {});

        fetch(`http://127.0.0.1:8000/personal/${persona.id}/capacidades`)
            .then((res) => res.json())
            .then((data) => {
                // El endpoint devuelve también asignaciones históricas (ya cerradas
                // con fecha_hasta), así que nos quedamos solo con las activas.
                const activas = data
                    .filter((asignacion: any) => asignacion.fecha_hasta === null)
                    .map((asignacion: any) => asignacion.capacidad.id);
                setCapacidadesAsignadas(activas);
                setCapacidadesSeleccionadas(activas);
            })
            .catch(() => {});
    }, [persona.id]);

    const toggleCapacidad = (capacidadId: number) => {
        setCapacidadesSeleccionadas((prev) =>
            prev.includes(capacidadId)
                ? prev.filter((id) => id !== capacidadId)
                : [...prev, capacidadId]
        );
    };

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
                `http://127.0.0.1:8000/personal/${persona.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: datos.nombre,
                        legajo: Number(datos.legajo),
                        fecha_alta: datos.fecha_alta,
                    }),
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            const aAsignar = capacidadesSeleccionadas.filter(
                (id) => !capacidadesAsignadas.includes(id)
            );
            const aQuitar = capacidadesAsignadas.filter(
                (id) => !capacidadesSeleccionadas.includes(id)
            );
            const hoy = new Date().toISOString().slice(0, 10);

            for (const capacidadId of aAsignar) {
                await fetch(
                    `http://127.0.0.1:8000/personal/${persona.id}/capacidades`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            capacidad_id: capacidadId,
                            fecha_desde: hoy,
                        }),
                    },
                );
            }

            for (const capacidadId of aQuitar) {
                await fetch(
                    `http://127.0.0.1:8000/personal/${persona.id}/capacidades/${capacidadId}`,
                    { method: 'DELETE' },
                );
            }

            setCapacidadesAsignadas(capacidadesSeleccionadas);
            setErrores({});
            setSuccess(true);
            onGuardado?.();
        } catch (err: any) {
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? '';

            let mensajeError = 'No se pudo modificar la persona.';

            switch (errorCode) {
                case '400':
                    mensajeError = 'Datos inválidos.';
                    break;
                case '404':
                    mensajeError = 'La persona no existe.';
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
                <FiEdit2 style={{ display: 'inline', marginRight: 8 }} />
                Modificar Persona
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
                        <Field.Label fontSize="md" fontFamily="sans-serif">Legajo</Field.Label>
                        <Input
                            type="text"
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

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Capacidades</Field.Label>
                        <VStack align="start" gap={2}>
                            {capacidadesDisponibles.map((cap) => (
                                <Checkbox.Root
                                    key={cap.id}
                                    checked={capacidadesSeleccionadas.includes(cap.id)}
                                    onCheckedChange={() => toggleCapacidad(cap.id)}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control />
                                    <Checkbox.Label textTransform="capitalize">{cap.nombre}</Checkbox.Label>
                                </Checkbox.Root>
                            ))}
                            {capacidadesDisponibles.length === 0 && (
                                <Text fontSize="sm" color="gray.500">Todavía no hay capacidades cargadas.</Text>
                            )}
                        </VStack>
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
                            <Alert.Title>Persona modificada exitosamente!</Alert.Title>
                        </Alert.Root>
                    }
                </VStack>
            </form>
        </Box>
    );
};