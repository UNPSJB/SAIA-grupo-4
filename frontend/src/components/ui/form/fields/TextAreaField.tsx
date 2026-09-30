import { Field, Text, Textarea } from "@chakra-ui/react";

interface TextAreaFieldProps {
  label: string;
  placeholder?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  ref?: React.Ref<HTMLTextAreaElement>;
  error?: string;
  disabled?: boolean;
  rows?: number;
}

export const TextAreaField = ({
  label,
  placeholder,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  ref,
  error,
  disabled = false,
  rows = 5,
}: TextAreaFieldProps) => (
  <Field.Root>
    <Field.Label fontSize='md' fontFamily='sans-serif'>
      {label}
    </Field.Label>
    <Textarea
      name={name}
      placeholder={placeholder}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      ref={ref}
      readOnly={disabled}
      rows={rows}
    />
    {error && (
      <Text color='red.500' fontSize='sm'>
        {error}
      </Text>
    )}
  </Field.Root>
);