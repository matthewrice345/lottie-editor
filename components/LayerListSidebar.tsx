"use client";

import { Plus } from "lucide-react";
import { getAnimationLayers } from "@/lib/animation";
import { useAnimation } from "@/lib/hooks/useAnimation";
import { LayerItem } from "./LayerItem";
import { Loading } from "./ui/Loading";
import { Skeleton } from "./ui/Skeleton";
import { Button } from "./ui/Button";

export const LayerListSidebar = () => {
  const { animationJson, isAnimationLoading, addShapeLayer } = useAnimation();
  const layers = animationJson ? getAnimationLayers(animationJson) : [];

  return (
    <div className="border-r bg-muted/40 p-4 min-w-52">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Layers</h3>
          {animationJson && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => addShapeLayer()}
              title="Add shape layer"
              aria-label="Add shape layer"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div
          className="flex flex-col gap-2 h-[calc(100vh-9rem)] overflow-x-scroll"
          style={{ scrollbarWidth: "none" }}
        >
          <Loading
            isLoading={isAnimationLoading}
            skeleton={<LayerListSkeleton />}
          >
            {layers.map((layer, i) => (
              <LayerItem
                key={i}
                layer={layer}
                layerIndex={i}
                totalLayers={layers.length}
              />
            ))}
          </Loading>
        </div>
      </div>
    </div>
  );
};

const LayerListSkeleton = () => {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </>
  );
};
