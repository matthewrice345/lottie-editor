import {
  Animation,
  Layer,
  Shape,
} from "@lottie-animation-community/lottie-types";
import { set, get } from "lodash-es";

const LayerTypes = {
  Shape: 4,
};

const ShapeTypes = {
  Fill: "fl",
  Stroke: "st",
  Group: "gr",
};

const defaultColor = { r: 0, g: 0, b: 0, a: 1 };

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface LayerInfo {
  path: string;
  name: string;
  shapes: ShapeInfo[];
}

export interface ShapeInfo {
  path: string;
  name: string;
  colorRgb: RgbaColor;
  children: ShapeInfo[];
}

export const getAnimationLayers = (animation: Animation): LayerInfo[] => {
  const layers = animation.layers;
  return layers.map((layer, i) => {
    const path = `layers.${i}`;
    const layerInfo: LayerInfo = {
      path: path,
      name: layer.nm || "Unnamed Layer",
      shapes: [],
    };
    switch (layer.ty) {
      case LayerTypes.Shape:
        layerInfo.shapes = getShapesFromLayer(
          (layer as Layer.Shape).shapes,
          `${path}.shapes`,
        );
        break;
      default:
        break;
    }
    return layerInfo;
  });
};

export const getShape = (shape: Shape.Value, path: string): ShapeInfo => {
  const shapeInfo: ShapeInfo = {
    path: path,
    name: shape.nm || "Unnamed Shape",
    colorRgb: defaultColor,
    children: [],
  };
  switch (shape.ty) {
    case ShapeTypes.Fill:
      shapeInfo.colorRgb = getColorsFromFillShape(shape as Shape.Fill);
      break;
    case ShapeTypes.Stroke:
      shapeInfo.colorRgb = getColorsFromStrokeShape(shape as Shape.Stroke);
      break;
    case ShapeTypes.Group:
      shapeInfo.children = getShapesFromLayer(
        (shape as Shape.Group).it || [],
        `${path}.it`,
      );
      break;
  }

  return shapeInfo;
};

const getShapesFromLayer = (
  shapes: Shape.Value[],
  path: string,
): ShapeInfo[] => {
  return shapes.map((shape, i) => getShape(shape, `${path}.${i}`));
};

const getColorsFromFillShape = (shape: Shape.Fill): RgbaColor => {
  return toRgbColor(shape.c.k as number[]);
};

const getColorsFromStrokeShape = (shape: Shape.Stroke): RgbaColor => {
  if (shape.c.a === 1) return defaultColor; // TODO: handle multiple colors
  return toRgbColor(shape.c.k as number[]);
};

const toRgbColor = (color: number[]): RgbaColor => {
  const [r, g, b, a] = color;

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: a === undefined ? 1 : a,
  };
};

const fromRgbColor = (color: RgbaColor): number[] => {
  const { r, g, b, a } = color;
  return [r / 255, g / 255, b / 255, a];
};

export const getSelectedShape = (
  animation: Animation,
  path: string,
): ShapeInfo | null => {
  const shape = get(animation, path) as Shape.Value | undefined;
  if (!shape) return null;
  return getShape(shape, path);
};

const cloneAnimation = (animation: Animation): Animation =>
  JSON.parse(JSON.stringify(animation)) as Animation;

export const updateShapeColor = (
  animation: Animation,
  shapePath: string,
  color: RgbaColor,
) => {
  const next = cloneAnimation(animation);
  return set(next, `${shapePath}.c.k`, fromRgbColor(color));
};

export const getFramerate = (animation: Animation) => {
  return animation.fr;
};

export const getDimensions = (animation: Animation) => {
  return { width: animation.w, height: animation.h };
};

export const updateDimensions = (
  animation: Animation,
  width: number,
  height: number,
) => {
  return { ...animation, w: width, h: height };
};

export const updateFramerate = (animation: Animation, framerate: number) => {
  return { ...animation, fr: framerate };
};

export const deleteLayer = (animation: Animation, layerIndex: number) => {
  const newLayers = [...animation.layers];
  newLayers.splice(layerIndex, 1);
  return { ...animation, layers: newLayers };
};

export type PrimitiveKind = "rect" | "ellipse";

export interface AddShapeOptions {
  kind: PrimitiveKind;
  color: RgbaColor;
  width?: number;
  height?: number;
  position?: [number, number];
  name?: string;
}

const nextLayerInd = (animation: Animation): number => {
  let max = 0;
  for (const l of animation.layers) {
    const ind = (l as { ind?: number }).ind;
    if (typeof ind === "number" && ind > max) max = ind;
  }
  return max + 1;
};

const makeStatic = <V>(value: V, ix?: number) =>
  ix === undefined ? { a: 0, k: value } : { a: 0, k: value, ix };

const makeIdentityLayerTransform = (centerX: number, centerY: number) => ({
  o: makeStatic(100, 11),
  r: makeStatic(0, 10),
  p: { ...makeStatic([centerX, centerY, 0], 2), l: 2 },
  a: { ...makeStatic([0, 0, 0], 1), l: 2 },
  s: { ...makeStatic([100, 100, 100], 6), l: 2 },
});

export const addShapeLayer = (
  animation: Animation,
  name?: string,
): Animation => {
  const ind = nextLayerInd(animation);
  const op = animation.op ?? 60;
  const layer = {
    ddd: 0,
    ind,
    ty: 4,
    nm: name && name.trim() ? name : `Layer ${ind}`,
    sr: 1,
    ks: makeIdentityLayerTransform(animation.w / 2, animation.h / 2),
    ao: 0,
    shapes: [],
    ip: animation.ip ?? 0,
    op,
    st: 0,
    bm: 0,
  };
  return { ...animation, layers: [...animation.layers, layer as never] };
};

const makePrimitiveShape = (
  kind: PrimitiveKind,
  width: number,
  height: number,
) => {
  if (kind === "rect") {
    return {
      ty: "rc",
      d: 1,
      s: makeStatic([width, height], 2),
      p: makeStatic([0, 0], 3),
      r: makeStatic(0, 4),
      nm: "Rectangle Path 1",
      hd: false,
    };
  }
  return {
    ty: "el",
    d: 1,
    s: makeStatic([width, height], 2),
    p: makeStatic([0, 0], 3),
    nm: "Ellipse Path 1",
    hd: false,
  };
};

const makeFillShape = (color: RgbaColor) => ({
  ty: "fl",
  c: makeStatic(fromRgbColor(color), 4),
  o: makeStatic(100, 5),
  r: 1,
  bm: 0,
  nm: "Fill 1",
  hd: false,
});

const makeGroupTransform = (position: [number, number]) => ({
  ty: "tr",
  p: makeStatic(position, 2),
  a: makeStatic([0, 0], 1),
  s: makeStatic([100, 100], 3),
  r: makeStatic(0, 6),
  o: makeStatic(100, 7),
  sk: makeStatic(0, 4),
  sa: makeStatic(0, 5),
  nm: "Transform",
});

export const addShape = (
  animation: Animation,
  layerIndex: number,
  options: AddShapeOptions,
): Animation => {
  const layer = animation.layers[layerIndex];
  if (!layer || (layer as { ty?: number }).ty !== 4) {
    throw new Error(
      `Layer at index ${layerIndex} is not a shape layer (ty=4); cannot add a shape to it.`,
    );
  }
  const width = options.width ?? 200;
  const height = options.height ?? 200;
  const position = options.position ?? [0, 0];
  const labelDefault = options.kind === "rect" ? "Rectangle" : "Ellipse";

  const group = {
    ty: "gr",
    it: [
      makePrimitiveShape(options.kind, width, height),
      makeFillShape(options.color),
      makeGroupTransform(position),
    ],
    nm: options.name && options.name.trim() ? options.name : labelDefault,
    np: 2,
    cix: 2,
    bm: 0,
    ix: ((layer as { shapes: unknown[] }).shapes.length ?? 0) + 1,
    hd: false,
  };

  const next = cloneAnimation(animation);
  const targetLayer = next.layers[layerIndex] as { shapes: unknown[] };
  targetLayer.shapes = [...targetLayer.shapes, group];
  return next;
};

export const renameLayer = (
  animation: Animation,
  layerIndex: number,
  name: string,
): Animation => {
  if (!animation.layers[layerIndex]) {
    throw new Error(`No layer at index ${layerIndex}`);
  }
  const next = cloneAnimation(animation);
  (next.layers[layerIndex] as { nm: string }).nm = name;
  return next;
};

export const renameShape = (
  animation: Animation,
  shapePath: string,
  name: string,
): Animation => {
  if (!get(animation, shapePath)) {
    throw new Error(`No shape at path ${shapePath}`);
  }
  const next = cloneAnimation(animation);
  set(next, `${shapePath}.nm`, name);
  return next;
};

export const moveLayer = (
  animation: Animation,
  fromIndex: number,
  toIndex: number,
): Animation => {
  const layers = [...animation.layers];
  if (fromIndex < 0 || fromIndex >= layers.length) {
    throw new Error(`fromIndex ${fromIndex} out of range (0-${layers.length - 1})`);
  }
  const clamped = Math.max(0, Math.min(toIndex, layers.length - 1));
  const [moved] = layers.splice(fromIndex, 1);
  layers.splice(clamped, 0, moved);
  return { ...animation, layers };
};

export const moveShape = (
  animation: Animation,
  shapePath: string,
  toIndex: number,
): Animation => {
  const dotIdx = shapePath.lastIndexOf(".");
  if (dotIdx < 0) throw new Error(`Bad shape path: ${shapePath}`);
  const containerPath = shapePath.slice(0, dotIdx);
  const fromIndex = Number(shapePath.slice(dotIdx + 1));
  const container = get(animation, containerPath) as unknown[] | undefined;
  if (!Array.isArray(container)) {
    throw new Error(`Container at ${containerPath} is not an array`);
  }
  if (fromIndex < 0 || fromIndex >= container.length) {
    throw new Error(`fromIndex ${fromIndex} out of range`);
  }
  const next = cloneAnimation(animation);
  const arr = get(next, containerPath) as unknown[];
  const clamped = Math.max(0, Math.min(toIndex, arr.length - 1));
  const [moved] = arr.splice(fromIndex, 1);
  arr.splice(clamped, 0, moved);
  return next;
};

export interface LayerTransform {
  position?: [number, number] | [number, number, number];
  scale?: [number, number] | [number, number, number] | number;
  rotation?: number;
  opacity?: number;
}

const pad3 = (v: [number, number] | [number, number, number], pad: number): [number, number, number] =>
  v.length === 3 ? v : [v[0], v[1], pad];

export const setLayerTransform = (
  animation: Animation,
  layerIndex: number,
  t: LayerTransform,
): Animation => {
  if (!animation.layers[layerIndex]) {
    throw new Error(`No layer at index ${layerIndex}`);
  }
  const next = cloneAnimation(animation);
  const layer = next.layers[layerIndex] as {
    ks?: { p?: { k: number[] }; s?: { k: number[] }; r?: { k: number }; o?: { k: number } };
  };
  if (!layer.ks) layer.ks = {};
  if (t.position !== undefined) {
    if (!layer.ks.p) layer.ks.p = { k: [0, 0, 0] };
    layer.ks.p.k = pad3(t.position, 0);
  }
  if (t.scale !== undefined) {
    if (!layer.ks.s) layer.ks.s = { k: [100, 100, 100] };
    const s = typeof t.scale === "number" ? ([t.scale, t.scale] as [number, number]) : t.scale;
    layer.ks.s.k = pad3(s, 100);
  }
  if (t.rotation !== undefined) {
    if (!layer.ks.r) layer.ks.r = { k: 0 };
    layer.ks.r.k = t.rotation;
  }
  if (t.opacity !== undefined) {
    if (!layer.ks.o) layer.ks.o = { k: 100 };
    layer.ks.o.k = t.opacity;
  }
  return next;
};

const makeStrokeShape = (color: RgbaColor, width: number) => ({
  ty: "st",
  c: makeStatic(fromRgbColor(color), 3),
  o: makeStatic(100, 4),
  w: makeStatic(width, 5),
  lc: 1,
  lj: 1,
  ml: 4,
  bm: 0,
  nm: "Stroke 1",
  hd: false,
});

export const addStroke = (
  animation: Animation,
  groupPath: string,
  color: RgbaColor,
  width = 4,
): Animation => {
  const group = get(animation, groupPath) as { ty?: string; it?: unknown[] } | undefined;
  if (!group || group.ty !== "gr" || !Array.isArray(group.it)) {
    throw new Error(`No group shape at ${groupPath}`);
  }
  const next = cloneAnimation(animation);
  const targetGroup = get(next, groupPath) as { it: unknown[] };
  const transformIdx = targetGroup.it.findIndex(
    (s) => (s as { ty?: string }).ty === "tr",
  );
  const insertAt = transformIdx >= 0 ? transformIdx : targetGroup.it.length;
  targetGroup.it.splice(insertAt, 0, makeStrokeShape(color, width));
  return next;
};

export const updateStrokeWidth = (
  animation: Animation,
  shapePath: string,
  width: number,
): Animation => {
  const shape = get(animation, shapePath) as { ty?: string } | undefined;
  if (!shape || shape.ty !== "st") {
    throw new Error(`No stroke shape at ${shapePath}`);
  }
  const next = cloneAnimation(animation);
  set(next, `${shapePath}.w.k`, width);
  return next;
};

export const updateFillOpacity = (
  animation: Animation,
  shapePath: string,
  opacity: number,
): Animation => {
  const shape = get(animation, shapePath) as { ty?: string } | undefined;
  if (!shape || (shape.ty !== "fl" && shape.ty !== "st")) {
    throw new Error(`No fill or stroke at ${shapePath}`);
  }
  const next = cloneAnimation(animation);
  set(next, `${shapePath}.o.k`, opacity);
  return next;
};

export const setAnimationDuration = (
  animation: Animation,
  inFrame?: number,
  outFrame?: number,
): Animation => {
  return {
    ...animation,
    ip: inFrame ?? animation.ip,
    op: outFrame ?? animation.op,
  };
};

export interface GroupTransform {
  position?: [number, number];
  scale?: [number, number] | number;
  rotation?: number;
  opacity?: number;
}

export const setGroupTransform = (
  animation: Animation,
  groupPath: string,
  t: GroupTransform,
): Animation => {
  const group = get(animation, groupPath) as
    | { ty?: string; it?: unknown[] }
    | undefined;
  if (!group || group.ty !== "gr" || !Array.isArray(group.it)) {
    throw new Error(`No group shape at ${groupPath}`);
  }
  const next = cloneAnimation(animation);
  const targetGroup = get(next, groupPath) as { it: unknown[] };
  const tr = targetGroup.it.find(
    (s) => (s as { ty?: string }).ty === "tr",
  ) as
    | {
        p?: { k: number[] };
        s?: { k: number[] };
        r?: { k: number };
        o?: { k: number };
      }
    | undefined;
  if (!tr) throw new Error(`Group at ${groupPath} has no transform child`);
  if (t.position !== undefined) {
    if (!tr.p) tr.p = { k: [0, 0] };
    tr.p.k = [t.position[0], t.position[1]];
  }
  if (t.scale !== undefined) {
    if (!tr.s) tr.s = { k: [100, 100] };
    const s = typeof t.scale === "number" ? ([t.scale, t.scale] as [number, number]) : t.scale;
    tr.s.k = [s[0], s[1]];
  }
  if (t.rotation !== undefined) {
    if (!tr.r) tr.r = { k: 0 };
    tr.r.k = t.rotation;
  }
  if (t.opacity !== undefined) {
    if (!tr.o) tr.o = { k: 100 };
    tr.o.k = t.opacity;
  }
  return next;
};
