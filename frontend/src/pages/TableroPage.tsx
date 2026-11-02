import { Container } from "@chakra-ui/react";
import { EstadisticasProduccion } from "../features/lotes/EstadisticasProduccion";

export const TableroPage = () => {
  return (
    <Container maxW="5xl" py={8}>
      <EstadisticasProduccion />
    </Container>
  );
};