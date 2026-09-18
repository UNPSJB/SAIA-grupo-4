import { useState } from "react";
import type { ElementType } from "react";
import {
  Button,
  Collapsible,
  Flex,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiChevronRight,
  FiMenu,
  FiPackage,
  FiShield,
  FiTool,
} from "react-icons/fi";

interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
}

const items: NavItem[] = [
  { to: "/equipos", label: "Equipos", icon: FiTool },
  { to: "/insumos", label: "Insumos", icon: FiPackage },
];

export const NavBar = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(true);

  return (
    <VStack
      align='stretch'
      gap={2}
      p={4}
      bg='green.600'
      minH='100vh'
      w='240px'
      flexShrink={0}
    >
      <Flex
        align='center'
        gap={3}
        px={1}
        pb={4}
        mb={2}
        borderBottom='1px solid'
        borderColor='whiteAlpha.300'
      >
        <Icon as={FiShield} boxSize={6} color='white' />
        <Text color='white' fontSize='xl' fontWeight='bold'>
          SAIA
        </Text>
      </Flex>

      <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <Button
            variant='plain'
            color='white'
            borderColor='green.700'
            w='100%'
            justifyContent='space-between'
          >
            <Flex align='center' gap={2}>
              <Icon as={FiMenu} />
              Navegación
            </Flex>
            <Icon
              as={FiChevronRight}
              transform={open ? "rotate(90deg)" : "rotate(0deg)"}
              transition='transform 0.2s'
            />
          </Button>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <VStack align='stretch' gap={2} mt={2}>
            {items.map((item) => {
              const isActive = pathname.startsWith(item.to);
              return (
                <Button
                  key={item.to}
                  asChild
                  w='100%'
                  justifyContent='flex-start'
                  variant='solid'
                  colorPalette={isActive ? "teal" : "green"}
                  color={isActive ? undefined : "white"}
                >
                  <NavLink to={item.to}>
                    <Icon as={item.icon} />
                    {item.label}
                  </NavLink>
                </Button>
              );
            })}
          </VStack>
        </Collapsible.Content>
      </Collapsible.Root>
    </VStack>
  );
};
