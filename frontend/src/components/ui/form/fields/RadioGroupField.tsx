import { Field, HStack, RadioGroup, Text } from "@chakra-ui/react";

interface RadioGroupFieldProps {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: Array<{ label: string; value: string }>;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export const RadioGroupField = ({
  label,
  name,
  value,
  defaultValue,
  options,
  onChange,
  error,
  disabled = false,
}: RadioGroupFieldProps) => (
  <Field.Root>
    <Field.Label fontSize='md' fontFamily='sans-serif'>
      {label}
    </Field.Label>
    <RadioGroup.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(e) => onChange?.(e.value ?? "")}
      disabled={disabled}
    >
      <HStack gap={4} flexWrap='wrap'>
        {options.map((opt) => (
          <RadioGroup.Item
            key={opt.value}
            value={opt.value}
            colorPalette='green'
          >
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <RadioGroup.ItemText>{opt.label}</RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </HStack>
    </RadioGroup.Root>
    {error && (
      <Text color='red.500' fontSize='sm'>
        {error}
      </Text>
    )}
  </Field.Root>
);
