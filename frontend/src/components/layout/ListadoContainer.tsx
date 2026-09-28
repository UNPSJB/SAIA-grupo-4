import { Box } from "@chakra-ui/react";

interface ListadoContainerProps {
  children: React.ReactNode;
  maxW?: string;
  mt?: number;
}

export const ListadoContainer = ({
  children,
  maxW = "4xl",
  mt = 20,
  ...rest
}: ListadoContainerProps) => (
  <Box
    maxW={maxW}
    mx="auto"
    mt={mt}
    p={10}
    borderWidth="1px"
    borderRadius="lg"
    boxShadow="lg"
    {...rest}
  >
    {children}
  </Box>
);