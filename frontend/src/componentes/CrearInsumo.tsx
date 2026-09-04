import { useState } from 'react';
import { Box, Button, Input, VStack, Heading, Field, NativeSelectRoot, NativeSelectField, HStack} from '@chakra-ui/react';
import { FiSave, FiXCircle, FiBox} from 'react-icons/fi';

interface FormValues {
  nombre: string;
  unidad_medida: string;
}

export const CrearInsumo = () => {
    const [datos, setDatos] = useState<FormValues>({nombre: '', unidad_medida: ''});

    //Logica con la conexion con la API
    const manejarEnvio = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); 
        console.log('Datos listos para enviar a la base de datos:', datos);
    };


    return (
        <Box maxW="xl" mx="auto" mt={20} p={20} borderWidth="1px" borderRadius="lg" boxShadow="lg">
            <Heading size="4xl" mb={15} textAlign="left" color="green">
                <FiBox/>
                Nuevo Insumo
            </Heading>

            <form onSubmit={manejarEnvio}>
                <VStack gap={4}>
                    <Field.Root required>
                    <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                        type="text"
                        placeholder="Ej: Arroz"
                        value={datos.nombre}
                        onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                        />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Unidad de medida</Field.Label>
                        <NativeSelectRoot>
                            <NativeSelectField 
                            placeholder="Selecciona una opción" 
                            value={datos.unidad_medida}
                            onChange={(e) => setDatos({ ...datos, unidad_medida: e.target.value })}
                            >
                                <option value="litros">Litros</option>
                                <option value="kilogramos">Kilogramos</option>
                                <option value="gramos">Gramos</option>
                                <option value="unidades">Unidades</option>
                            </NativeSelectField>
                        </NativeSelectRoot>
                    </Field.Root>

                    <HStack justify="center" width="100%">
                        <Button type="submit" colorPalette="green">
                            <FiSave/>
                            Guardar
                        </Button>
                        <Button colorPalette="red" variant="outline">
                            <FiXCircle/>
                            Cancelar
                        </Button>
                    </HStack>
                </VStack>
            </form>
        </Box>
    );
};