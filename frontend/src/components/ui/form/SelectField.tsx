import { Field, NativeSelectRoot, NativeSelectField, Text } from '@chakra-ui/react';

interface SelectFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ label: string; value: string }>;
  error?: string;
  disabled?: boolean;
}

export const SelectField = ({
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  disabled = false,
}: SelectFieldProps) => (
  <Field.Root>
    <Field.Label fontSize="md" fontFamily="sans-serif">{label}</Field.Label>
    <NativeSelectRoot disabled={disabled}>
      <NativeSelectField
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelectField>
    </NativeSelectRoot>
    {error && <Text color="red.500" fontSize="sm">{error}</Text>}
  </Field.Root>
);