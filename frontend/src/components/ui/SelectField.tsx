import {
  Field,
  NativeSelectRoot,
  NativeSelectField,
  Text,
} from "@chakra-ui/react";

interface SelectFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ label: string; value: string }>;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onFocus?: React.FocusEventHandler<HTMLSelectElement>;
  onClick?: React.MouseEventHandler<HTMLSelectElement>;
}

export const SelectField = ({
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  disabled = false,
  readOnly = false,
  onFocus,
  onClick,
}: SelectFieldProps) => (
  <Field.Root>
    <Field.Label fontSize='md' fontFamily='sans-serif'>
      {label}
    </Field.Label>
    <NativeSelectRoot disabled={disabled}>
      <NativeSelectField
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onClick={onClick}
        aria-readonly={readOnly}
        onMouseDown={
          readOnly || disabled
            ? (e: React.MouseEvent<HTMLSelectElement>) => e.preventDefault()
            : undefined
        }
        onKeyDown={
          readOnly || disabled
            ? (e: React.KeyboardEvent<HTMLSelectElement>) => e.preventDefault()
            : undefined
        }
        tabIndex={readOnly || disabled ? -1 : undefined}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelectField>
    </NativeSelectRoot>
    {error && (
      <Text color='red.500' fontSize='sm'>
        {error}
      </Text>
    )}
  </Field.Root>
);
