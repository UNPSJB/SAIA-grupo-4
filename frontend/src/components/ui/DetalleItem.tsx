import { HStack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface DetalleItemProps {
  label: string;
  children: ReactNode;
}

export const DetalleItem = ({ label, children }: DetalleItemProps) => (
  <HStack align='baseline' gap={2}>
    <Text as='span' color='fg.muted'>•</Text>
    <Text as='span' fontWeight='semibold'>{label}:</Text>
    <Text as='span'>{children}</Text>
  </HStack>
);