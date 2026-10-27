import {
  CheckboxGroupField,
  type CheckboxGroupOption,
} from "../../../../components/ui";
import { ResourceDetailSection } from "./ResourceDetailSection";

interface EquiposPasoSelectorProps {
  opciones: CheckboxGroupOption[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  cantidades: Record<string, string>;
  erroresCantidad: Record<string, string>;
  onActualizarCantidad: (id: number, texto: string) => void;
  disabled?: boolean;
}

/**
 * Selección de equipos utilizados en el paso con el detalle por equipo:
 * cantidad entera requerida (por defecto "1" al marcar).
 */
export const EquiposPasoSelector = ({
  opciones,
  seleccionados,
  onChange,
  cantidades,
  erroresCantidad,
  onActualizarCantidad,
  disabled,
}: EquiposPasoSelectorProps) => {
  const items = opciones.map((opt) => ({
    id: Number(opt.value),
    nombre: opt.label,
  }));

  return (
    <>
      <CheckboxGroupField
        label="Equipos Utilizados"
        disabled={disabled}
        value={seleccionados.map(String)}
        onChange={(selected) => onChange(selected.map(Number))}
        options={opciones}
      />

      <ResourceDetailSection
        title="Cantidad requerida por equipo seleccionado"
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
              w: "60px",
              size: "xs",
              inputMode: "numeric",
            },
          },
        ]}
      />
    </>
  );
};
