import {
  CheckboxGroupField,
  type CheckboxGroupOption,
} from "../../../../components/ui";
import { ResourceDetailSection } from "./ResourceDetailSection";

interface InsumosPasoSelectorProps {
  opciones: CheckboxGroupOption[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  consumos: Record<string, string>;
  erroresConsumo: Record<string, string>;
  unidadesPorInsumo: Record<number, string>;
  onActualizarConsumo: (id: number, texto: string) => void;
  disabled?: boolean;
}

/**
 * Selección de insumos teóricos del paso con el detalle por insumo:
 * cantidad / consumo estimado (obligatorio cuando está seleccionado) y su
 * unidad de medida al lado del input (ej: kg, gr, litros).
 */
export const InsumosPasoSelector = ({
  opciones,
  seleccionados,
  onChange,
  consumos,
  erroresConsumo,
  unidadesPorInsumo,
  onActualizarConsumo,
  disabled,
}: InsumosPasoSelectorProps) => {
  const items = opciones.map((opt) => ({
    id: Number(opt.value),
    nombre: opt.label,
  }));

  return (
    <>
      <CheckboxGroupField
        label="Insumos Teóricos"
        disabled={disabled}
        value={seleccionados.map(String)}
        onChange={(selected) => onChange(selected.map(Number))}
        options={opciones}
      />

      <ResourceDetailSection
        title="Consumo estimado por insumo seleccionado"
        items={items}
        selectedIds={seleccionados}
        getError={(id) => erroresConsumo[String(id)]}
        disabled={disabled}
        getInputs={(item) => [
          {
            label: "Consumo estimado",
            value: consumos[String(item.id)] ?? "",
            onChange: (v) => onActualizarConsumo(item.id, v),
            placeholder: "Ej. 1.5",
            hint: unidadesPorInsumo[item.id],
            inputProps: {
              textAlign: "center",
              w: "75px",
              size: "xs",
              inputMode: "decimal",
            },
          },
        ]}
      />
    </>
  );
};
