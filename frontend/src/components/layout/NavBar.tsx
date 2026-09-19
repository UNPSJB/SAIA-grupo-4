import { useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  Box,
  Button,
  Collapsible,
  Flex,
  Icon,
  IconButton,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiHash,
  FiShield,
  FiTool,
  FiUser,
} from "react-icons/fi";

interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
}

interface NavBarProps {
  title?: string;
  brandIcon?: ElementType;
  items?: NavItem[];
  version?: string;
  username?: string;
  onLogout?: () => void;
}

const defaultItems: NavItem[] = [
  { to: "/equipos", label: "Equipos", icon: FiTool },
  { to: "/insumos", label: "Insumos", icon: FiPackage },
  { to: "/unidades-de-medida", label: "Unidades de medida", icon: FiHash },
];

const isActiveRoute = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

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

export const NavBar = ({
  title = "SAIA",
  brandIcon = FiShield,
  items = defaultItems,
  version = "v0.1.0",
  username = "Usuario",
  onLogout,
}: NavBarProps) => {
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(true);

  const accordionOpen = isCollapsed ? true : navigationOpen;
  const sidebarW = isCollapsed ? "64px" : "260px";

  const handleOpenChange = (open: boolean) => {
    if (!isCollapsed) setNavigationOpen(open);
  };

  return (
    <VStack
      as='nav'
      aria-label='Navegación principal'
      align='stretch'
      gap={2}
      p={3}
      bg='green.600'
      h='100vh'
      w={sidebarW}
      position='sticky'
      top={0}
      flexShrink={0}
      overflowY='auto'
      overflowX='hidden'
      transition='width 0.25s ease'
    >
      <Flex
        align='center'
        justify='space-between'
        gap={2}
        pb={3}
        mb={1}
        borderBottom='1px solid'
        borderColor='whiteAlpha.300'
      >
        {isCollapsed ? (
          <NavTooltip label='Expandir menú'>
            <IconButton
              aria-label='Expandir menú'
              variant='ghost'
              color='white'
              size='sm'
              alignSelf='flex-start'
              onClick={() => setIsCollapsed(false)}
              _hover={{ bg: "whiteAlpha.200" }}
            >
              <Icon as={FiChevronRight} />
            </IconButton>
          </NavTooltip>
        ) : (
          <>
            <NavLink
              to='/'
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <Icon as={brandIcon} boxSize={6} color='white' flexShrink={0} />
              <Text
                color='white'
                fontSize='xl'
                fontWeight='bold'
                whiteSpace='nowrap'
              >
                {title}
              </Text>
            </NavLink>
            <NavTooltip label='Colapsar menú'>
              <IconButton
                aria-label='Colapsar menú'
                variant='ghost'
                color='white'
                size='sm'
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
        <Text fontSize='sm' fontWeight='semibold' color='white' px={2} mt={2}>
          Gestión
        </Text>
      )}

      <Collapsible.Root
        open={accordionOpen}
        onOpenChange={(e) => handleOpenChange(e.open)}
      >
        <Collapsible.Trigger asChild>
          {isCollapsed ? (
            <NavTooltip label='Navegación'>
              <IconButton
                aria-label='Navegación'
                variant='ghost'
                color='white'
                w='100%'
                onClick={() => setIsCollapsed(false)}
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <Icon as={FiMenu} />
              </IconButton>
            </NavTooltip>
          ) : (
            <Button
              variant='plain'
              color='white'
              w='100%'
              justifyContent='space-between'
              _hover={{ bg: "whiteAlpha.200" }}
            >
              <Flex align='center' gap={2}>
                <Icon as={FiMenu} />
                Navegación
              </Flex>
              <Icon
                as={FiChevronRight}
                transform={accordionOpen ? "rotate(90deg)" : "rotate(0deg)"}
                transition='transform 0.2s'
              />
            </Button>
          )}
        </Collapsible.Trigger>

        <Collapsible.Content>
          <VStack align='stretch' gap={1} mt={2}>
            {items.map((item) => {
              const active = isActiveRoute(pathname, item.to);
              const navButton = (
                <Button
                  key={item.to}
                  asChild
                  w='100%'
                  justifyContent={isCollapsed ? "center" : "flex-start"}
                  px={isCollapsed ? 0 : undefined}
                  variant='ghost'
                  bg={active ? "white" : undefined}
                  color={active ? "green.700" : "white"}
                  borderLeft='4px solid'
                  borderLeftColor={active ? "green.400" : "transparent"}
                  focusRing='outside'
                  _hover={
                    active ? { bg: "green.50" } : { bg: "whiteAlpha.200" }
                  }
                  transition='background 0.15s ease, color 0.15s ease'
                >
                  <NavLink
                    to={item.to}
                    style={{
                      display: "flex",
                      alignItems: "center",
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
                  {navButton}
                </NavTooltip>
              ) : (
                navButton
              );
            })}
          </VStack>
        </Collapsible.Content>
      </Collapsible.Root>

      <Box mt='auto' pt={3} borderTop='1px solid' borderColor='whiteAlpha.300'>
        <VStack align='stretch' gap={2}>
          <Flex
            align='center'
            justify={isCollapsed ? "center" : "flex-start"}
            gap={2}
            px={isCollapsed ? 0 : 2}
          >
            {isCollapsed ? (
              <NavTooltip label={username}>
                <Icon as={FiUser} boxSize={5} color='white' />
              </NavTooltip>
            ) : (
              <>
                <Icon as={FiUser} boxSize={5} color='white' flexShrink={0} />
                <Text color='white' fontSize='sm' truncate>
                  {username}
                </Text>
              </>
            )}
          </Flex>
          {isCollapsed ? (
            <NavTooltip label='Cerrar sesión'>
              <Button
                variant='ghost'
                color='white'
                w='100%'
                aria-label='Cerrar sesión'
                onClick={onLogout}
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <Icon as={FiLogOut} />
              </Button>
            </NavTooltip>
          ) : (
            <Button
              variant='ghost'
              color='white'
              w='100%'
              justifyContent='flex-start'
              onClick={onLogout}
              _hover={{ bg: "whiteAlpha.200" }}
            >
              <Icon as={FiLogOut} />
              Cerrar sesión
            </Button>
          )}
        </VStack>
        {!isCollapsed && (
          <Text fontSize='xs' color='whiteAlpha.600' textAlign='center' mt={2}>
            {version}
          </Text>
        )}
      </Box>
    </VStack>
  );
};
