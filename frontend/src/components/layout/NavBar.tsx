import { Fragment, useState } from "react";
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
  FiClipboard,
  FiClock,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiPlus,
  FiShield,
  FiThermometer,
  FiUser,
  FiMap,
  FiDroplet,
} from "react-icons/fi";
import { FaRuler } from "react-icons/fa";

interface LinkNavItem {
  to: string;
  label: string;
  icon: ElementType;
}

interface ParentNavItem {
  label: string;
  icon: ElementType;
  children: LinkNavItem[];
}

type NavItem = LinkNavItem | ParentNavItem;

interface NavBarProps {
  title?: string;
  brandIcon?: ElementType;
  items?: NavItem[];
  version?: string;
  username?: string;
  onLogout?: () => void;
}

const defaultItems: NavItem[] = [
  { to: "/equipos", label: "Equipos", icon: FiThermometer },
  { to: "/personal", label: "Personal", icon: FiUser },
  { to: "/sectores", label: "Sectores", icon: FiMap },
  {
    label: "Insumos",
    icon: FiPackage,
    children: [
      { to: "/insumos", label: "Insumos", icon: FiPackage },
      { to: "/insumos-quimicos", label: "Insumos Químicos", icon: FiDroplet },
    ],
  },
  { to: "/unidades-de-medida", label: "Unidades de medida", icon: FaRuler },
];

const planItems: NavItem[] = [
  { to: "/nuevo-plan", label: "Nuevo Plan", icon: FiPlus },
  { to: "/plan-poes", label: "Plan Vigente", icon: FiClipboard },
  { to: "/historial-planes", label: "Historial", icon: FiClock },
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

interface NavSectionProps {
  label: string;
  icon: ElementType;
  items: NavItem[];
  isCollapsed: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollapsedClick: () => void;
}

const NavSection = ({
  label,
  icon,
  items,
  isCollapsed,
  open,
  onOpenChange,
  onCollapsedClick,
}: NavSectionProps) => {
  const { pathname } = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  return (
    <Collapsible.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Collapsible.Trigger asChild>
        {isCollapsed ? (
          <NavTooltip label={label}>
            <IconButton
              aria-label={label}
              variant='ghost'
              color='white'
              w='100%'
              onClick={onCollapsedClick}
              _hover={{ bg: "whiteAlpha.200" }}
            >
              <Icon as={icon} />
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
              <Icon as={icon} />
              {label}
            </Flex>
            <Icon
              as={FiChevronRight}
              transform={open ? "rotate(90deg)" : "rotate(0deg)"}
              transition='transform 0.2s'
            />
          </Button>
        )}
      </Collapsible.Trigger>

      <Collapsible.Content>
        <VStack align='stretch' gap={1} mt={2}>
          {items.map((item) => {
            if ("children" in item) {
              const submenuOpen =
                openSubmenus[item.label] ??
                item.children.some((child) =>
                  isActiveRoute(pathname, child.to),
                );

              return (
                <Collapsible.Root
                  key={item.label}
                  open={submenuOpen}
                  onOpenChange={(event) =>
                    setOpenSubmenus((current) => ({
                      ...current,
                      [item.label]: event.open,
                    }))
                  }
                >
                  <Collapsible.Trigger asChild>
                    <Button
                      variant='plain'
                      color='white'
                      w='100%'
                      justifyContent={isCollapsed ? "center" : "space-between"}
                      _hover={{ bg: "whiteAlpha.200" }}
                    >
                      <Flex align='center' gap={2}>
                        <Icon as={item.icon} flexShrink={0} />
                        {!isCollapsed && item.label}
                      </Flex>
                      {!isCollapsed && (
                        <Icon
                          as={FiChevronRight}
                          transform={
                            submenuOpen ? "rotate(90deg)" : "rotate(0deg)"
                          }
                          transition='transform 0.2s'
                        />
                      )}
                    </Button>
                  </Collapsible.Trigger>

                  <Collapsible.Content>
                    <VStack align='stretch' gap={1} pl={isCollapsed ? 0 : 4}>
                      {item.children.map((child) => {
                        const childActive = isActiveRoute(pathname, child.to);
                        const childButton = (
                          <Button
                            asChild
                            w='100%'
                            justifyContent={
                              isCollapsed ? "center" : "flex-start"
                            }
                            variant='ghost'
                            bg={childActive ? "white" : undefined}
                            color={childActive ? "green.700" : "white"}
                            focusRing='outside'
                            _hover={
                              childActive
                                ? { bg: "green.50" }
                                : { bg: "whiteAlpha.200" }
                            }
                            transition='background 0.15s ease, color 0.15s ease'
                          >
                            <NavLink
                              to={child.to}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                              }}
                            >
                              <Icon as={child.icon} flexShrink={0} />
                              {!isCollapsed && child.label}
                            </NavLink>
                          </Button>
                        );

                        return isCollapsed ? (
                          <NavTooltip key={child.to} label={child.label}>
                            {childButton}
                          </NavTooltip>
                        ) : (
                          <Fragment key={child.to}>{childButton}</Fragment>
                        );
                      })}
                    </VStack>
                  </Collapsible.Content>
                </Collapsible.Root>
              );
            }

            const active = isActiveRoute(pathname, item.to);
            const navButton = (
              <Button
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
                _hover={active ? { bg: "green.50" } : { bg: "whiteAlpha.200" }}
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
  );
};

export const NavBar = ({
  title = "SAIA-4",
  brandIcon = FiShield,
  items = defaultItems,
  version = "v0.1.0",
  username = "Usuario",
  onLogout,
}: NavBarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [planOpen, setPlanOpen] = useState(true);

  const accordionOpen = isCollapsed ? true : navigationOpen;
  const planAccordionOpen = isCollapsed ? true : planOpen;
  const sidebarW = isCollapsed ? "64px" : "260px";

  const handleOpenChange = (open: boolean) => {
    if (!isCollapsed) setNavigationOpen(open);
  };

  const handlePlanOpenChange = (open: boolean) => {
    if (!isCollapsed) setPlanOpen(open);
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

      <NavSection
        label='Navegación'
        icon={FiMenu}
        items={items}
        isCollapsed={isCollapsed}
        open={accordionOpen}
        onOpenChange={handleOpenChange}
        onCollapsedClick={() => setIsCollapsed(false)}
      />

      <NavSection
        label='Plan POE'
        icon={FiClipboard}
        items={planItems}
        isCollapsed={isCollapsed}
        open={planAccordionOpen}
        onOpenChange={handlePlanOpenChange}
        onCollapsedClick={() => setIsCollapsed(false)}
      />

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
