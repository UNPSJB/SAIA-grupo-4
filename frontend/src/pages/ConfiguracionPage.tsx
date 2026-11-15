import { useState } from "react";
import { Box, Button, Container, HStack, Icon } from "@chakra-ui/react";
import { FiSettings, FiShield } from "react-icons/fi";
import { ConfiguracionForm } from "../features/configuracion/ConfiguracionForm";
import { VistaParametrosNormativos } from "../features/configuracion/VistaParametrosNormativos";

export const ConfiguracionPage = () => {
  const [seccionActiva, setSeccionActiva] = useState<
    "establecimiento" | "normativos"
  >("establecimiento");

  return (
    <Box p={{ base: 4, md: 6 }} maxW="960px" mx="auto">
      <Container maxW="container.xl" px={0}>
        <HStack
          gap={2}
          mb={6}
          p={1.5}
          bg="white"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.200"
          w="fit-content"
        >
          <Button
            size="sm"
            variant={seccionActiva === "establecimiento" ? "solid" : "ghost"}
            colorPalette="green"
            onClick={() => setSeccionActiva("establecimiento")}
          >
            <Icon as={FiSettings} />
            Datos del Establecimiento
          </Button>
          <Button
            size="sm"
            variant={seccionActiva === "normativos" ? "solid" : "ghost"}
            colorPalette="green"
            onClick={() => setSeccionActiva("normativos")}
          >
            <Icon as={FiShield} />
            Parámetros Normativos (Ley 27.642)
          </Button>
        </HStack>

        {seccionActiva === "establecimiento" ? (
          <ConfiguracionForm />
        ) : (
          <VistaParametrosNormativos />
        )}
      </Container>
    </Box>
  );
};

export default ConfiguracionPage;