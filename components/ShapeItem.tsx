import { useEffect, useState } from "react";
import { Eye, EyeOff, Group } from "lucide-react";
import { ShapeInfo } from "@/lib/animation";
import { useAnimation } from "@/lib/hooks/useAnimation";
import { SidebarItem } from "./SidebarItem";
import { ColorIcon } from "./ui/ColorIcon";
import { Button } from "./ui/Button";

interface ShapeItemProps {
  shape: ShapeInfo;
  depth?: number;
}

const containsSelected = (
  shape: ShapeInfo,
  selectedPath: string | null,
): boolean => {
  if (!selectedPath) return false;
  if (shape.path === selectedPath) return true;
  return shape.children.some((c) => containsSelected(c, selectedPath));
};

export const ShapeItem = ({ shape, depth = 0 }: ShapeItemProps) => {
  const { setSelectedShapePath, selectedShapePath, toggleShapeVisibility } =
    useAnimation();
  const isGroup = shape.children.length > 0;
  const isSelected = selectedShapePath === shape.path;
  const hasSelectedChild =
    isGroup && containsSelected(shape, selectedShapePath);

  // Auto-expand when a descendant is selected (e.g. via canvas click)
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (hasSelectedChild) setIsExpanded(true);
  }, [hasSelectedChild]);

  const handleClick = () => {
    if (isGroup) setIsExpanded(!isExpanded);
    else setSelectedShapePath(shape.path);
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleShapeVisibility(shape.path);
  };

  return (
    <div
      className="flex flex-col gap-2"
      style={{ paddingLeft: `${depth + 1}rem` }}
    >
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <SidebarItem
            onClick={handleClick}
            text={shape.name}
            className={
              isSelected
                ? "border-primary ring-1 ring-primary bg-accent"
                : shape.hidden
                  ? "opacity-50"
                  : undefined
            }
          >
            {isGroup ? (
              <Group className="h-4 w-4" />
            ) : (
              <ColorIcon color={shape.colorRgb} />
            )}
          </SidebarItem>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleToggleVisibility}
          aria-label={shape.hidden ? "Show shape" : "Hide shape"}
          title={shape.hidden ? "Show shape" : "Hide shape"}
        >
          {shape.hidden ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      </div>
      {isExpanded &&
        shape.children.map((nestedShape, i) => (
          <ShapeItem key={i} shape={nestedShape} depth={depth + 1} />
        ))}
    </div>
  );
};
