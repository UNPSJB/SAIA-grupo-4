import { Box } from '@chakra-ui/react';

interface FormContainerProps {
  children: React.ReactNode;
  className?: string;
  /** any other props you want to spread */
  modal?: boolean;
}

export const FormContainer = ({
  children,
  className,
  modal = false,
  ...rest
}: FormContainerProps) => (
  <Box
    maxW={modal ? "100%" : "xl"}
    mx="auto"
    mt={modal ? 0 : 20}
    p={modal ? 6 : 20}
    borderWidth={modal ? 0 : "1px"}
    borderRadius={modal ? "none" : "lg"}
    boxShadow={modal ? "none" : "lg"}
    className={className}
    {...rest}
  >
    {children}
  </Box>
);