import { Button, Flex, HStack, Icon } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";
import { Breadcrumbs } from "./Breadcrumbs";
import { CampanaNotificaciones } from "./CampanaNotificaciones";

interface TopNavBarProps {
  onLogout?: () => void;
}

export const TopNavBar = ({ onLogout }: TopNavBarProps) => (
  <Flex
    as='header'
    position='sticky'
    top={0}
    zIndex='sticky'
    h='56px'
    px={4}
    align='center'
    justify='space-between'
    bg='white'
    borderBottomWidth='1px'
    flexShrink={0}
  >
    <Breadcrumbs />
    <HStack gap={2}>
      <CampanaNotificaciones />
      <Button variant='ghost' size='sm' onClick={onLogout}>
        <Icon as={FiLogOut} /> Cerrar sesión
      </Button>
    </HStack>
  </Flex>
);
