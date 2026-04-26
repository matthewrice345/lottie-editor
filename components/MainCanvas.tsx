"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type { AnimationItem } from "lottie-web";
import { FileUpload } from "./ui/FileUpload";
import { useAnimation } from "@/lib/hooks/useAnimation";
import { Loading } from "./ui/Loading";
import {
  createBlankLottie,
  hitTestShape,
  importSvgLayers,
} from "@/lib/animation";
import { convertSvgString } from "@/lib/svg-converter";

const LottiePlayer = dynamic(
  () => import("./LottiePlayer").then((module) => module.LottiePlayer),
  { ssr: false },
);

const EXAMPLE_ANIMATION_URL = "/example-animation.json";

export const MainCanvas = () => {
  const {
    animationJson,
    isAnimationLoading,
    setAnimationJson,
    setSelectedShapePath,
  } = useAnimation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<AnimationItem | null>(null);

  const handleUpload = (file?: File) => {
    if (!file) return;
    const isSvg =
      file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e?.target?.result as string;
      try {
        if (isSvg) {
          const conv = await convertSvgString(text);
          const blank = createBlankLottie({
            width: Math.max(1, Math.round(conv.view_width)),
            height: Math.max(1, Math.round(conv.view_height)),
            name: file.name.replace(/\.svg$/i, ""),
          });
          const result = importSvgLayers(blank, {
            shapes_per_layer: [conv.shapes],
            layer_names: [file.name.replace(/\.svg$/i, "")],
          });
          setAnimationJson(result.animation, file.name);
        } else {
          setAnimationJson(JSON.parse(text), file.name);
        }
      } catch (err) {
        console.error("[upload] failed to parse file", err);
        alert(
          `Failed to load ${file.name}: ${(err as Error).message}\n\n` +
            `For .json files, the content must be valid lottie JSON. ` +
            `For .svg files, the content must be valid SVG markup.`,
        );
      }
    };
    reader.readAsText(file);
  };

  const handleTryAnimationClick = async () => {
    const animationJson = await fetch(EXAMPLE_ANIMATION_URL).then((res) =>
      res.json(),
    );
    setAnimationJson(animationJson, "example-animation.json");
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!animationJson || !canvasRef.current) return;
    // Don't intercept clicks on the player's playback controls.
    const target = e.target as HTMLElement;
    if (target.closest("button, input, [role='slider']")) return;

    // Find the lottie animation SVG specifically — the player has other
    // small SVGs (control icons). The lottie SVG's viewBox matches the
    // animation dimensions; pick the largest as a fallback.
    const lottieW = animationJson.w;
    const lottieH = animationJson.h;
    if (!lottieW || !lottieH) return;
    const expectedViewBox = `0 0 ${lottieW} ${lottieH}`;
    const svgs = canvasRef.current.querySelectorAll("svg");
    let svg: SVGSVGElement | null = null;
    for (const s of Array.from(svgs)) {
      if (s.getAttribute("viewBox") === expectedViewBox) {
        svg = s;
        break;
      }
    }
    if (!svg) {
      // Fallback: pick the largest SVG
      let bestArea = 0;
      for (const s of Array.from(svgs)) {
        const r = s.getBoundingClientRect();
        if (r.width * r.height > bestArea) {
          bestArea = r.width * r.height;
          svg = s;
        }
      }
    }
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Lottie player uses preserveAspectRatio="xMidYMid meet" — content is
    // centered and scaled to fit while preserving aspect ratio.
    const scale = Math.min(rect.width / lottieW, rect.height / lottieH);
    const renderedW = lottieW * scale;
    const renderedH = lottieH * scale;
    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;
    const lx = (px - offsetX) / scale;
    const ly = (py - offsetY) / scale;

    if (lx < 0 || ly < 0 || lx > lottieW || ly > lottieH) {
      setSelectedShapePath("");
      return;
    }

    const currentFrame = Math.round(lottieRef.current?.currentFrame ?? 0);
    const hit = hitTestShape(animationJson, lx, ly, currentFrame);
    setSelectedShapePath(hit ? hit.shape_path : "");
  };

  return (
    <div className="flex-1 p-4">
      <div className="flex h-full flex-col">
        <div className="mt-4 flex-1">
          <div className="flex h-full items-center justify-center flex-col">
            <Loading isLoading={isAnimationLoading} className="w-full h-full">
              {animationJson ? (
                <div
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="w-full"
                  title="Click a shape to select it in the layer panel"
                >
                  <LottiePlayer
                    src={animationJson}
                    onLottieReady={(item) => {
                      lottieRef.current = item;
                    }}
                  />
                </div>
              ) : (
                <>
                  <FileUpload onUpload={handleUpload} />
                  <button
                    className="mt-4 text-sm text-muted-foreground hover:underline"
                    onClick={handleTryAnimationClick}
                  >
                    or try an example animation
                  </button>
                </>
              )}
            </Loading>
          </div>
        </div>
      </div>
    </div>
  );
};
