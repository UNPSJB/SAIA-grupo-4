import { useState } from "react";
import { Button, Center, Icon, Text, VStack } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";
import { useAuth } from "../features/auth/useAuth";
import { AlertConfirm } from "../components/ui";

// Vista temporal del operador. Sin NavBar: unicamente tareas a realizar.
export default function OperadorPage() {
  const { usuario, logout } = useAuth();
  const [cerrarSesionAbierto, setCerrarSesionAbierto] = useState(false);

  return (
    <Center minH='100vh' bg='gray.100'>
      <VStack gap={4} textAlign='center' p={8}>
        <Text fontSize='2xl' fontWeight='bold' color='green.700'>
          Vista del Operador
        </Text>
        <Text color='gray.600'>
          Hola, {usuario?.nombre} {usuario?.apellido} (DNI {usuario?.dni}).
        </Text>
        <Text color='gray.600'>
          Esta vista es temporal: acá se listarán las tareas que tenés que
          realizar.
        </Text>
        <Button
          colorPalette='red'
          variant='outline'
          onClick={() => setCerrarSesionAbierto(true)}
          mt={4}
        >
          <Icon as={FiLogOut} />
          Cerrar sesión
        </Button>
      </VStack>
      <AlertConfirm
        open={cerrarSesionAbierto}
        title='Cerrar sesión'
        message='¿Estás seguro de que querés cerrar tu sesión?'
        onConfirm={() => {
          setCerrarSesionAbierto(false);
          logout();
        }}
        onCancel={() => setCerrarSesionAbierto(false)}
      />
    </Center>
  );
}