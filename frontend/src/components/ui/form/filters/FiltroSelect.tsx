import { NativeSelectRoot, NativeSelectField } from "@chakra-ui/react";

interface FiltroSelectProps {
  /** Texto para lectores de pantalla. Es el nombre del filtro, no un label visible. */
  ariaLabel: string;
  /** Texto de la opción vacía, ej. "Todas las categorías". */
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
}

/**
 * Desplegable de filtro compacto, sin label visible.
 *
 * `SelectField` no sirve acá: exige `label` y siempre renderiza el
 * `Field.Label`, que es justo lo que hace que la barra de filtros ocupe dos
 * filas. El nombre del filtro va en `aria-label` y el control se identifica por
 * su opción vacía.
 */
export const FiltroSelect = ({
  ariaLabel,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
}: FiltroSelectProps) => (
  <NativeSelectRoot size='sm' disabled={disabled}>
    <NativeSelectField
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      w='auto'
      minW='9rem'
      bg='white'
    >
      <option value=''>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </NativeSelectField>
  </NativeSelectRoot>
);