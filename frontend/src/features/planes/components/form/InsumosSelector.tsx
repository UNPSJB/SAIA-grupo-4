import { CheckboxGroupField } from "../../../../components/ui";
import { ResourceDetailSection } from "./ResourceDetailSection";
import type { InsumoQuimicoCatalogo, OpcionRecurso } from "../../types";

interface InsumosSelectorProps {
  opciones: OpcionRecurso[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  consumos: Record<string, string>;
  diluciones: Record<string, string>;
  erroresConsumo: Record<string, string>;
  recursosInsumos: InsumoQuimicoCatalogo[];
  onActualizarConsumo: (id: number, texto: string) => void;
  onActualizarDilucion: (id: number, texto: string) => void;
  disabled?: boolean;
}

/**
 * Selección de insumos químicos con el detalle por insumo: consumo (obligatorio)
 * y dilución (opcional). El selector solo gestiona la lista de checkboxes;
 * el padre decide qué pasa al deseleccionar mediante `onChange`.
 */
export const InsumosSelector = ({
  opciones,
  seleccionados,
  onChange,
  consumos,
  diluciones,
  erroresConsumo,
  recursosInsumos,
  onActualizarConsumo,
  onActualizarDilucion,
  disabled,
}: InsumosSelectorProps) => {
  // El detalle se arma sobre las opciones ya deduplicadas que recibió el padre.
  const items = opciones.map((opt) => ({
    id: Number(opt.value),
    nombre: opt.label,
  }));

  return (
    <>
      <CheckboxGroupField
        label="Insumos Químicos"
        disabled={disabled}
        value={seleccionados.map(String)}
        onChange={(selected) => onChange(selected.map(Number))}
        options={opciones}
      />

      <ResourceDetailSection
        title="Consumo y dilución por insumo seleccionado"
        items={items}
        selectedIds={seleccionados}
        getError={(id) => erroresConsumo[String(id)]}
        disabled={disabled}
        getInputs={(item) => {
          const insumo = recursosInsumos.find((i) => i.id === item.id);
          const unidad =
            insumo?.unidad_medida?.simbolo ?? insumo?.unidad_medida?.nombre;

          return [
            {
              label: "Consumo",
              value: consumos[String(item.id)] ?? "",
              onChange: (v) => onActualizarConsumo(item.id, v),
              placeholder: "Ej. 1",
              hint: unidad,
              inputProps: {
                textAlign: "center",
                w: "55px",
                size: "xs",
              },
            },
            {
              label: "Dilución",
              value: diluciones[String(item.id)] ?? "",
              onChange: (v) => onActualizarDilucion(item.id, v),
              placeholder: "Ej. 1:10",
              inputProps: {
                maxLength: 100,
                w: "20",
                size: "sm",
              },
            },
          ];
        }}
      />
    </>
  );
};
