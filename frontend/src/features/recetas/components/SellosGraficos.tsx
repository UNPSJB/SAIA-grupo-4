import { Box, Flex, Text } from "@chakra-ui/react";

const OCTAGONO_CLIP_PATH =
  "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";

export const OctogonoReglamentario = ({ texto }: { texto: string }) => (
  <Box
    w="118px"
    h="118px"
    bg="white"
    p="3px"
    clipPath={OCTAGONO_CLIP_PATH}
    filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25))"
    flexShrink={0}
  >
    <Flex
      w="100%"
      h="100%"
      bg="gray.950"
      color="white"
      clipPath={OCTAGONO_CLIP_PATH}
      direction="column"
      align="center"
      justify="center"
      px={2.5}
      py={2}
      textAlign="center"
      gap={1.5}
    >
      <Text
        fontSize="11px"
        fontWeight="extrabold"
        lineHeight="1.15"
        letterSpacing="0.02em"
        textTransform="uppercase"
      >
        {texto}
      </Text>
      <Text
        fontSize="7px"
        fontWeight="semibold"
        letterSpacing="0.06em"
        textTransform="uppercase"
        color="gray.300"
      >
        MINISTERIO DE SALUD
      </Text>
    </Flex>
  </Box>
);

export const LeyendaRectangular = ({ texto }: { texto: string }) => (
  <Box
    bg="gray.950"
    color="white"
    borderWidth="2px"
    borderColor="white"
    outline="2px solid"
    outlineColor="gray.950"
    px={4}
    py={2}
    maxW="260px"
    textAlign="center"
    boxShadow="sm"
  >
    <Text
      fontSize="10px"
      fontWeight="bold"
      lineHeight="1.25"
      letterSpacing="0.03em"
      textTransform="uppercase"
    >
      {texto}
    </Text>
  </Box>
);
