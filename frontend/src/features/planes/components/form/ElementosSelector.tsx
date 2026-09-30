import { CheckboxGroupField } from "../../../../components/ui";
import { ResourceDetailSection } from "./ResourceDetailSection";
import type { OpcionRecurso } from "../../types";

interface ElementosSelectorProps {
  opciones: OpcionRecurso[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  cantidades: Record<string, string>;
  erroresCantidad: Record<string, string>;
  onActualizarCantidad: (id: number, texto: string) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Selección de elementos de limpieza con el detalle por elemento: la cantidad
 * requerida. El checkbox group es de selección múltiple.
 */
export const ElementosSelector = ({
  opciones,
  seleccionados,
  onChange,
  cantidades,
  erroresCantidad,
  onActualizarCantidad,
  disabled,
  error,
}: ElementosSelectorProps) => {
  const items = opciones.map((opt) => ({
    id: Number(opt.value),
    nombre: opt.label,
  }));

  return (
    <>
      <CheckboxGroupField
        label="Elementos de Limpieza"
        disabled={disabled}
        value={seleccionados.map(String)}
        onChange={(selected) => onChange(selected.map(Number))}
        options={opciones}
        error={error}
      />

      <ResourceDetailSection
        title="Cantidad requerida por elemento seleccionado"
        items={items}
        selectedIds={seleccionados}
        getError={(id) => erroresCantidad[String(id)]}
        disabled={disabled}
        getInputs={(item) => [
          {
            label: "Cantidad",
            value: cantidades[String(item.id)] ?? "1",
            onChange: (v) => onActualizarCantidad(item.id, v),
            placeholder: "1",
            inputProps: {
              textAlign: "center",
              w: "55px",
              size: "xs",
            },
          },
        ]}
      />
    </>
  );
};
