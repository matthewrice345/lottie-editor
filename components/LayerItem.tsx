import { useState } from "react";
import { Layers, Trash2, Plus, Square, Circle } from "lucide-react";
import { LayerInfo } from "@/lib/animation";
import { ShapeItem } from "./ShapeItem";
import { SidebarItem } from "./SidebarItem";
import { Button } from "./ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { useAnimation } from "@/lib/hooks/useAnimation";

const DEFAULT_NEW_SHAPE_COLOR = { r: 128, g: 128, b: 128, a: 1 };

interface LayerListProps {
  layer: LayerInfo;
  layerIndex: number;
}

export const LayerItem = ({ layer, layerIndex }: LayerListProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { deleteLayer, addShape } = useAnimation();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteLayer(layerIndex);
  };

  const handleAdd = (kind: "rect" | "ellipse") => {
    addShape(layerIndex, { kind, color: DEFAULT_NEW_SHAPE_COLOR });
    setAddOpen(false);
    setIsExpanded(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1">
          <SidebarItem text={layer.name} onClick={() => setIsExpanded(!isExpanded)}>
            <Layers className="h-4 w-4" />
          </SidebarItem>
        </div>
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
        layer.shapes.map((shape, i) => <ShapeItem key={i} shape={shape} />)}
    </div>
  );
};
