import { useState } from "react";
import { VStack, Container } from "@chakra-ui/react";
import { RegistrarLoteForm } from "../features/lotes/RegistrarLoteForm";
import { ListadoLotes } from "../features/lotes/ListadoLotes";

export const LotesPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLoteCreado = () => {
    // Al incrementar el key, el ListadoLotes re-dispara su useEffect y actualiza los datos
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={8} align="stretch">
        <RegistrarLoteForm onLoteCreado={handleLoteCreado} />
        <ListadoLotes key={refreshKey} refreshKey={refreshKey} />
      </VStack>
    </Container>
  );
};