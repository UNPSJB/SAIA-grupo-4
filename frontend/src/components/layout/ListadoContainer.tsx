import { Box, type BoxProps } from "@chakra-ui/react";

interface ListadoContainerProps extends BoxProps {
  maxW?: BoxProps["maxW"];
}

export const ListadoContainer = ({
  children,
  maxW,
  ...rest
}: ListadoContainerProps) => (
  <Box
    w="full"
    minW={0}
    maxW={maxW}
    mx={maxW ? "auto" : undefined}
    p={{ base: 4, md: 6 }}
    borderWidth="1px"
    borderRadius="lg"
    boxShadow="lg"
    {...rest}
  >
    {children}
  </Box>
);