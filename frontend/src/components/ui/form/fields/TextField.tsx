import { Field, Input, Text } from "@chakra-ui/react";

interface TextFieldProps {
  label: string;
  placeholder?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  ref?: React.Ref<HTMLInputElement>;
  error?: string;
  disabled?: boolean;
}

export const TextField = ({
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
}: TextFieldProps) => (
  <Field.Root>
    <Field.Label fontSize='md' fontFamily='sans-serif'>
      {label}
    </Field.Label>
    <Input
      type='text'
      name={name}
      placeholder={placeholder}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      ref={ref}
      readOnly={disabled}
    />
    {error && (
      <Text color='red.500' fontSize='sm'>
        {error}
      </Text>
    )}
  </Field.Root>
);