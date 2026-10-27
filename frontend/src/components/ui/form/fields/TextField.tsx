import { Field, Input, Text } from "@chakra-ui/react";

interface TextFieldProps {
  label: string;
  placeholder?: string;
  name?: string;
  /**
   * Tipo de input nativo. Por defecto `text`; para fecha usar `date` (abre el
   * calendario del navegador) y para numeros `number`. Antes estaba fijo en
   * `text`, lo que descartaba el `type` que pasaban los formularios.
   */
  type?: React.HTMLInputTypeAttribute;
  /** Limites nativos del input (utiles en `date` y `number`). */
  min?: string | number;
  max?: string | number;
  step?: string | number;
  value?: string;
  defaultValue?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
  /** Oculta las flechas nativas de los inputs numéricos. */
  hideSpinners?: boolean;
  ref?: React.Ref<HTMLInputElement>;
  error?: string;
  disabled?: boolean;
}

export const TextField = ({
  label,
  placeholder,
  name,
  type = 'text',
  min,
  max,
  step,
  value,
  defaultValue,
  onChange,
  onBlur,
  onKeyDown,
  onPaste,
  hideSpinners = false,
  ref,
  error,
  disabled = false,
}: TextFieldProps) => (
  <Field.Root>
    <Field.Label fontSize='md' fontFamily='sans-serif'>
      {label}
    </Field.Label>
    <Input
      type={type}
      min={min}
      max={max}
      step={step}
      name={name}
      placeholder={placeholder}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      ref={ref}
      css={
        hideSpinners
          ? {
              "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                display: "none",
              },
              "&": {
                MozAppearance: "textfield",
              },
            }
          : undefined
      }
      readOnly={disabled}
    />
    {error && (
      <Text color='red.500' fontSize='sm'>
        {error}
      </Text>
    )}
  </Field.Root>
);