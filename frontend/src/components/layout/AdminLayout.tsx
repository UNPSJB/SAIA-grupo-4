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
  VStack,
} from "@chakra-ui/react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiBookOpen,
  FiClipboard,
  FiClock,
  FiDroplet,
  FiGlobe,
  FiMap,
  FiPackage,
  FiPlus,
  FiShield,
  FiThermometer,
  FiUser,
  FiX,
  FiFileText,
  FiBarChart2,
} from "react-icons/fi";
import { MdOutlineCleaningServices } from "react-icons/md";

import { AlertConfirm } from "../ui";
import { useAuth } from "../../features/auth/useAuth";
import { TopNavBar, TOP_NAV_BAR_HEIGHT } from "./TopNavBar";
import { SideBar, type NavItem as SideBarNavItem } from "./SideBar";

// Un ítem de la navegación del admin (solo links, sin children).
export interface AdminNavItem {
  to: string;
  label: string;
  icon: ElementType;
}

// Ítems por defecto del admin para el Drawer móvil (plano, sin submenús).
const defaultMobileItems: AdminNavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: FiBarChart2 },
  { to: "/vista-publica", label: "Vista pública", icon: FiGlobe },
  { to: "/equipos", label: "Equipos", icon: FiThermometer },
  { to: "/personal", label: "Personal", icon: FiUser },
  { to: "/sectores", label: "Sectores", icon: FiMap },
  { to: "/insumos", label: "Insumos", icon: FiPackage },
  { to: "/insumos-quimicos", label: "Insumos Químicos", icon: FiDroplet },
  { to: "/elementos-limpieza", label: "Elementos de limpieza", icon: MdOutlineCleaningServices },
  { to: "/productos", label: "Productos", icon: FiPackage },
  { to: "/documentos", label: "Gestión documental", icon: FiFileText },
  { to: "/nuevo-plan", label: "Nuevo Plan", icon: FiPlus },
  { to: "/plan-poes", label: "Plan Vigente", icon: FiClipboard },
  { to: "/historial-planes", label: "Historial de planes", icon: FiClock },
  { to: "/nueva-receta", label: "Nueva Receta", icon: FiPlus },
  { to: "/recetas", label: "Recetas", icon: FiBookOpen },
  { to: "/vencimientos", label: "Vencimientos", icon: FiAlertCircle },
  { to: "/incidentes", label: "Incidentes", icon: FiAlertTriangle },
];

const isActiveRoute = (pathname: string, to: string) => {
  if (pathname === to) return true;
  if (to === "/lotes") return pathname === "/lotes";
  return pathname.startsWith(`${to}/`);
};

// Alto fijo de la barra superior (compartido con TopNavBar).
export const ADMIN_MOBILE_BAR_HEIGHT = TOP_NAV_BAR_HEIGHT;

interface AdminLayoutProps {
  children: ReactNode;
  /** Ítems para el SideBar de escritorio (pueden tener children para submenús). */
  sidebarItems?: SideBarNavItem[];
  /** Ítems para el Drawer móvil (lista plana). */
  mobileItems?: AdminNavItem[];
  checklistItems?: SideBarNavItem[];
  checklistColapsable?: boolean;
  loteItems?: SideBarNavItem[];
  loteColapsable?: boolean;
  title?: string;
  brandIcon?: ElementType;
}

// Layout del administrador (usuario con capacidad "administrar").
export const AdminLayout = ({
  children,
  sidebarItems,
  mobileItems = defaultMobileItems,
  checklistItems = [],
  checklistColapsable = true,
  loteItems = [],
  loteColapsable = true,
  title = "SAIA-4",
  brandIcon = FiShield,
}: AdminLayoutProps) => {
  const { usuario, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrarSesionAbierto, setCerrarSesionAbierto] = useState(false);

  const nombreUsuario = usuario
    ? `${usuario.nombre} ${usuario.apellido}`.trim()
    : "";

  // Renderizado de ítems para el Drawer móvil (lista plana)
  const renderMobileItems = (onNavigate?: () => void) => (
    <VStack align="stretch" gap={1} w="100%">
      {mobileItems.map((item) => {
        const active = isActiveRoute(pathname, item.to);
        const boton = (
          <Button
            asChild
            w="100%"
            justifyContent="flex-start"
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
                justifyContent: "flex-start",
                gap: 8,
                width: "100%",
              }}
            >
              <Icon as={item.icon} flexShrink={0} />
              {item.label}
            </NavLink>
          </Button>
        );

        return <Fragment key={item.to}>{boton}</Fragment>;
      })}
    </VStack>
  );

  const bloqueUsuario = (onCerrarSesion?: () => void) => (
    <VStack align="stretch" gap={2}>
      <Flex
        align="center"
        justify="flex-start"
        gap={2}
        px={2}
      >
        <Icon as={FiUser} boxSize={5} color="white" flexShrink={0} />
        <Text color="white" fontSize="sm" truncate>
          {nombreUsuario}
        </Text>
      </Flex>

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
        <Icon as={FiX} />
        Cerrar sesión
      </Button>
    </VStack>
  );

  return (
    <Flex minH="100vh" w="100%">
      {/* SideBar de escritorio (usando el componente SideBar existente) */}
      <SideBar
        title={title}
        brandIcon={brandIcon}
        items={sidebarItems ?? []}
        checklistItems={checklistItems}
        checklistColapsable={checklistColapsable}
        loteItems={loteItems}
        loteColapsable={loteColapsable}
        username={nombreUsuario}
        display={{ base: "none", md: "flex" }}
      />

      {/* Contenido */}
      <Flex direction="column" flex="1" minW="0">
        {/* TopNavBar compartida: visible en escritorio y móvil */}
        <TopNavBar
          onLogout={() => setCerrarSesionAbierto(true)}
          onMenuClick={() => setMenuAbierto(true)}
          showMenuButton={true}
        />

        <Box bg="gray.100" flex="1" minW="0">
          {children}
        </Box>
      </Flex>

      {/* Menú móvil (Drawer) */}
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
                {renderMobileItems(() => setMenuAbierto(false))}
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