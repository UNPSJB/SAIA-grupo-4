import { Box } from "@chakra-ui/react";

interface ListadoContainerProps {
  children: React.ReactNode;
  maxW?: string;
}

export const ListadoContainer = ({
  children,
  maxW = "4xl",
  ...rest
}: ListadoContainerProps) => (
  <Box
    maxW={maxW}
    mx="auto"
    mt={20}
    p={10}
    borderWidth="1px"
    borderRadius="lg"
    boxShadow="lg"
    {...rest}
  >
    {children}
  </Box>
);