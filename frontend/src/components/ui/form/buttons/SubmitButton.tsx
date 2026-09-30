import { Button, Icon } from '@chakra-ui/react';

interface SubmitButtonProps {
  text: string;
  icon?: React.ElementType;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  colorPalette?: string;
  variant?: 'solid' | 'outline' | 'ghost' | 'subtle' | 'surface' | 'plain';
}

export const SubmitButton = ({
  text,
  icon,
  loading = false,
  onClick,
  type = 'button',
  colorPalette = 'green',
  variant = 'solid',
}: SubmitButtonProps) => (
  <Button
    onClick={onClick}
    type={type}
    colorPalette={colorPalette}
    variant={variant}
    loading={loading}
    loadingText={loading ? 'Guardando...' : undefined}
  >
    {icon && <Icon as={icon} style={{ display: 'inline', marginRight: 4 }} />}
    {text}
  </Button>
);