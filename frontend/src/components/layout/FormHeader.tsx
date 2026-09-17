import type { ElementType } from 'react';
import { Heading, Icon } from '@chakra-ui/react';

interface FormHeaderProps {
  title: string;
  icon?: ElementType;
}

export const FormHeader = ({ title, icon }: FormHeaderProps) => (
  <Heading size="4xl" mb={15} textAlign="left" color="green" display="flex" alignItems="center">
    {icon && <Icon as={icon} style={{ display: 'inline', marginRight: 8 }} />}
    {title}
  </Heading>
);