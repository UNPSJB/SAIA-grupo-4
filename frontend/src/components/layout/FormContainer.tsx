import { Box } from '@chakra-ui/react';

interface FormContainerProps {
  children: React.ReactNode;
  className?: string;
  /** any other props you want to spread */
  modal?: boolean;
  /** Ancho máximo del contenedor. Por defecto es amplio dentro de modales. */
  maxW?: string;
}

export const FormContainer = ({
  children,
  className,
  modal = false,
  maxW,
  ...rest
}: FormContainerProps) => (
  <Box
    w="full"
    maxW={maxW ?? (modal ? "100%" : "xl")}
    mx="auto"
    p={modal ? 6 : { base: 6, md: 10 }}
    borderWidth={modal ? 0 : "1px"}
    borderRadius={modal ? "none" : "lg"}
    boxShadow={modal ? "none" : "lg"}
    className={className}
    {...rest}
  >
    {children}
  </Box>
);