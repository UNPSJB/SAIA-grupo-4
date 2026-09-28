import type { ElementType, ReactNode } from "react";
import { Button, HStack, Heading, Icon } from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";

interface ListadoHeaderProps {
  title: string;
  icon?: ElementType;
  buttonLabel?: string;
  onCrear?: () => void;
  children?: ReactNode;
}

export const ListadoHeader = ({
  title,
  icon,
  buttonLabel,
  onCrear,
  children,
}: ListadoHeaderProps) => (
  <HStack justify="space-between" mb={6}>
    <Heading size="2xl" color="green">
      {icon && <Icon as={icon} style={{ display: "inline", marginRight: 8 }} />}
      {title}
    </Heading>
    {onCrear && (
      <Button colorPalette="green" onClick={onCrear}>
        <FiPlus />
        {buttonLabel}
      </Button>
    )}
    {children}
  </HStack>
);