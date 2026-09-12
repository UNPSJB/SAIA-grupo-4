import { Button, Icon } from '@chakra-ui/react';
import type { ElementType } from 'react';

interface CancelButtonProps {
  text: string;
  icon?: ElementType;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  colorPalette?: string;
  variant?: 'solid' | 'outline' | 'ghost' | 'subtle' | 'surface' | 'plain';
}

export const CancelButton = ({
  text,
  icon,
  onClick,
  type = 'button',
  colorPalette = 'red',
  variant = 'outline',
}: CancelButtonProps) => (
  <Button
    onClick={onClick}
    type={type}
    colorPalette={colorPalette}
    variant={variant}
  >
    {icon && <Icon as={icon} style={{ display: 'inline', marginRight: 4 }} />}
    {text}
  </Button>
);