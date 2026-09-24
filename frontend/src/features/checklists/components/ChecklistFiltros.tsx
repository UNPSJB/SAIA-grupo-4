import { HStack, Button, Badge } from "@chakra-ui/react";
import type { TipoMomento } from "../types";

interface ChecklistFiltrosProps {
  filtroActual: "todos" | TipoMomento;
  onCambiarFiltro: (filtro: "todos" | TipoMomento) => void;
  conteo: {
    todos: number;
    preOperacional: number;
    operacional: number;
  };
}

export function ChecklistFiltros({
  filtroActual,
  onCambiarFiltro,
  conteo,
}: ChecklistFiltrosProps) {
  return (
    <HStack gap={2} mb={6} overflowX="auto" pb={1}>
      <Button
        size="sm"
        variant={filtroActual === "todos" ? "solid" : "outline"}
        colorScheme={filtroActual === "todos" ? "green" : "gray"}
        onClick={() => onCambiarFiltro("todos")}
        borderRadius="full"
        px={4}
      >
        Todos
        <Badge ml={2} colorScheme={filtroActual === "todos" ? "whiteAlpha" : "gray"} borderRadius="full">
          {conteo.todos}
        </Badge>
      </Button>

      <Button
        size="sm"
        variant={filtroActual === "pre-operacional" ? "solid" : "outline"}
        colorScheme={filtroActual === "pre-operacional" ? "green" : "gray"}
        onClick={() => onCambiarFiltro("pre-operacional")}
        borderRadius="full"
        px={4}
      >
        Pre-operacional
        <Badge ml={2} colorScheme={filtroActual === "pre-operacional" ? "whiteAlpha" : "gray"} borderRadius="full">
          {conteo.preOperacional}
        </Badge>
      </Button>

      <Button
        size="sm"
        variant={filtroActual === "operacional" ? "solid" : "outline"}
        colorScheme={filtroActual === "operacional" ? "green" : "gray"}
        onClick={() => onCambiarFiltro("operacional")}
        borderRadius="full"
        px={4}
      >
        Operacional
        <Badge ml={2} colorScheme={filtroActual === "operacional" ? "whiteAlpha" : "gray"} borderRadius="full">
          {conteo.operacional}
        </Badge>
      </Button>
    </HStack>
  );
}