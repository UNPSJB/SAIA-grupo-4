import { useState } from 'react';
import { Box, Container } from '@chakra-ui/react';
import { RegistrarLoteForm } from '../features/lotes/RegistrarLoteForm';
import { ListadoLotes } from '../features/lotes/ListadoLotes';

export const LotesPage = () => {
  const [reloadSignal, setReloadSignal] = useState<number>(0);

  const handleSuccess = () => {
    setReloadSignal((prev) => prev + 1);
  };

  return (
    <Container maxW="container.xl" py={6}>
      <Box mb={6}>
        <RegistrarLoteForm onSuccess={handleSuccess} />
      </Box>
      <Box>
        <ListadoLotes reloadSignal={reloadSignal} />
      </Box>
    </Container>
  );
};