import { Field, Input, Text } from '@chakra-ui/react';

interface TextFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  disabled?: boolean;
}

export const TextField = ({
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
}: TextFieldProps) => (
  <Field.Root>
    <Field.Label fontSize="md" fontFamily="sans-serif">{label}</Field.Label>
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
    {error && <Text color="red.500" fontSize="sm">{error}</Text>}
  </Field.Root>
);