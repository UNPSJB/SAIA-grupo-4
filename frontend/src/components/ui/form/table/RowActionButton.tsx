import type { ElementType } from "react";
import { Button } from "@chakra-ui/react";

interface RowActionButtonProps {
  icon: ElementType;
  label: string;
  colorPalette: string;
  onClick: () => void;
  visible?: boolean;
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
  return (
    <Button
      size="sm"
      variant="ghost"
      colorPalette={colorPalette}
      onClick={onClick}
      title={title}
      aria-label={label}
    >
      <Icon />
    </Button>
  );
};