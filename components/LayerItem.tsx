import { useEffect, useState } from "react";
import {
  Layers,
  Trash2,
  Plus,
  Square,
  Circle,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { LayerInfo, ShapeInfo } from "@/lib/animation";
import { ShapeItem } from "./ShapeItem";
import { SidebarItem } from "./SidebarItem";
import { Button } from "./ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { useAnimation } from "@/lib/hooks/useAnimation";

const DEFAULT_NEW_SHAPE_COLOR = { r: 128, g: 128, b: 128, a: 1 };

const layerContainsSelected = (
  shapes: ShapeInfo[],
  selectedPath: string | null,
): boolean => {
  if (!selectedPath) return false;
  for (const s of shapes) {
    if (s.path === selectedPath) return true;
    if (layerContainsSelected(s.children, selectedPath)) return true;
  }
  return false;
};

interface LayerListProps {
  layer: LayerInfo;
  layerIndex: number;
  totalLayers: number;
}

export const LayerItem = ({
  layer,
  layerIndex,
  totalLayers,
}: LayerListProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const {
    deleteLayer,
    addShape,
    toggleLayerVisibility,
    moveLayerBy,
    renameLayer,
    selectedShapePath,
  } = useAnimation();

  const isLayerItselfSelected = selectedShapePath === layer.path;
  const hasSelectedDescendant = layerContainsSelected(
    layer.shapes,
    selectedShapePath,
  );
  const isHighlighted = isLayerItselfSelected || hasSelectedDescendant;

  // Auto-expand when a descendant is selected (via canvas click, etc.)
  useEffect(() => {
    if (hasSelectedDescendant) setIsExpanded(true);
  }, [hasSelectedDescendant]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteLayer(layerIndex);
  };

  const handleAdd = (kind: "rect" | "ellipse") => {
    addShape(layerIndex, { kind, color: DEFAULT_NEW_SHAPE_COLOR });
    setAddOpen(false);
    setIsExpanded(true);
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLayerVisibility(layerIndex);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1">
          <SidebarItem
            text={layer.name}
            title={`${layer.path} — double-click to rename`}
            onClick={() => setIsExpanded(!isExpanded)}
            onRename={(name) => renameLayer(layerIndex, name)}
            className={
              isHighlighted
                ? "border-primary bg-accent"
                : layer.hidden
                  ? "opacity-50"
                  : undefined
            }
          >
            <Layers className="h-4 w-4" />
          </SidebarItem>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={layerIndex === 0}
          onClick={(e) => {
            e.stopPropagation();
            moveLayerBy(layerIndex, -1);
          }}
          title="Move forward (toward top)"
          aria-label="Move layer forward"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={layerIndex === totalLayers - 1}
          onClick={(e) => {
            e.stopPropagation();
            moveLayerBy(layerIndex, 1);
          }}
          title="Move backward (toward bottom)"
          aria-label="Move layer backward"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleVisibility}
          className="h-7 w-7"
          title={layer.hidden ? `Show ${layer.name}` : `Hide ${layer.name}`}
          aria-label={layer.hidden ? "Show layer" : "Hide layer"}
        >
          {layer.hidden ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={`Add shape to ${layer.name}`}
              aria-label={`Add shape to ${layer.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleAdd("rect")}
            >
              <Square className="h-4 w-4" />
              Rectangle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleAdd("ellipse")}
            >
              <Circle className="h-4 w-4" />
              Ellipse
            </Button>
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
          title={`Delete ${layer.name}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {isExpanded &&
        layer.shapes.map((shape, i) => (
          <ShapeItem
            key={i}
            shape={shape}
            siblingCount={layer.shapes.length}
          />
        ))}
    </div>
  );
};
