import { Button, HStack } from "@chakra-ui/react";
import { FiRefreshCw } from "react-icons/fi";
import { SelectField } from "../../components/ui";
import type { CategoriaDisponible, EstadoVencimiento } from "./types";

const OPCIONES_ESTADO = [
  { label: "Todos los estados", value: "" },
  { label: "Vencidos", value: "vencido" },
  { label: "Próximos a vencer", value: "proximo" },
  { label: "Vigentes", value: "vigente" },
];

interface VencimientosFiltrosProps {
  estado: EstadoVencimiento | "";
  categoria: string;
  categorias: CategoriaDisponible[];
  onEstadoChange: (valor: EstadoVencimiento | "") => void;
  onCategoriaChange: (valor: string) => void;
  onLimpiar: () => void;
}

// Las categorias no se hardcodean: llegan de GET /vencimientos/categorias, que
// solo devuelve las que tienen provider registrado. Cuando E3/E4/E5 mergeen,
// este filtro las empieza a mostrar sin tocar el frontend.
export const VencimientosFiltros = ({
  estado,
  categoria,
  categorias,
  onEstadoChange,
  onCategoriaChange,
  onLimpiar,
}: VencimientosFiltrosProps) => {
  const hayFiltros = estado !== "" || categoria !== "";

  return (
    <HStack gap={3} align='flex-end' flexWrap='wrap'>
      <SelectField
        label='Estado'
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(e) =>
          onEstadoChange(e.target.value as EstadoVencimiento | "")
        }
      />

      <SelectField
        label='Categoría'
        options={[
          { label: "Todas las categorías", value: "" },
          ...categorias.map((c) => ({
            label: c.total > 0 ? `${c.nombre} (${c.total})` : c.nombre,
            value: String(c.valor),
          })),
        ]}
        value={categoria}
        onChange={(e) => onCategoriaChange(e.target.value)}
      />

      {hayFiltros && (
        <Button variant='outline' colorPalette='gray' onClick={onLimpiar}>
          <FiRefreshCw /> Limpiar filtros
        </Button>
      )}
    </HStack>
  );
};
