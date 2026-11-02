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
import { FiLogOut, FiMenu } from "react-icons/fi";

import { Breadcrumbs } from "./Breadcrumbs";
import { CampanaNotificaciones } from "./CampanaNotificaciones";
import { useAuth } from "../../features/auth/useAuth";
import { esAdministrador, esOperador } from "../../features/auth/roles";

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
  const { usuario } = useAuth();

  // Determinar el rol real del usuario por sus capacidades, NO por la URL
  const esAdmin = esAdministrador(usuario);
  const esOp = esOperador(usuario);

  // Si tiene "administrar", es admin (aunque también tenga "operar")
  // Solo es operador puro si tiene "operar" PERO NO "administrar"
  const esSoloOperador = esOp && !esAdmin;

  // Home según rol real
  const homeLabel = esSoloOperador ? "Checklist Diario" : "Dashboard";
  const homePath = esSoloOperador ? "/checklist" : "/dashboard";

  // Nombre completo del usuario para mostrar
  const nombreUsuario = usuario
    ? `${usuario.nombre} ${usuario.apellido}`.trim()
    : "";
  const inicialUsuario = nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : (esSoloOperador ? "O" : "A");

  const handleLogout = () => {
    onLogout?.();
  };

  return (
    <Flex
      as="header"
      position="sticky"
      top={0}
      zIndex="sticky"
      h={TOP_NAV_BAR_HEIGHT}
      px={4}
      align="center"
      justify="space-between"
      bg="white"
      borderBottomWidth="1px"
      borderBottomColor="gray.200"
      boxShadow="sm"
      flexShrink={0}
      _dark={{
        bg: "gray.800",
        borderBottomColor: "gray.700",
      }}
    >
      {/* Izquierda: menú (solo operador puro) + breadcrumbs */}
      <HStack align="center" gap={4} flex="1" minW={0}>
        {showMenuButton && onMenuClick && esSoloOperador && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Abrir menú"
            onClick={onMenuClick}
            color="gray.700"
            _hover={{ bg: "gray.50" }}
            _dark={{
              color: "gray.200",
              _hover: { bg: "gray.700" },
            }}
            display={{ base: "flex", md: "none" }}
          >
            <Icon as={FiMenu} boxSize={5} />
          </Button>
        )}

        <Box
          overflowX="auto"
          overflowY="hidden"
          flex="1"
          minW={0}
          pb={1}
          style={{ scrollbarWidth: "thin" }}
        >
          <Breadcrumbs homeLabel={homeLabel} homePath={homePath} />
        </Box>
      </HStack>

      {/* Derecha: campana (solo admin real) + menú usuario */}
      <HStack align="center" gap={2} flexShrink={0}>
        {esAdmin && <CampanaNotificaciones />}

        {esAdmin && (
          <Box w="1px" h="20px" bg="gray.200" _dark={{ bg: "gray.700" }} />
        )}

        {/* Menú de usuario */}
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button
              variant="ghost"
              size="sm"
              h="36px"
              px={3}
              gap={2}
              color="gray.700"
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
                borderRadius="full"
                bg="green.100"
                color="green.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                fontWeight="bold"
                flexShrink={0}
                _dark={{
                  bg: "green.900",
                  color: "green.200",
                }}
              >
                {inicialUsuario}
              </Box>
              <Text fontSize="sm" fontWeight="medium" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxW="150px">
                {nombreUsuario || (esSoloOperador ? "Operador" : "Administrador")}
              </Text>
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                w="220px"
                bg="white"
                borderColor="gray.200"
                boxShadow="lg"
                borderWidth="1px"
                _dark={{
                  bg: "gray.800",
                  borderColor: "gray.700",
                }}
              >
                <Menu.ItemGroup>
                  <Menu.Item
                    value="logout"
                    onSelect={handleLogout}
                    _focus={{ bg: "gray.50" }}
                    _hover={{ bg: "gray.50" }}
                    color="red.500"
                    _dark={{
                      _focus: { bg: "gray.700" },
                      _hover: { bg: "gray.700" },
                    }}
                  >
                    <HStack gap={2} align="center">
                      <Icon as={FiLogOut} boxSize={4} color="red.500" />
                      <Text fontSize="sm" color="red.500">
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