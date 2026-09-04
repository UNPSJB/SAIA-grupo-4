import { useState } from 'react';
import { Box, Button, Input, VStack, Heading, Field, NativeSelectRoot, NativeSelectField, HStack, Text} from '@chakra-ui/react';
import { FiSave, FiXCircle, FiBox} from 'react-icons/fi';

interface FormValues {
  nombre: string;
  unidad_medida: string;
}

export const CrearInsumo = () => {
    const [datos, setDatos] = useState<FormValues>({nombre: '', unidad_medida: ''});
    const [errores, setErrores] = useState<{ nombre?: string; unidad_medida?: string; otros?: string}>({});

    //Logica con la conexion con la API
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nuevosErrores: { nombre?: string; unidad_medida?: string; otros?: string} = {};
        
        if (!datos.nombre.trim()) {
            nuevosErrores.nombre = "El nombre es obligatorio"; 
        } 
        else {
            // Verificamos que el nombre sean caracteres y no numeros o simbolos
            const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{1,50}$/.test(datos.nombre);
            if(!nombreValido) {
                nuevosErrores.nombre = "Por favor, ingrese un nombre valido"    
            }
        }

        if (!datos.unidad_medida.trim()) {
            nuevosErrores.unidad_medida = "La unidad de medida es obligatoria";
        }
        
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        try {
            const res = await fetch(
                'http://127.0.0.1:8000/insumos/',
                {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datos }),
                },
            );

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Error al crear el insumo');
            }

            setDatos({ nombre: '', unidad_medida: '' });
            setErrores({}); 
        } catch (err: any){
            nuevosErrores.otros = err.message || "Error inesperado"
            setErrores(nuevosErrores)
        }
    };


    return (
        <Box maxW="xl" mx="auto" mt={20} p={20} borderWidth="1px" borderRadius="lg" boxShadow="lg">
            <Heading size="4xl" mb={15} textAlign="left" color="green">
                <FiBox/>
                Nuevo Insumo
            </Heading>

            <form onSubmit={handleSubmit}>
                <VStack gap={4}>
                    <Field.Root>
                    <Field.Label fontSize="md" fontFamily="sans-serif">Nombre</Field.Label>
                        <Input
                        type="text"
                        placeholder="Ej: Arroz"
                        value={datos.nombre}
                        onChange={(e) => {setDatos({ ...datos, nombre: e.target.value });
                                          setErrores(prev => ({ ...prev, nombre: undefined }))}}
                        />
                        {errores.nombre && <Text color="red.500" fontSize="sm">{errores.nombre}</Text>}
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="md" fontFamily="sans-serif">Unidad de medida</Field.Label>
                        <NativeSelectRoot>
                            <NativeSelectField 
                            placeholder="Selecciona una opción" 
                            value={datos.unidad_medida}
                            onChange={(e) => {setDatos({ ...datos, unidad_medida: e.target.value });
                                              setErrores(prev => ({ ...prev, unidad_medida: undefined }))}}
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
                        <Button type="submit" colorPalette="green">
                            <FiSave/>
                            Guardar
                        </Button>
                        <Button colorPalette="red" variant="outline">
                            <FiXCircle/>
                            Cancelar
                        </Button>
                    </HStack>
                    {errores.otros && <Text color="red.500" fontSize="sm">{errores.otros}</Text>}
                </VStack>
            </form>
        </Box>
    );
};