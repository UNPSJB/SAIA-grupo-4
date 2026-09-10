import { useState } from 'react';
import { Dialog, Portal, Button, Text, Alert, HStack } from '@chakra-ui/react';
import { FiTrash2, FiXCircle } from 'react-icons/fi';
import type { Equipo } from './types';


interface EliminarEquipoProps {
    equipo: Equipo | null;
    open: boolean;
    onCancelar: () => void;
    onEliminar?: () => void;
}

export const EliminarEquipo = ({ equipo, open, onCancelar, onEliminar }: EliminarEquipoProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleEliminar = async () => {
        if (!equipo) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`http://127.0.0.1:8000/equipos/${equipo.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }

            onEliminar?.();
            onCancelar();
        } catch (err: any) {
            const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? "";

            let mensajeError = "No se pudo eliminar el equipo.";
            switch (errorCode) {
                case "404":
                    mensajeError = "El equipo no existe.";
                    break;
                case "500":
                    mensajeError = "Error interno del servidor.";
                    break;
                default:
                    mensajeError = `Error ${errorCode || "desconocido"}`;
            }
            setError(mensajeError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(e) => !e.open && onCancelar()}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Eliminar Equipo</Dialog.Title>
                        </Dialog.Header>

                        <Dialog.Body>
                            <Text>
                                ¿Estás seguro que querés eliminar el equipo {" "}
                                <Text as="span" fontWeight="bold" textTransform="capitalize">
                                    {equipo?.nombre}
                                </Text>
                                ? Esta acción no se puede deshacer.
                            </Text>

                            {error && (
                                <Alert.Root status="error" mt={4}>
                                    <Alert.Indicator />
                                    <Alert.Title>{error}</Alert.Title>
                                </Alert.Root>
                            )}
                        </Dialog.Body>

                        <Dialog.Footer>
                            <HStack gap={2}>
                                <Button variant="outline" onClick={onCancelar} disabled={loading}>
                                    <FiXCircle /> Cancelar
                                </Button>
                                <Button 
                                    colorPalette="red"
                                    onClick={handleEliminar}
                                    loading={loading}
                                    loadingText="Eliminando..."
                                >
                                    <FiTrash2 /> Eliminar
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
};