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
    const [fechasAsignadas, setFechasAsignadas] = useState<Record<number, { fecha_desde: string; fecha_hasta: string | null }>>({});
    const [fechasPorCapacidad, setFechasPorCapacidad] = useState<Record<number, { fecha_desde: string; fecha_hasta: string }>>({});

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
                const asignacionesActivas = data.filter((asignacion: any) => asignacion.fecha_hasta === null);
                const activas = asignacionesActivas.map((asignacion: any) => asignacion.capacidad.id);
                const fechas: Record<number, { fecha_desde: string; fecha_hasta: string | null }> = {};
                asignacionesActivas.forEach((asignacion: any) => {
                    fechas[asignacion.capacidad.id] = {
                        fecha_desde: asignacion.fecha_desde,
                        fecha_hasta: asignacion.fecha_hasta,
                    };
                });
                setCapacidadesAsignadas(activas);
                setCapacidadesSeleccionadas(activas);
                setFechasAsignadas(fechas);
            })
            .catch(() => {});
    }, [persona.id]);

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
                const fechas = fechasPorCapacidad[capacidadId];
                await fetch(
                    `http://127.0.0.1:8000/personal/${persona.id}/capacidades`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            capacidad_id: capacidadId,
                            fecha_desde: fechas?.fecha_desde || hoy,
                            fecha_hasta: fechas?.fecha_hasta || null,
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

                    <Box width="100%">
                        <Text fontSize="md" fontFamily="sans-serif" mb={1} textAlign="left">Capacidades</Text>
                        <Checkbox.Group
                            value={capacidadesSeleccionadas.map(String)}
                            onValueChange={(value) => {
                                const nuevosIds = value.map(Number);
                                setCapacidadesSeleccionadas(nuevosIds);
                                setFechasPorCapacidad((prev) => {
                                    const actualizado = { ...prev };
                                    nuevosIds.forEach((id) => {
                                        if (!actualizado[id] && !capacidadesAsignadas.includes(id)) {
                                            actualizado[id] = { fecha_desde: new Date().toISOString().slice(0, 10), fecha_hasta: '' };
                                        }
                                    });
                                    return actualizado;
                                });
                            }}
                        >
                            <VStack align="start" gap={2}>
                                {capacidadesDisponibles.map((cap) => {
                                    const yaAsignada = capacidadesAsignadas.includes(cap.id);
                                    const seleccionada = capacidadesSeleccionadas.includes(cap.id);
                                    return (
                                        <Box key={cap.id} width="100%">
                                            <Checkbox.Root value={String(cap.id)}>
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control />
                                                <Checkbox.Label textTransform="capitalize">{cap.nombre}</Checkbox.Label>
                                            </Checkbox.Root>
                                            {seleccionada && yaAsignada && (
                                                <Text fontSize="xs" color="gray.500" ml={6} mb={1}>
                                                    Desde {fechasAsignadas[cap.id]?.fecha_desde}
                                                    {fechasAsignadas[cap.id]?.fecha_hasta
                                                        ? ` hasta ${fechasAsignadas[cap.id]?.fecha_hasta}`
                                                        : ' (sin vencimiento)'}
                                                </Text>
                                            )}
                                            {seleccionada && !yaAsignada && (
                                                <HStack gap={2} ml={6} mt={1} mb={1}>
                                                    <Field.Root>
                                                        <Field.Label fontSize="xs" color="gray.600">Desde</Field.Label>
                                                        <Input
                                                            size="sm"
                                                            type="date"
                                                            value={fechasPorCapacidad[cap.id]?.fecha_desde ?? ''}
                                                            onChange={(e) => setFechasPorCapacidad((prev) => ({
                                                                ...prev,
                                                                [cap.id]: { fecha_hasta: '', ...prev[cap.id], fecha_desde: e.target.value },
                                                            }))}
                                                        />
                                                    </Field.Root>
                                                    <Field.Root>
                                                        <Field.Label fontSize="xs" color="gray.600">Hasta (opcional)</Field.Label>
                                                        <Input
                                                            size="sm"
                                                            type="date"
                                                            value={fechasPorCapacidad[cap.id]?.fecha_hasta ?? ''}
                                                            onChange={(e) => setFechasPorCapacidad((prev) => ({
                                                                ...prev,
                                                                [cap.id]: { fecha_desde: '', ...prev[cap.id], fecha_hasta: e.target.value },
                                                            }))}
                                                        />
                                                    </Field.Root>
                                                </HStack>
                                            )}
                                        </Box>
                                    );
                                })}
                                {capacidadesDisponibles.length === 0 && (
                                    <Text fontSize="sm" color="gray.500">Todavía no hay capacidades cargadas.</Text>
                                )}
                            </VStack>
                        </Checkbox.Group>
                    </Box>

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