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

  // Sin title se devuelve el botón tal cual: los módulos que no pasan título no ganan ningún tooltip.
  if (!title) return boton;

  return (
    <Tooltip.Root openDelay={200}>
      <Tooltip.Trigger asChild>{boton}</Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{title}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
};
