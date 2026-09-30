import {
  CheckboxGroupField,
  SelectField,
  TextField,
} from "../../../../components/ui";
import { DIAS_SEMANA } from "../../constants";
import type { Periodicidad } from "../../types";

interface FrecuenciaSelectorProps {
  periodicidad: Periodicidad | undefined;
  onChangePeriodicidad: (value: string) => void;
  dias: string[];
  onChangeDias: (dias: string[]) => void;
  /** Valor crudo del campo día del mes (string, tal como lo emite el input) */
  diaMes?: string;
  onChangeDiaMes: (value: string) => void;
  disabled: boolean;
  errorPeriodicidad?: string;
  errorDias?: string;
  errorDiaMes?: string;
}

const OPCIONES_PERIODICIDAD = [
  { label: "Diaria", value: "diaria" },
  { label: "Semanal", value: "semanal" },
  { label: "Mensual", value: "mensual" },
  { label: "Días Específicos", value: "dias-especificos" },
];

const OPCIONES_DIAS = DIAS_SEMANA.map((d) => ({
  label: d.label,
  value: d.value,
}));

/**
 * Selector de periodicidad con los campos que dependen de la opción elegida:
 * - diaria: sin campo adicional
 * - semanal: CheckboxGroup de selección única (un día de la semana)
 * - mensual: TextField con el día del mes (1-31)
 * - dias-especificos: CheckboxGroup de selección múltiple
 */
export const FrecuenciaSelector = ({
  periodicidad,
  onChangePeriodicidad,
  dias,
  onChangeDias,
  diaMes,
  onChangeDiaMes,
  disabled,
  errorPeriodicidad,
  errorDias,
  errorDiaMes,
}: FrecuenciaSelectorProps) => (
  <>
    <SelectField
      label="Periodicidad"
      placeholder="Seleccione una periodicidad"
      readOnly={disabled}
      options={OPCIONES_PERIODICIDAD}
      error={errorPeriodicidad}
      value={periodicidad}
      onChange={(e) => onChangePeriodicidad(e.target.value)}
    />

    {periodicidad === "semanal" && (
      <CheckboxGroupField
        label="Día de la semana"
        disabled={disabled}
        seleccionUnica
        value={dias.slice(-1)}
        onChange={onChangeDias}
        options={OPCIONES_DIAS}
        error={errorDias}
      />
    )}

    {periodicidad === "mensual" && (
      <TextField
        label="Día del mes (1-31)"
        disabled={disabled}
        value={diaMes ?? ""}
        placeholder="Ej. 15"
        error={errorDiaMes}
        onChange={(e) => onChangeDiaMes(e.target.value)}
      />
    )}

    {periodicidad === "dias-especificos" && (
      <CheckboxGroupField
        label="Días de la semana"
        disabled={disabled}
        value={dias}
        onChange={onChangeDias}
        options={OPCIONES_DIAS}
        error={errorDias}
      />
    )}
  </>
);
