import { Container } from "@chakra-ui/react";
import { ConfiguracionForm } from "../features/configuracion/ConfiguracionForm";

export const ConfiguracionPage = () => {
  return (
    <Container maxW="5xl" py={6}>
      <ConfiguracionForm />
    </Container>
  );
};