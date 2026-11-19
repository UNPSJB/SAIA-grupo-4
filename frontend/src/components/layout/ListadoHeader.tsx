import type { ElementType, ReactNode } from "react";
import { Button, Flex, Heading, Icon } from "@chakra-ui/react";
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
  <Flex justify="space-between" align={{ base: "flex-start", md: "center" }}
    wrap="wrap" gap={3} mb={{ base: 4, md: 5 }}>
    <Heading size={{ base: "xl", md: "2xl" }} color="green">
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
  </Flex>
);