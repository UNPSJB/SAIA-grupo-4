import { Box } from '@chakra-ui/react';

interface FormContainerProps {
  children: React.ReactNode;
  className?: string;
  /** any other props you want to spread */
}

export const FormContainer = ({
  children,
  className,
  ...rest
}: FormContainerProps) => (
  <Box
    maxW="xl"
    mx="auto"
    mt={20}
    p={20}
    borderWidth="1px"
    borderRadius="lg"
    boxShadow="lg"
    className={className}
    {...rest}
  >
    {children}
  </Box>
);