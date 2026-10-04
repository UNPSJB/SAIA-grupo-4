import { Input } from "@chakra-ui/react";

interface FiltroTextoProps {
  /** Texto para lectores de pantalla. Es el nombre del filtro, no un label visible. */
  ariaLabel: string;
  placeholder: string;
  value: string;
  onChange: (valor: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/**
 * Input de búsqueda compacto para la barra de filtros.
 *
 * Pensado para los listados que hoy no filtran (personal, equipos,
 * documentación). Enter dispara el filtro, igual que "Filtrar", para no
 * depender del mouse.
 */
export const FiltroTexto = ({
  ariaLabel,
  placeholder,
  value,
  onChange,
  onKeyDown,
  disabled = false,
}: FiltroTextoProps) => (
  <Input
    size='sm'
    aria-label={ariaLabel}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    disabled={disabled}
    w='auto'
    minW='12rem'
    bg='white'
  />
);