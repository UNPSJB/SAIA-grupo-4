import { Box, VStack } from "@chakra-ui/react";
import { AlertMessage, LoadingState } from "../components/ui";
import { usePlanData } from "../features/planes/hooks/usePlanData";
import { PlanWorkspace } from "../features/planes/PlanWorkspace";

export default function PlanPage() {
  const { loading, error, planVigente, reload } = usePlanData();

  return (
    <Box p={10} bg='gray.100' minH='100vh'>
      {loading ? (
        <Box maxW='7xl' mx='auto' mt={20}>
          <LoadingState message='Cargando plan...' />
        </Box>
      ) : planVigente ? (
        <PlanWorkspace
          key={planVigente.id}
          initialPlan={planVigente}
          onCambio={reload}
        />
      ) : (
        <VStack
          maxW='4xl'
          mx='auto'
          mt={20}
          p={10}
          borderWidth='1px'
          borderRadius='lg'
          boxShadow='lg'
          bg='white'
          gap={4}
        >
          {error ? (
            <AlertMessage type='error' message={error} />
          ) : (
            <AlertMessage
              type='info'
              message='No hay un plan vigente en el sistema.'
            />
          )}
        </VStack>
      )}
    </Box>
  );
}