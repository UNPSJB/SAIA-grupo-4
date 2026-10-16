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
 *
 * El ancho se fija en el `Root` y no en el `Field`: el `Root` trae
 * `width: 100%` por receta y, al ser el elemento flexible de la barra, se
 * estiraba y dejaba un hueco a la derecha de cada desplegable. Con el ancho en
 * el `Root`, cada control mide lo que necesita y quedan agrupados.
 */
export const FiltroSelect = ({
  ariaLabel,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
}: FiltroSelectProps) => (
  <NativeSelectRoot size='sm' disabled={disabled} w='auto' minW='9rem'>
    <NativeSelectField
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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