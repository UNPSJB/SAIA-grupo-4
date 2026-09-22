import { Button, Center, Icon, Text, VStack } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";
import { useAuth } from "../features/auth/useAuth";

// Vista temporal del operador. Sin NavBar: unicamente tareas a realizar.
export default function OperadorPage() {
  const { usuario, logout } = useAuth();

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
          onClick={logout}
          mt={4}
        >
          <Icon as={FiLogOut} />
          Cerrar sesión
        </Button>
      </VStack>
    </Center>
  );
}