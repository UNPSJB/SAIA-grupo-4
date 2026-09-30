import {
  Field,
  NativeSelectRoot,
  NativeSelectField,
  Text,
} from "@chakra-ui/react";

interface SelectFieldProps {
  label: string;
  placeholder?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  ref?: React.Ref<HTMLSelectElement>;
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
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  ref,
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
        name={name}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
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