import { Fragment, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  Box,
  Button,
  Drawer,
  Flex,
  HStack,
  Icon,
  IconButton,
  Portal,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";

import { AlertConfirm } from "../ui";
import { useAuth } from "../../features/auth/useAuth";

// Un ítem de la navegación del operador. Se recibe como lista para poder sumar secciones nuevas en el futuro sin tocar este componente.
export interface OperadorNavItem {
  to: string;
  label: string;
  icon: ElementType;
}

const defaultItems: OperadorNavItem[] = [
  { to: "/checklist", label: "Checklist Diario", icon: FiCheckSquare },
  { to: "/documentos", label: "Documentos", icon: FiFileText },
];

// Igual criterio que el NavBar del admin: mantiene activo el ítem también en subrutas (p. ej. el visor de PDF depende de /documentos).
const isActiveRoute = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

// Alto fijo de la barra superior móvil. El visor de PDF lo usa para calcular su alto útil y no desbordar la pantalla.
export const OPERADOR_MOBILE_BAR_HEIGHT = "56px";

const NavTooltip = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Tooltip.Root openDelay={200} positioning={{ placement: "right" }}>
    <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <Tooltip.Positioner>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip.Positioner>
  </Tooltip.Root>
);

interface OperadorLayoutProps {
  children: ReactNode;
  items?: OperadorNavItem[];
  title?: string;
  brandIcon?: ElementType;
}

 // Layout del operador (usuario que opera pero no administra).
export const OperadorLayout = ({
  children,
  items = defaultItems,
  title = "SAIA-4",
  brandIcon = FiShield,
}: OperadorLayoutProps) => {
  const { usuario, logout } = useAuth();
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrarSesionAbierto, setCerrarSesionAbierto] = useState(false);

  const nombreUsuario = usuario
    ? `${usuario.nombre} ${usuario.apellido}`.trim()
    : "";

  const sidebarW = isCollapsed ? "64px" : "260px";

  // onNavigate permite cerrar el Drawer al tocar un ítem en mobile
  const renderItems = (onNavigate?: () => void) => (
    <VStack align="stretch" gap={1} w="100%">
      {items.map((item) => {
        const active = isActiveRoute(pathname, item.to);
        const boton = (
          <Button
            asChild
            w="100%"
            justifyContent={isCollapsed ? "center" : "flex-start"}
            px={isCollapsed ? 0 : undefined}
            variant="ghost"
            bg={active ? "white" : undefined}
            color={active ? "green.700" : "white"}
            borderLeft="4px solid"
            borderLeftColor={active ? "green.400" : "transparent"}
            _hover={active ? { bg: "green.50" } : { bg: "whiteAlpha.200" }}
            focusRing="outside"
          >
            <NavLink
              to={item.to}
              onClick={onNavigate}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: 8,
                width: "100%",
              }}
            >
              <Icon as={item.icon} flexShrink={0} />
              {!isCollapsed && item.label}
            </NavLink>
          </Button>
        );

        return isCollapsed ? (
          <NavTooltip key={item.to} label={item.label}>
            {boton}
          </NavTooltip>
        ) : (
          <Fragment key={item.to}>{boton}</Fragment>
        );
      })}
    </VStack>
  );

  const bloqueUsuario = (onCerrarSesion?: () => void) => (
    <VStack align="stretch" gap={2}>
      <Flex
        align="center"
        justify={isCollapsed ? "center" : "flex-start"}
        gap={2}
        px={isCollapsed ? 0 : 2}
      >
        {isCollapsed ? (
          <NavTooltip label={nombreUsuario}>
            <Icon as={FiUser} boxSize={5} color="white" />
          </NavTooltip>
        ) : (
          <>
            <Icon as={FiUser} boxSize={5} color="white" flexShrink={0} />
            <Text color="white" fontSize="sm" truncate>
              {nombreUsuario}
            </Text>
          </>
        )}
      </Flex>

      {isCollapsed ? (
        <NavTooltip label="Cerrar sesión">
          <Button
            variant="ghost"
            color="white"
            w="100%"
            aria-label="Cerrar sesión"
            onClick={() => {
              onCerrarSesion?.();
              setCerrarSesionAbierto(true);
            }}
            _hover={{ bg: "whiteAlpha.200" }}
          >
            <Icon as={FiLogOut} />
          </Button>
        </NavTooltip>
      ) : (
        <Button
          variant="ghost"
          color="white"
          w="100%"
          justifyContent="flex-start"
          onClick={() => {
            onCerrarSesion?.();
            setCerrarSesionAbierto(true);
          }}
          _hover={{ bg: "whiteAlpha.200" }}
        >
          <Icon as={FiLogOut} />
          Cerrar sesión
        </Button>
      )}
    </VStack>
  );

  return (
    <Flex minH="100vh" w="100%">
      {/* Sidebar de escritorio (comprimible, igual que el NavBar del admin) */}
      <VStack
        as="nav"
        aria-label="Navegación del operador"
        align="stretch"
        gap={2}
        p={3}
        bg="green.600"
        h="100vh"
        w={sidebarW}
        position="sticky"
        top={0}
        flexShrink={0}
        overflowY="auto"
        overflowX="hidden"
        transition="width 0.25s ease"
        display={{ base: "none", md: "flex" }}
      >
        <Flex
          align="center"
          justify="space-between"
          gap={2}
          pb={3}
          mb={1}
          borderBottom="1px solid"
          borderColor="whiteAlpha.300"
        >
          {isCollapsed ? (
            <NavTooltip label="Expandir menú">
              <IconButton
                aria-label="Expandir menú"
                variant="ghost"
                color="white"
                size="sm"
                alignSelf="flex-start"
                onClick={() => setIsCollapsed(false)}
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <Icon as={FiChevronRight} />
              </IconButton>
            </NavTooltip>
          ) : (
            <>
              <Flex align="center" gap={2} minW={0}>
                <Icon as={brandIcon} boxSize={6} color="white" flexShrink={0} />
                <Text color="white" fontSize="xl" fontWeight="bold" whiteSpace="nowrap">
                  {title}
                </Text>
              </Flex>
              <NavTooltip label="Colapsar menú">
                <IconButton
                  aria-label="Colapsar menú"
                  variant="ghost"
                  color="white"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  _hover={{ bg: "whiteAlpha.200" }}
                >
                  <Icon as={FiChevronLeft} />
                </IconButton>
              </NavTooltip>
            </>
          )}
        </Flex>

        {!isCollapsed && (
          <Text fontSize="sm" fontWeight="semibold" color="white" px={2} mt={2}>
            Navegación
          </Text>
        )}

        {renderItems()}

        <Box mt="auto" pt={3} borderTop="1px solid" borderColor="whiteAlpha.300">
          {bloqueUsuario()}
        </Box>
      </VStack>

      {/* Contenido */}
      <Flex direction="column" flex="1" minW="0">
        {/* Barra superior móvil */}
        <HStack
          as="header"
          display={{ base: "flex", md: "none" }}
          align="center"
          justify="space-between"
          bg="green.600"
          color="white"
          px={4}
          h={OPERADOR_MOBILE_BAR_HEIGHT}
          flexShrink={0}
          position="sticky"
          top={0}
          zIndex={10}
          boxShadow="sm"
        >
          <IconButton
            aria-label="Abrir menú"
            variant="ghost"
            color="white"
            onClick={() => setMenuAbierto(true)}
            _hover={{ bg: "whiteAlpha.200" }}
          >
            <FiMenu />
          </IconButton>
          <IconButton
            aria-label="Cerrar sesión"
            variant="ghost"
            color="white"
            onClick={() => setCerrarSesionAbierto(true)}
            _hover={{ bg: "whiteAlpha.200" }}
          >
            <FiLogOut />
          </IconButton>
        </HStack>

        <Box bg="gray.100" flex="1" minW="0">
          {children}
        </Box>
      </Flex>

      {/* Menú móvil */}
      <Drawer.Root
        open={menuAbierto}
        onOpenChange={(e) => setMenuAbierto(e.open)}
        placement="start"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg="green.600">
              <Drawer.Header borderColor="whiteAlpha.300">
                <HStack justify="space-between" w="100%">
                  <HStack gap={2}>
                    <Icon as={brandIcon} boxSize={5} color="white" />
                    <Drawer.Title color="white" fontSize="lg" fontWeight="bold">
                      {title}
                    </Drawer.Title>
                  </HStack>
                  <Drawer.CloseTrigger asChild>
                    <IconButton
                      aria-label="Cerrar menú"
                      variant="ghost"
                      color="white"
                      size="sm"
                      _hover={{ bg: "whiteAlpha.200" }}
                    >
                      <FiX />
                    </IconButton>
                  </Drawer.CloseTrigger>
                </HStack>
              </Drawer.Header>

              <Drawer.Body>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color="white"
                  px={2}
                  mb={2}
                >
                  Navegación
                </Text>
                {renderItems(() => setMenuAbierto(false))}
              </Drawer.Body>

              <Drawer.Footer borderColor="whiteAlpha.300">
                {bloqueUsuario(() => setMenuAbierto(false))}
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <AlertConfirm
        open={cerrarSesionAbierto}
        title="Cerrar sesión"
        message="¿Estás seguro de que querés cerrar tu sesión?"
        onConfirm={() => {
          setCerrarSesionAbierto(false);
          logout();
        }}
        onCancel={() => setCerrarSesionAbierto(false)}
      />
    </Flex>
  );
};
