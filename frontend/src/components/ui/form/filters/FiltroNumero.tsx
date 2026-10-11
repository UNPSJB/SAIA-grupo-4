import { Input } from "@chakra-ui/react";

interface FiltroNumeroProps {
  /** Texto para lectores de pantalla. Es el nombre del filtro, no un label visible. */
  ariaLabel: string;
  /** Texto cuando el filtro está vacío, ej. "Sin límite de días". */
  placeholder: string;
  /** Valor como texto: vacío significa "sin límite". */
  value: string;
  onChange: (valor: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/**
 * Input numérico compacto para la barra de filtros.
 *
 * Va como texto y no como número a propósito: el filtro "sin límite" tiene que
 * poder representarse, y `type='number'` con valor vacío es ambiguo entre "sin
 * límite" y "cero". La conversión a entero la hace quien arma el endpoint, así
 * que este control no decide nada: solo captura lo que se tipea.
 */
export const FiltroNumero = ({
  ariaLabel,
  placeholder,
  value,
  onChange,
  onKeyDown,
  disabled = false,
}: FiltroNumeroProps) => (
  <Input
    size='sm'
    aria-label={ariaLabel}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    disabled={disabled}
    inputMode='numeric'
    w='auto'
    minW='8rem'
    bg='white'
  />
);