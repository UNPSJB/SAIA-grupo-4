import {
  CheckboxGroupField,
  type CheckboxGroupOption,
} from "../../../../components/ui";
import {
  convertirEntreUnidades,
  type InfoUnidadInsumo,
} from "../../utils/unidadesPaso";
import { ResourceDetailSection } from "./ResourceDetailSection";

interface InsumosPasoSelectorProps {
  opciones: CheckboxGroupOption[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  consumos: Record<string, string>;
  erroresConsumo: Record<string, string>;
  unidadesPorInsumo: Record<number, string>;
  infoUnidadesPorInsumo: Record<number, InfoUnidadInsumo>;
  unidadesSeleccionadas: Record<string, string>;
  onActualizarConsumo: (id: number, texto: string) => void;
  onActualizarUnidad: (id: number, unidad: string) => void;
  disabled?: boolean;
}

/**
 * Selección de insumos teóricos del paso con el detalle por insumo:
 * cantidad / consumo estimado (obligatorio cuando está seleccionado) y selector
 * de unidad compatible (masa: kg/g/mg; volumen: L/ml) o texto fijo si es unidad.
 */
export const InsumosPasoSelector = ({
  opciones,
  seleccionados,
  onChange,
  consumos,
  erroresConsumo,
  unidadesPorInsumo,
  infoUnidadesPorInsumo,
  unidadesSeleccionadas,
  onActualizarConsumo,
  onActualizarUnidad,
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
        getInputs={(item) => {
          const info = infoUnidadesPorInsumo[item.id];
          const unidadElegida =
            unidadesSeleccionadas[String(item.id)] ?? info?.unidadDefault ?? "";
          const valorTexto = consumos[String(item.id)] ?? "";
          const valorNum = Number(valorTexto.trim().replace(",", "."));
          const mostrarConversion =
            info &&
            info.opcionesUnidad.length > 0 &&
            unidadElegida &&
            unidadElegida !== info.unidadDefault &&
            valorTexto.trim() !== "" &&
            Number.isFinite(valorNum) &&
            valorNum > 0;
          const convertido = mostrarConversion
            ? convertirEntreUnidades(valorNum, unidadElegida, info.simboloBase)
            : null;

          return [
            {
              label: "Consumo estimado",
              value: valorTexto,
              onChange: (v) => onActualizarConsumo(item.id, v),
              placeholder: "Ej. 1.5",
              hint: unidadesPorInsumo[item.id],
              selectUnit:
                info && info.opcionesUnidad.length > 0
                  ? {
                      value: unidadElegida,
                      options: info.opcionesUnidad,
                      onChange: (u) => onActualizarUnidad(item.id, u),
                    }
                  : undefined,
              helperNote:
                convertido !== null
                  ? `(= ${convertido.toLocaleString("es-AR", { maximumFractionDigits: 6 })} ${info.simboloBase})`
                  : undefined,
              inputProps: {
                textAlign: "center",
                w: "75px",
                size: "xs",
                inputMode: "decimal",
              },
            },
          ];
        }}
      />
    </>
  );
};
