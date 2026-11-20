import { useState } from "react";
import { Box, Button, HStack, Icon } from "@chakra-ui/react";
import { FiSettings, FiShield, FiSliders } from "react-icons/fi";
import { ConfiguracionForm } from "../features/configuracion/ConfiguracionForm";
import { VistaParametrosNormativos } from "../features/configuracion/VistaParametrosNormativos";
import { VistaConfiguracionNutricional } from "../features/configuracionNutricional/VistaConfiguracionNutricional";

export type SeccionConfiguracion = "establecimiento" | "normativos" | "nutricional";

interface ConfiguracionPageProps {
  seccionInicial?: SeccionConfiguracion;
}

export const ConfiguracionPage = ({
  seccionInicial = "establecimiento",
}: ConfiguracionPageProps) => {
  const [seccionActiva, setSeccionActiva] =
    useState<SeccionConfiguracion>(seccionInicial);

  return (
    <Box p={{ base: 4, md: 6 }} w="100%">
      <HStack
        gap={2}
        mb={6}
        p={1.5}
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        w="fit-content"
        flexWrap="wrap"
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
        <Button
          size="sm"
          variant={seccionActiva === "nutricional" ? "solid" : "ghost"}
          colorPalette="green"
          onClick={() => setSeccionActiva("nutricional")}
        >
          <Icon as={FiSliders} />
          Configuración Nutricional
        </Button>
      </HStack>

      {seccionActiva === "establecimiento" ? (
        <ConfiguracionForm />
      ) : seccionActiva === "normativos" ? (
        <VistaParametrosNormativos />
      ) : (
        <VistaConfiguracionNutricional />
      )}
    </Box>
  );
};

export default ConfiguracionPage;
