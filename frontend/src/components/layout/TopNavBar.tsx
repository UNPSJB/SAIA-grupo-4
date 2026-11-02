import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import { FiLogOut, FiMenu } from "react-icons/fi";

import { Breadcrumbs } from "./Breadcrumbs";
import { CampanaNotificaciones } from "./CampanaNotificaciones";

export const TOP_NAV_BAR_HEIGHT = "64px";

interface TopNavBarProps {
  onLogout?: () => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export const TopNavBar = ({
  onLogout,
  onMenuClick,
  showMenuButton = false,
}: TopNavBarProps) => {
  const { pathname } = useLocation();

  // Determinar si es admin o operador por la ruta actual
  // El admin tiene /dashboard como raíz, el operador /checklist
  const esOperador =
    pathname.startsWith("/checklist") ||
    pathname.startsWith("/lotes") ||
    pathname.startsWith("/recetas") ||
    pathname.startsWith("/documentos") ||
    pathname.startsWith("/incidentes-reportados");

  const homeLabel = esOperador ? "Checklist Diario" : "Dashboard";
  const homePath = esOperador ? "/checklist" : "/dashboard";

  const handleLogout = () => {
    onLogout?.();
  };

  return (
    <Flex
      as='header'
      position='sticky'
      top={0}
      zIndex='sticky'
      h={TOP_NAV_BAR_HEIGHT}
      px={4}
      align='center'
      justify='space-between'
      bg='white'
      borderBottomWidth='1px'
      borderBottomColor='gray.200'
      boxShadow='sm'
      flexShrink={0}
      _dark={{
        bg: "gray.800",
        borderBottomColor: "gray.700",
      }}
    >
      {/* Izquierda: menú (solo operador) + breadcrumbs */}
      <HStack align='center' gap={4} flex='1' minW={0}>
        {showMenuButton && onMenuClick && (
          <Button
            variant='ghost'
            size='sm'
            aria-label='Abrir menú'
            onClick={onMenuClick}
            color='gray.700'
            _hover={{ bg: "gray.50" }}
            _dark={{
              color: "gray.200",
              _hover: { bg: "gray.700" },
            }}
            display={{ base: 'flex', md: 'none' }}
          >
            <Icon as={FiMenu} boxSize={5} />
          </Button>
        )}

        <Box
          overflowX='auto'
          overflowY='hidden'
          flex='1'
          minW={0}
          pb={1}
          style={{ scrollbarWidth: "thin" }}
        >
          <Breadcrumbs homeLabel={homeLabel} homePath={homePath} />
        </Box>
      </HStack>

      {/* Derecha: campana (solo admin) + menú usuario */}
      <HStack align='center' gap={2} flexShrink={0}>
        {!esOperador && <CampanaNotificaciones />}

        {!esOperador && (
          <Box w='1px' h='20px' bg='gray.200' _dark={{ bg: "gray.700" }} />
        )}

        {/* Menú de usuario */}
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button
              variant='ghost'
              size='sm'
              h='36px'
              px={3}
              gap={2}
              color='gray.700'
              _hover={{ bg: "gray.50" }}
              _focus={{ bg: "gray.50" }}
              _dark={{
                color: "gray.200",
                _hover: { bg: "gray.700" },
                _focus: { bg: "gray.700" },
              }}
            >
              <Box
                w={8}
                h={8}
                borderRadius='full'
                bg='green.100'
                color='green.700'
                display='flex'
                alignItems='center'
                justifyContent='center'
                fontSize='xs'
                fontWeight='bold'
                flexShrink={0}
                _dark={{
                  bg: "green.900",
                  color: "green.200",
                }}
              >
                {esOperador ? "O" : "A"}
              </Box>
              <Text fontSize='sm' fontWeight='medium'>
                {esOperador ? "Operador" : "Administrador"}
              </Text>
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                w='220px'
                bg='white'
                borderColor='gray.200'
                boxShadow='lg'
                borderWidth='1px'
                _dark={{
                  bg: "gray.800",
                  borderColor: "gray.700",
                }}
              >
                <Menu.ItemGroup>
                  <Menu.Item
                    value='logout'
                    onSelect={handleLogout}
                    _focus={{ bg: "gray.50" }}
                    _hover={{ bg: "gray.50" }}
                    color='red.500'
                    _dark={{
                      _focus: { bg: "gray.700" },
                      _hover: { bg: "gray.700" },
                    }}
                  >
                    <HStack gap={2} align='center'>
                      <Icon as={FiLogOut} boxSize={4} color='red.500' />
                      <Text fontSize='sm' color='red.500'>
                        Cerrar sesión
                      </Text>
                    </HStack>
                  </Menu.Item>
                </Menu.ItemGroup>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
    </Flex>
  );
};
