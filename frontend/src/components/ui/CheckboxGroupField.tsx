import { Checkbox, Fieldset, HStack, Text } from "@chakra-ui/react";

interface CheckboxGroupFieldProps {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string[];
  onChange: (selected: string[]) => void;
  seleccionUnica?: boolean;
  error?: string;
  disabled?: boolean;
}

export const CheckboxGroupField = ({
  label,
  options,
  value,
  onChange,
  seleccionUnica = false,
  error,
  disabled = false,
}: CheckboxGroupFieldProps) => (
  <Fieldset.Root disabled={disabled}>
    <Fieldset.Legend fontSize='md' fontFamily='sans-serif'>
      {label}
    </Fieldset.Legend>
    <Checkbox.Group
      value={value}
      onValueChange={(selected) =>
        onChange(seleccionUnica ? selected.slice(-1) : selected)
      }
      disabled={disabled}
    >
      <HStack gap={4} flexWrap='wrap'>
        {options.map((opt) => (
          <Checkbox.Root key={opt.value} value={opt.value} colorPalette='green'>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>{opt.label}</Checkbox.Label>
          </Checkbox.Root>
        ))}
      </HStack>
    </Checkbox.Group>
    {error && (
      <Text color='red.500' fontSize='sm'>
        {error}
      </Text>
    )}
  </Fieldset.Root>
);
