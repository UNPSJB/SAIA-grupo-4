import type { ElementType } from "react";
import { Button, Tooltip } from "@chakra-ui/react";

interface RowActionButtonProps {
  icon: ElementType;
  label: string;
  colorPalette: string;
  onClick: () => void;
  visible?: boolean;
  // Texto del tooltip al posar el mouse (mismo patrón que NavTooltip)
  title?: string;
}

export const RowActionButton = ({
  icon: Icon,
  label,
  colorPalette,
  onClick,
  visible = true,
  title,
}: RowActionButtonProps) => {
  if (!visible) return null;

  const boton = (
    <Button
      size="sm"
      variant="ghost"
      colorPalette={colorPalette}
      onClick={onClick}
      aria-label={label}
    >
      <Icon />
    </Button>
  );

  // Si el módulo no define un texto más descriptivo, el tooltip usa la acción.
  return (
    <Tooltip.Root openDelay={200}>
      <Tooltip.Trigger asChild>{boton}</Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{title ?? label}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
};
