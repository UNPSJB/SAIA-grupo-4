import { HStack, Button, Badge } from "@chakra-ui/react";
import type { TipoPoes } from "../types";

export type FiltroChecklist = "todos" | TipoPoes;

interface ChecklistFiltrosProps {
  filtroActual: FiltroChecklist;
  onCambiarFiltro: (filtro: FiltroChecklist) => void;
  conteo: Record<FiltroChecklist, number>;
}

const FILTROS: Array<{ valor: FiltroChecklist; label: string }> = [
  { valor: "todos", label: "Todos" },
  { valor: "pre_operacional", label: "Pre-operacional" },
  { valor: "operacional", label: "Operacional" },
  { valor: "post_operacional", label: "Post-operacional" },
];

export function ChecklistFiltros({
  filtroActual,
  onCambiarFiltro,
  conteo,
}: ChecklistFiltrosProps) {
  return (
    <HStack gap={2} mb={6} overflowX='auto' pb={1}>
      {FILTROS.map(({ valor, label }) => {
        const activo = filtroActual === valor;

        return (
          <Button
            key={valor}
            size='sm'
            variant={activo ? "solid" : "outline"}
            colorPalette={activo ? "green" : "gray"}
            onClick={() => onCambiarFiltro(valor)}
            borderRadius='full'
            px={4}
            whiteSpace='nowrap'
          >
            {label}
            <Badge
              ml={2}
              colorScheme={activo ? "whiteAlpha" : "gray"}
              borderRadius='full'
            >
              {conteo[valor]}
            </Badge>
          </Button>
        );
      })}
    </HStack>
  );
}
