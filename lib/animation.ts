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
  hidden: boolean;
  shapes: ShapeInfo[];
}

export interface ShapeInfo {
  path: string;
  name: string;
  hidden: boolean;
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
      hidden: (layer as { hd?: boolean }).hd === true,
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
    hidden: (shape as { hd?: boolean }).hd === true,
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

export interface CreateBlankOptions {
  width?: number;
  height?: number;
  fps?: number;
  duration_seconds?: number;
  duration_frames?: number;
  name?: string;
}

export const createBlankLottie = (options: CreateBlankOptions = {}): Animation => {
  const w = options.width ?? 1080;
  const h = options.height ?? 1080;
  const fr = options.fps ?? 30;
  const op =
    options.duration_frames ?? Math.round((options.duration_seconds ?? 3) * fr);
  return {
    v: "5.7.0",
    fr,
    ip: 0,
    op,
    w,
    h,
    nm: options.name && options.name.trim() ? options.name : "Untitled",
    ddd: 0,
    assets: [],
    layers: [],
    fonts: { list: [] },
  } as unknown as Animation;
};

export interface ImportSvgOptions {
  shapes_per_layer: object[][];
  layer_names: string[];
}

export const importSvgLayers = (
  animation: Animation,
  options: ImportSvgOptions,
): { animation: Animation; layer_indices: number[] } => {
  const next = cloneAnimation(animation);
  const startInd = nextLayerInd(next);
  const layer_indices: number[] = [];
  const op = next.op ?? 60;
  const ip = next.ip ?? 0;
  options.shapes_per_layer.forEach((shapes, i) => {
    const layer = {
      ddd: 0,
      ind: startInd + i,
      ty: 4,
      nm:
        options.layer_names[i] && options.layer_names[i].trim()
          ? options.layer_names[i]
          : `SVG Layer ${startInd + i}`,
      sr: 1,
      // SVG-imported content uses SVG's top-left-origin coordinate system,
      // so the layer's origin must be at canvas (0, 0) — NOT canvas center
      // (which is the default for blank shape layers we add manually).
      // Otherwise every shape gets shifted by half the canvas size and
      // ends up off-canvas.
      ks: makeIdentityLayerTransform(0, 0),
      ao: 0,
      shapes,
      ip,
      op,
      st: 0,
      bm: 0,
    };
    next.layers = [...next.layers, layer as never];
    layer_indices.push(next.layers.length - 1);
  });
  return { animation: next, layer_indices };
};

export interface ImportImageOptions {
  name?: string;
  width: number;
  height: number;
  mime_type: string;
  base64: string;
}

const randomAssetId = (): string =>
  `img_${Math.random().toString(36).slice(2, 10)}`;

export const importImageLayer = (
  animation: Animation,
  options: ImportImageOptions,
): { animation: Animation; layer_index: number; asset_id: string } => {
  const next = cloneAnimation(animation);
  const nextWithAssets = next as Animation & {
    assets?: Array<Record<string, unknown>>;
  };
  if (!Array.isArray(nextWithAssets.assets)) nextWithAssets.assets = [];
  const assetId = randomAssetId();
  nextWithAssets.assets.push({
    id: assetId,
    w: options.width,
    h: options.height,
    u: "",
    p: `data:${options.mime_type};base64,${options.base64}`,
    e: 1,
  });
  const ind = nextLayerInd(next);
  const op = next.op ?? 60;
  const layer = {
    ddd: 0,
    ind,
    ty: 2, // image layer
    nm:
      options.name && options.name.trim()
        ? options.name
        : `Image ${ind}`,
    refId: assetId,
    sr: 1,
    ks: makeIdentityLayerTransform(animation.w / 2, animation.h / 2),
    ao: 0,
    ip: next.ip ?? 0,
    op,
    st: 0,
    bm: 0,
  };
  next.layers = [...next.layers, layer as never];
  return { animation: next, layer_index: next.layers.length - 1, asset_id: assetId };
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

// ============================================================
// Tier 1: Keyframe writing
// ============================================================

export type EasingName = "linear" | "ease-in" | "ease-out" | "ease-in-out";

const EASING_PRESETS: Record<
  EasingName,
  { o: { x: number; y: number }; i: { x: number; y: number } }
> = {
  linear: { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } },
  "ease-in": { o: { x: 0.42, y: 0 }, i: { x: 1, y: 1 } },
  "ease-out": { o: { x: 0, y: 0 }, i: { x: 0.58, y: 1 } },
  "ease-in-out": { o: { x: 0.42, y: 0 }, i: { x: 0.58, y: 1 } },
};

const makeEasingHandles = (easing: EasingName, dimensions: number) => {
  const e = EASING_PRESETS[easing];
  return {
    o: {
      x: Array(dimensions).fill(e.o.x),
      y: Array(dimensions).fill(e.o.y),
    },
    i: {
      x: Array(dimensions).fill(e.i.x),
      y: Array(dimensions).fill(e.i.y),
    },
  };
};

const normalizeKeyframeValue = (v: number | number[]): number[] =>
  Array.isArray(v) ? v : [v];

const detectDimensions = (v: unknown): number => {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "number") return 1;
  return 1;
};

export interface KeyframeInput {
  t: number;
  v: number | number[];
  easing?: EasingName;
}

const buildKeyframes = (
  inputs: KeyframeInput[],
  defaultEasing: EasingName = "linear",
): Array<Record<string, unknown>> => {
  const sorted = [...inputs].sort((a, b) => a.t - b.t);
  const dims = detectDimensions(sorted[0].v);
  return sorted.map((kf, i) => {
    const k: Record<string, unknown> = {
      t: kf.t,
      s: normalizeKeyframeValue(kf.v),
    };
    if (i < sorted.length - 1) {
      const handles = makeEasingHandles(kf.easing ?? defaultEasing, dims);
      k.i = handles.i;
      k.o = handles.o;
    }
    return k;
  });
};

export const animateProperty = (
  animation: Animation,
  propertyPath: string,
  keyframes: KeyframeInput[],
  defaultEasing: EasingName = "linear",
): Animation => {
  if (keyframes.length < 2) {
    throw new Error("Need at least 2 keyframes to animate a property");
  }
  const prop = get(animation, propertyPath) as
    | { a?: number; k?: unknown }
    | undefined;
  if (!prop || typeof prop !== "object") {
    throw new Error(`No property at ${propertyPath}`);
  }
  const next = cloneAnimation(animation);
  const kfs = buildKeyframes(keyframes, defaultEasing);
  set(next, `${propertyPath}.a`, 1);
  set(next, `${propertyPath}.k`, kfs);
  return next;
};

export const setKeyframe = (
  animation: Animation,
  propertyPath: string,
  time: number,
  value: number | number[],
  easing: EasingName = "linear",
): Animation => {
  const prop = get(animation, propertyPath) as
    | { a?: number; k?: unknown }
    | undefined;
  if (!prop || typeof prop !== "object") {
    throw new Error(`No property at ${propertyPath}`);
  }
  const next = cloneAnimation(animation);

  if (prop.a !== 1) {
    // Convert static → animated. Use the existing static value as a baseline keyframe at frame 0.
    const staticValue = prop.k as unknown;
    if (time === 0) {
      // Setting at frame 0 with no other keyframes — keep static, just update value.
      set(next, `${propertyPath}.k`, normalizeKeyframeValue(value));
      return next;
    }
    const baseline: KeyframeInput = {
      t: 0,
      v: typeof staticValue === "number" || Array.isArray(staticValue)
        ? (staticValue as number | number[])
        : 0,
      easing,
    };
    const kfs = buildKeyframes([baseline, { t: time, v: value, easing }]);
    set(next, `${propertyPath}.a`, 1);
    set(next, `${propertyPath}.k`, kfs);
    return next;
  }

  // Already animated. Add or replace the keyframe at this time.
  const existing = (prop.k as Array<{ t: number }>) ?? [];
  const filtered = existing.filter((kf) => kf.t !== time);
  const allInputs: KeyframeInput[] = filtered.map((kf) => ({
    t: kf.t,
    v: (kf as { s?: number[] }).s ?? 0,
    easing,
  }));
  allInputs.push({ t: time, v: value, easing });
  const kfs = buildKeyframes(allInputs, easing);
  set(next, `${propertyPath}.k`, kfs);
  return next;
};

export const removeKeyframe = (
  animation: Animation,
  propertyPath: string,
  index: number,
): Animation => {
  const prop = get(animation, propertyPath) as
    | { a?: number; k?: Array<unknown> }
    | undefined;
  if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) {
    throw new Error(`Property at ${propertyPath} is not animated`);
  }
  if (index < 0 || index >= prop.k.length) {
    throw new Error(`Keyframe index ${index} out of range (0-${prop.k.length - 1})`);
  }
  const next = cloneAnimation(animation);
  const kfs = [...(get(next, propertyPath) as { k: unknown[] }).k];
  kfs.splice(index, 1);
  if (kfs.length === 0) {
    // No keyframes left: revert to static with the removed value (or 0)
    set(next, `${propertyPath}.a`, 0);
    set(next, `${propertyPath}.k`, 0);
  } else if (kfs.length === 1) {
    // Only one keyframe: collapse to static
    const sole = kfs[0] as { s?: unknown };
    const v = sole.s;
    set(next, `${propertyPath}.a`, 0);
    set(next, `${propertyPath}.k`, Array.isArray(v) && v.length === 1 ? v[0] : v);
  } else {
    // Strip i/o from new last keyframe
    const last = kfs[kfs.length - 1] as Record<string, unknown>;
    delete last.i;
    delete last.o;
    set(next, `${propertyPath}.k`, kfs);
  }
  return next;
};

export const shiftKeyframes = (
  animation: Animation,
  propertyPath: string,
  frameOffset: number,
): Animation => {
  const prop = get(animation, propertyPath) as
    | { a?: number; k?: Array<{ t: number }> }
    | undefined;
  if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) {
    throw new Error(`Property at ${propertyPath} is not animated`);
  }
  const next = cloneAnimation(animation);
  const kfs = (get(next, propertyPath) as { k: Array<{ t: number }> }).k;
  for (const kf of kfs) kf.t += frameOffset;
  return next;
};

export const scaleKeyframeTimes = (
  animation: Animation,
  propertyPath: string,
  multiplier: number,
  anchor: "first" | number = "first",
): Animation => {
  if (multiplier <= 0) throw new Error("multiplier must be positive");
  const prop = get(animation, propertyPath) as
    | { a?: number; k?: Array<{ t: number }> }
    | undefined;
  if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) {
    throw new Error(`Property at ${propertyPath} is not animated`);
  }
  const next = cloneAnimation(animation);
  const kfs = (get(next, propertyPath) as { k: Array<{ t: number }> }).k;
  const anchorTime = anchor === "first" ? kfs[0].t : anchor;
  for (const kf of kfs) {
    kf.t = anchorTime + (kf.t - anchorTime) * multiplier;
  }
  return next;
};

// ============================================================
// Tier 1: Text layers
// ============================================================

export interface AddTextLayerOptions {
  text: string;
  font_family?: string;
  font_size?: number;
  color?: RgbaColor;
  position?: [number, number];
  justification?: "left" | "center" | "right";
  name?: string;
  tracking?: number;
  line_height?: number;
}

const ensureFontInList = (
  animation: Animation & { fonts?: { list?: Array<{ fName?: string }> } },
  fontFamily: string,
): void => {
  if (!animation.fonts) animation.fonts = { list: [] };
  if (!Array.isArray(animation.fonts.list)) animation.fonts.list = [];
  const list = animation.fonts.list;
  if (!list.find((f) => f.fName === fontFamily)) {
    list.push({
      fName: fontFamily,
      fFamily: fontFamily,
      fStyle: "Regular",
      ascent: 75,
    } as { fName: string });
  }
};

export const addTextLayer = (
  animation: Animation,
  options: AddTextLayerOptions,
): { animation: Animation; layer_index: number } => {
  const next = cloneAnimation(animation);
  const ind = nextLayerInd(next);
  const fontFamily = options.font_family ?? "Arial";
  const fontSize = options.font_size ?? 48;
  const color = options.color ?? { r: 0, g: 0, b: 0, a: 1 };
  const position = options.position ?? [next.w / 2, next.h / 2];
  const justification =
    options.justification === "left"
      ? 0
      : options.justification === "right"
        ? 1
        : 2;
  ensureFontInList(
    next as Animation & { fonts?: { list?: Array<{ fName?: string }> } },
    fontFamily,
  );

  const layer = {
    ddd: 0,
    ind,
    ty: 5, // text layer
    nm:
      options.name && options.name.trim() ? options.name : `Text ${ind}`,
    sr: 1,
    ks: {
      o: makeStatic(100, 11),
      r: makeStatic(0, 10),
      p: { ...makeStatic([position[0], position[1], 0], 2), l: 2 },
      a: { ...makeStatic([0, 0, 0], 1), l: 2 },
      s: { ...makeStatic([100, 100, 100], 6), l: 2 },
    },
    ao: 0,
    t: {
      d: {
        k: [
          {
            s: {
              s: fontSize,
              f: fontFamily,
              t: options.text,
              j: justification,
              tr: options.tracking ?? 0,
              lh: options.line_height ?? fontSize * 1.2,
              ls: 0,
              fc: [color.r / 255, color.g / 255, color.b / 255],
            },
            t: 0,
          },
        ],
      },
      p: {},
      m: { g: 1, a: makeStatic([0, 0], 2) },
      a: [],
    },
    ip: next.ip ?? 0,
    op: next.op ?? 60,
    st: 0,
    bm: 0,
  };
  next.layers = [...next.layers, layer as never];
  return { animation: next, layer_index: next.layers.length - 1 };
};

// ============================================================
// Tier 1: Layer parenting
// ============================================================

export const setLayerParent = (
  animation: Animation,
  childLayerIndex: number,
  parentLayerIndex: number | null,
): Animation => {
  if (!animation.layers[childLayerIndex]) {
    throw new Error(`No layer at index ${childLayerIndex}`);
  }
  const next = cloneAnimation(animation);
  const child = next.layers[childLayerIndex] as { ind?: number; parent?: number };
  if (parentLayerIndex === null) {
    delete child.parent;
    return next;
  }
  const parent = next.layers[parentLayerIndex] as { ind?: number };
  if (!parent) throw new Error(`No layer at index ${parentLayerIndex}`);
  if (parentLayerIndex === childLayerIndex) {
    throw new Error("A layer cannot be its own parent");
  }
  if (typeof parent.ind !== "number") {
    throw new Error(`Parent layer has no ind`);
  }
  child.parent = parent.ind;
  return next;
};

// ============================================================
// Tier 2: Duplicate layer
// ============================================================

export const duplicateLayer = (
  animation: Animation,
  layerIndex: number,
  newName?: string,
): { animation: Animation; layer_index: number } => {
  const layer = animation.layers[layerIndex];
  if (!layer) throw new Error(`No layer at index ${layerIndex}`);
  const next = cloneAnimation(animation);
  const clone = JSON.parse(JSON.stringify(next.layers[layerIndex])) as {
    ind?: number;
    nm?: string;
  };
  const newInd = nextLayerInd(next);
  clone.ind = newInd;
  if (newName && newName.trim()) {
    clone.nm = newName;
  } else if (clone.nm) {
    clone.nm = `${clone.nm} copy`;
  }
  next.layers = [...next.layers, clone as never];
  return { animation: next, layer_index: next.layers.length - 1 };
};

// ============================================================
// Tier 2: Polygon / Star (sr polystar)
// ============================================================

const makePolystar = (
  starType: 1 | 2, // 1 = star, 2 = polygon
  points: number,
  outerRadius: number,
  innerRadius: number,
  position: [number, number],
  rotation: number,
  innerRoundness: number,
  outerRoundness: number,
) => {
  const base: Record<string, unknown> = {
    ty: "sr",
    sy: starType,
    pt: makeStatic(points, 3),
    p: makeStatic(position, 4),
    r: makeStatic(rotation, 5),
    or: makeStatic(outerRadius, 7),
    os: makeStatic(outerRoundness, 9),
    nm: starType === 1 ? "Star Path 1" : "Polygon Path 1",
    hd: false,
    d: 1,
  };
  if (starType === 1) {
    base.ir = makeStatic(innerRadius, 6);
    base.is = makeStatic(innerRoundness, 8);
  }
  return base;
};

const wrapPolystarInGroup = (
  shape: Record<string, unknown>,
  color: RgbaColor,
  name: string,
  layer: { shapes: unknown[] },
  position: [number, number],
) => ({
  ty: "gr",
  it: [shape, makeFillShape(color), makeGroupTransform(position)],
  nm: name,
  np: 2,
  cix: 2,
  bm: 0,
  ix: layer.shapes.length + 1,
  hd: false,
});

export interface AddPolystarOptions {
  points: number;
  outer_radius: number;
  inner_radius?: number;
  rotation?: number;
  outer_roundness?: number;
  inner_roundness?: number;
  position?: [number, number];
  color: RgbaColor;
  name?: string;
}

export const addPolygonShape = (
  animation: Animation,
  layerIndex: number,
  options: AddPolystarOptions,
): Animation => {
  const layer = animation.layers[layerIndex] as { ty?: number; shapes?: unknown[] };
  if (!layer || layer.ty !== 4 || !Array.isArray(layer.shapes)) {
    throw new Error(`Layer at ${layerIndex} is not a shape layer`);
  }
  const polygon = makePolystar(
    2,
    options.points,
    options.outer_radius,
    0,
    [0, 0],
    options.rotation ?? 0,
    0,
    options.outer_roundness ?? 0,
  );
  const next = cloneAnimation(animation);
  const targetLayer = next.layers[layerIndex] as { shapes: unknown[] };
  const group = wrapPolystarInGroup(
    polygon,
    options.color,
    options.name ?? "Polygon",
    targetLayer,
    options.position ?? [0, 0],
  );
  targetLayer.shapes = [...targetLayer.shapes, group];
  return next;
};

export const addStarShape = (
  animation: Animation,
  layerIndex: number,
  options: AddPolystarOptions,
): Animation => {
  const layer = animation.layers[layerIndex] as { ty?: number; shapes?: unknown[] };
  if (!layer || layer.ty !== 4 || !Array.isArray(layer.shapes)) {
    throw new Error(`Layer at ${layerIndex} is not a shape layer`);
  }
  const star = makePolystar(
    1,
    options.points,
    options.outer_radius,
    options.inner_radius ?? options.outer_radius / 2,
    [0, 0],
    options.rotation ?? 0,
    options.inner_roundness ?? 0,
    options.outer_roundness ?? 0,
  );
  const next = cloneAnimation(animation);
  const targetLayer = next.layers[layerIndex] as { shapes: unknown[] };
  const group = wrapPolystarInGroup(
    star,
    options.color,
    options.name ?? "Star",
    targetLayer,
    options.position ?? [0, 0],
  );
  targetLayer.shapes = [...targetLayer.shapes, group];
  return next;
};

// ============================================================
// Tier 2: Custom path
// ============================================================

export interface AddPathOptions {
  vertices: Array<[number, number]>;
  in_tangents?: Array<[number, number]>;
  out_tangents?: Array<[number, number]>;
  closed?: boolean;
  fill_color?: RgbaColor;
  stroke_color?: RgbaColor;
  stroke_width?: number;
  position?: [number, number];
  name?: string;
}

export const addPath = (
  animation: Animation,
  layerIndex: number,
  options: AddPathOptions,
): Animation => {
  const layer = animation.layers[layerIndex] as { ty?: number; shapes?: unknown[] };
  if (!layer || layer.ty !== 4 || !Array.isArray(layer.shapes)) {
    throw new Error(`Layer at ${layerIndex} is not a shape layer`);
  }
  const v = options.vertices;
  if (!v || v.length < 2) throw new Error("addPath needs at least 2 vertices");
  const i =
    options.in_tangents ?? v.map(() => [0, 0] as [number, number]);
  const o =
    options.out_tangents ?? v.map(() => [0, 0] as [number, number]);
  if (i.length !== v.length || o.length !== v.length) {
    throw new Error(
      "in_tangents and out_tangents must have same length as vertices",
    );
  }
  const pathShape = {
    ty: "sh",
    d: 1,
    ks: makeStatic({ i, o, v, c: options.closed ?? true }, 2),
    nm: options.name ?? "Path",
    hd: false,
  };
  const items: object[] = [pathShape];
  if (options.fill_color) items.push(makeFillShape(options.fill_color));
  if (options.stroke_color) {
    items.push(makeStrokeShape(options.stroke_color, options.stroke_width ?? 4));
  }
  items.push(makeGroupTransform(options.position ?? [0, 0]));

  const next = cloneAnimation(animation);
  const targetLayer = next.layers[layerIndex] as { shapes: unknown[] };
  const group = {
    ty: "gr",
    it: items,
    nm: options.name ?? "Custom Path",
    np: items.length - 1,
    cix: 2,
    bm: 0,
    ix: targetLayer.shapes.length + 1,
    hd: false,
  };
  targetLayer.shapes = [...targetLayer.shapes, group];
  return next;
};

// ============================================================
// Tier 2: Set corner radius (animatable rect rounding)
// ============================================================

export const setCornerRadius = (
  animation: Animation,
  shapePath: string,
  radius: number,
): Animation => {
  const shape = get(animation, shapePath) as
    | { ty?: string; r?: { k: number } }
    | { ty?: string; it?: unknown[] }
    | undefined;
  if (!shape) throw new Error(`No shape at ${shapePath}`);
  const next = cloneAnimation(animation);
  // If pointed at a group, find the rect inside it
  const targetShape = get(next, shapePath) as {
    ty?: string;
    r?: { k: number };
    it?: unknown[];
  };
  if (targetShape.ty === "rc") {
    if (!targetShape.r) targetShape.r = { k: 0 };
    targetShape.r.k = radius;
    return next;
  }
  if (targetShape.ty === "gr" && Array.isArray(targetShape.it)) {
    const rect = targetShape.it.find(
      (s) => (s as { ty?: string }).ty === "rc",
    ) as { r?: { k: number } } | undefined;
    if (!rect) throw new Error(`No rectangle inside group at ${shapePath}`);
    if (!rect.r) rect.r = { k: 0 };
    rect.r.k = radius;
    return next;
  }
  throw new Error(
    `Shape at ${shapePath} is not a rectangle (or a group containing one)`,
  );
};

// ============================================================
// Tier 3: Layer blend mode
// ============================================================

export type BlendModeName =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

const BLEND_MODE_CODES: Record<BlendModeName, number> = {
  normal: 0,
  multiply: 1,
  screen: 2,
  overlay: 3,
  darken: 4,
  lighten: 5,
  "color-dodge": 6,
  "color-burn": 7,
  "hard-light": 8,
  "soft-light": 9,
  difference: 10,
  exclusion: 11,
  hue: 12,
  saturation: 13,
  color: 14,
  luminosity: 15,
};

export const setLayerBlendMode = (
  animation: Animation,
  layerIndex: number,
  mode: BlendModeName,
): Animation => {
  if (!animation.layers[layerIndex]) {
    throw new Error(`No layer at index ${layerIndex}`);
  }
  const next = cloneAnimation(animation);
  (next.layers[layerIndex] as { bm: number }).bm = BLEND_MODE_CODES[mode];
  return next;
};

// ============================================================
// Tier 3: Add mask
// ============================================================

export type MaskMode = "add" | "subtract" | "intersect" | "lighten" | "darken" | "difference";

const MASK_MODE_CODES: Record<MaskMode, string> = {
  add: "a",
  subtract: "s",
  intersect: "i",
  lighten: "l",
  darken: "d",
  difference: "f",
};

export interface AddMaskOptions {
  vertices: Array<[number, number]>;
  in_tangents?: Array<[number, number]>;
  out_tangents?: Array<[number, number]>;
  closed?: boolean;
  mode?: MaskMode;
  inverted?: boolean;
  opacity?: number;
  expansion?: number;
  name?: string;
}

export const addMask = (
  animation: Animation,
  layerIndex: number,
  options: AddMaskOptions,
): Animation => {
  const layer = animation.layers[layerIndex];
  if (!layer) throw new Error(`No layer at index ${layerIndex}`);
  const v = options.vertices;
  if (!v || v.length < 3)
    throw new Error("Mask needs at least 3 vertices to form a closed region");
  const i = options.in_tangents ?? v.map(() => [0, 0] as [number, number]);
  const o = options.out_tangents ?? v.map(() => [0, 0] as [number, number]);
  const next = cloneAnimation(animation);
  const target = next.layers[layerIndex] as {
    hasMask?: boolean;
    masksProperties?: unknown[];
  };
  if (!Array.isArray(target.masksProperties)) target.masksProperties = [];
  target.hasMask = true;
  target.masksProperties.push({
    inv: options.inverted ?? false,
    mode: MASK_MODE_CODES[options.mode ?? "add"],
    pt: makeStatic({ i, o, v, c: options.closed ?? true }, 1),
    o: makeStatic(options.opacity ?? 100, 3),
    x: makeStatic(options.expansion ?? 0, 4),
    nm: options.name ?? "Mask",
  });
  return next;
};

// ============================================================
// Tier 3: Stroke dash
// ============================================================

export interface StrokeDashOptions {
  dash: number;
  gap?: number;
  offset?: number;
}

export const setStrokeDash = (
  animation: Animation,
  shapePath: string,
  options: StrokeDashOptions,
): Animation => {
  const shape = get(animation, shapePath) as { ty?: string } | undefined;
  if (!shape || shape.ty !== "st") {
    throw new Error(`No stroke shape at ${shapePath}`);
  }
  const next = cloneAnimation(animation);
  const stroke = get(next, shapePath) as { d?: unknown[] };
  stroke.d = [
    { n: "d", nm: "dash", v: makeStatic(options.dash, 1) },
    { n: "g", nm: "gap", v: makeStatic(options.gap ?? options.dash, 2) },
    { n: "o", nm: "offset", v: makeStatic(options.offset ?? 0, 7) },
  ];
  return next;
};

// ============================================================
// Tier 3: Effects (drop shadow, gaussian blur)
// ============================================================

const ensureEffectsArray = (
  layer: { ef?: unknown[] },
): unknown[] => {
  if (!Array.isArray(layer.ef)) layer.ef = [];
  return layer.ef;
};

export interface DropShadowOptions {
  color?: RgbaColor;
  opacity?: number;
  direction?: number; // degrees
  distance?: number; // pixels
  softness?: number;
}

export const addDropShadow = (
  animation: Animation,
  layerIndex: number,
  options: DropShadowOptions = {},
): Animation => {
  if (!animation.layers[layerIndex]) {
    throw new Error(`No layer at index ${layerIndex}`);
  }
  const next = cloneAnimation(animation);
  const layer = next.layers[layerIndex] as { ef?: unknown[] };
  const ef = ensureEffectsArray(layer);
  const color = options.color ?? { r: 0, g: 0, b: 0, a: 1 };
  ef.push({
    ty: 25,
    nm: "Drop Shadow",
    np: 8,
    mn: "ADBE Drop Shadow",
    ix: ef.length + 1,
    en: 1,
    ef: [
      { ty: 2, nm: "Shadow Color", mn: "ADBE Drop Shadow-0001", ix: 1, v: makeStatic(fromRgbColor(color), 0) },
      { ty: 0, nm: "Opacity", mn: "ADBE Drop Shadow-0002", ix: 2, v: makeStatic(((options.opacity ?? 100) / 100) * 255, 0) },
      { ty: 0, nm: "Direction", mn: "ADBE Drop Shadow-0003", ix: 3, v: makeStatic(options.direction ?? 135, 0) },
      { ty: 0, nm: "Distance", mn: "ADBE Drop Shadow-0004", ix: 4, v: makeStatic(options.distance ?? 10, 0) },
      { ty: 0, nm: "Softness", mn: "ADBE Drop Shadow-0005", ix: 5, v: makeStatic(options.softness ?? 5, 0) },
      { ty: 7, nm: "Shadow Only", mn: "ADBE Drop Shadow-0006", ix: 6, v: makeStatic(0, 0) },
    ],
  });
  return next;
};

export interface BlurOptions {
  amount: number;
  /** 1 = Horizontal & Vertical, 2 = Horizontal only, 3 = Vertical only */
  dimensions?: 1 | 2 | 3;
  repeat_edge_pixels?: boolean;
}

export const addBlur = (
  animation: Animation,
  layerIndex: number,
  options: BlurOptions,
): Animation => {
  if (!animation.layers[layerIndex]) {
    throw new Error(`No layer at index ${layerIndex}`);
  }
  const next = cloneAnimation(animation);
  const layer = next.layers[layerIndex] as { ef?: unknown[] };
  const ef = ensureEffectsArray(layer);
  ef.push({
    ty: 29,
    nm: "Gaussian Blur",
    np: 5,
    mn: "ADBE Gaussian Blur 2",
    ix: ef.length + 1,
    en: 1,
    ef: [
      { ty: 0, nm: "Blurriness", mn: "ADBE Gaussian Blur 2-0001", ix: 1, v: makeStatic(options.amount, 0) },
      { ty: 7, nm: "Blur Dimensions", mn: "ADBE Gaussian Blur 2-0002", ix: 2, v: makeStatic(options.dimensions ?? 1, 0) },
      { ty: 7, nm: "Repeat Edge Pixels", mn: "ADBE Gaussian Blur 2-0003", ix: 3, v: makeStatic(options.repeat_edge_pixels ? 1 : 0, 0) },
    ],
  });
  return next;
};

// ============================================================
// Visibility (hide/show) — toggles lottie's native `hd` flag
// ============================================================

export const setLayerVisibility = (
  animation: Animation,
  layerIndex: number,
  hidden: boolean,
): Animation => {
  if (!animation.layers[layerIndex]) {
    throw new Error(`No layer at index ${layerIndex}`);
  }
  const next = cloneAnimation(animation);
  (next.layers[layerIndex] as { hd?: boolean }).hd = hidden;
  return next;
};

export const setShapeVisibility = (
  animation: Animation,
  shapePath: string,
  hidden: boolean,
): Animation => {
  if (!get(animation, shapePath)) {
    throw new Error(`No shape at ${shapePath}`);
  }
  const next = cloneAnimation(animation);
  set(next, `${shapePath}.hd`, hidden);
  return next;
};

// ============================================================
// Click-to-select bbox hit testing (for clicking on the rendered lottie
// canvas). Static shapes only — animated transforms aren't accounted for.
// ============================================================

interface HitCandidate {
  shape_path: string;
  layer_index: number;
  bounds: { x: number; y: number; width: number; height: number };
}

const SHAPE_LAYER_TY = 4;

// Resolve an animatable lottie property value at a given frame. Handles both
// static `{a:0, k: value}` and animated `{a:1, k: [keyframes]}` shapes.
// For animated, picks the keyframe at or before `atFrame` (or the first one
// if atFrame is before any keyframe).
const evalProperty = (
  prop: unknown,
  atFrame: number,
  fallback: number[],
): number[] => {
  if (!prop || typeof prop !== "object") return fallback;
  const p = prop as { a?: number; k?: unknown };
  if (Array.isArray(p.k)) {
    if (p.a === 1 || (p.k.length > 0 && typeof p.k[0] === "object")) {
      // Keyframe array
      const kfs = p.k as Array<{ t?: number; s?: number | number[] }>;
      let active = kfs[0];
      for (const kf of kfs) {
        if ((kf.t ?? 0) <= atFrame) active = kf;
        else break;
      }
      const v = active?.s;
      if (Array.isArray(v)) return v;
      if (typeof v === "number") return [v];
      return fallback;
    }
    return p.k as number[];
  }
  if (typeof p.k === "number") return [p.k];
  return fallback;
};

const computeBoundsForShapeNode = (
  shape: unknown,
  parentOffset: [number, number],
  atFrame: number,
): { x: number; y: number; width: number; height: number } | null => {
  if (!shape || typeof shape !== "object") return null;
  const s = shape as {
    ty?: string;
    s?: unknown;
    p?: unknown;
    it?: unknown[];
  };
  if (s.ty === "rc" || s.ty === "el") {
    const size = evalProperty(s.s, atFrame, [0, 0]);
    if (size.length < 2 || size[0] <= 0 || size[1] <= 0) return null;
    const pos = evalProperty(s.p, atFrame, [0, 0]);
    const [w, h] = size;
    const [px, py] = [pos[0] ?? 0, pos[1] ?? 0];
    return {
      x: parentOffset[0] + px - w / 2,
      y: parentOffset[1] + py - h / 2,
      width: w,
      height: h,
    };
  }
  if (s.ty === "gr" && Array.isArray(s.it)) {
    const tr = s.it.find((it) => (it as { ty?: string }).ty === "tr") as
      | { p?: unknown }
      | undefined;
    const trP = evalProperty(tr?.p, atFrame, [0, 0]);
    const childOffset: [number, number] = [
      parentOffset[0] + (trP[0] ?? 0),
      parentOffset[1] + (trP[1] ?? 0),
    ];
    let acc: { x: number; y: number; width: number; height: number } | null =
      null;
    for (const child of s.it) {
      const cb = computeBoundsForShapeNode(child, childOffset, atFrame);
      if (!cb) continue;
      if (!acc) acc = cb;
      else {
        const x1 = Math.min(acc.x, cb.x);
        const y1 = Math.min(acc.y, cb.y);
        const x2 = Math.max(acc.x + acc.width, cb.x + cb.width);
        const y2 = Math.max(acc.y + acc.height, cb.y + cb.height);
        acc = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
      }
    }
    return acc;
  }
  return null;
};

const layerLocalToCanvas = (
  box: { x: number; y: number; width: number; height: number },
  layer: { ks?: { p?: unknown; a?: unknown; s?: unknown } },
  atFrame: number,
) => {
  const pk = evalProperty(layer.ks?.p, atFrame, [0, 0]);
  const ak = evalProperty(layer.ks?.a, atFrame, [0, 0]);
  const sk = evalProperty(layer.ks?.s, atFrame, [100, 100]);
  const sx = (sk[0] ?? 100) / 100;
  const sy = (sk[1] ?? 100) / 100;
  // If the layer is scaled to ~0 (not visible at this frame), skip — we'd
  // produce zero-sized bounds that never match a click.
  if (Math.abs(sx) < 0.01 || Math.abs(sy) < 0.01) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return {
    x: (pk[0] ?? 0) + (box.x - (ak[0] ?? 0)) * sx,
    y: (pk[1] ?? 0) + (box.y - (ak[1] ?? 0)) * sy,
    width: box.width * sx,
    height: box.height * sy,
  };
};

const collectGroupHitCandidates = (
  shapes: unknown[],
  prefix: string,
  layerIndex: number,
  layer: { ks?: { p?: unknown; a?: unknown; s?: unknown } },
  parentOffset: [number, number],
  atFrame: number,
  out: HitCandidate[],
): void => {
  shapes.forEach((shape, i) => {
    const path = `${prefix}.${i}`;
    const s = shape as { ty?: string; it?: unknown[]; hd?: boolean };
    if (s.hd === true) return;
    if (s.ty === "gr" && Array.isArray(s.it)) {
      const local = computeBoundsForShapeNode(s, parentOffset, atFrame);
      if (local && local.width > 0 && local.height > 0) {
        const canvas = layerLocalToCanvas(local, layer, atFrame);
        if (canvas.width > 0 && canvas.height > 0) {
          out.push({
            shape_path: path,
            layer_index: layerIndex,
            bounds: canvas,
          });
        }
      }
      // Don't recurse into nested groups — selecting the outer group is the right UX.
    }
  });
};

const IMAGE_LAYER_TY = 2;
const PRECOMP_LAYER_TY = 0;
const SOLID_LAYER_TY = 1;

const findAssetDims = (
  animation: Animation,
  refId: string,
): { w: number; h: number } | null => {
  const assets = (animation as { assets?: unknown }).assets as
    | Array<Record<string, unknown>>
    | undefined;
  if (!Array.isArray(assets)) return null;
  const a = assets.find((x) => (x as { id?: string }).id === refId) as
    | { w?: number; h?: number }
    | undefined;
  if (!a || !a.w || !a.h) return null;
  return { w: a.w, h: a.h };
};

export const hitTestShape = (
  animation: Animation,
  canvasX: number,
  canvasY: number,
  atFrame = 0,
): { shape_path: string; layer_index: number } | null => {
  const candidates: HitCandidate[] = [];
  animation.layers.forEach((layer, layerIndex) => {
    const ty = (layer as { ty?: number }).ty;
    if ((layer as { hd?: boolean }).hd === true) return;
    const ip = (layer as { ip?: number }).ip ?? 0;
    const op = (layer as { op?: number }).op ?? Infinity;
    if (atFrame < ip || atFrame > op) return;

    if (ty === SHAPE_LAYER_TY) {
      const shapes = (layer as { shapes?: unknown[] }).shapes;
      if (!Array.isArray(shapes)) return;
      collectGroupHitCandidates(
        shapes,
        `layers.${layerIndex}.shapes`,
        layerIndex,
        layer as Parameters<typeof layerLocalToCanvas>[1],
        [0, 0],
        atFrame,
        candidates,
      );
    } else if (ty === IMAGE_LAYER_TY) {
      const refId = (layer as { refId?: string }).refId;
      if (!refId) return;
      const dims = findAssetDims(animation, refId);
      if (!dims) return;
      // Image is drawn from (0,0) to (w,h) in layer-local coords (top-left origin)
      const local = { x: 0, y: 0, width: dims.w, height: dims.h };
      const canvas = layerLocalToCanvas(
        local,
        layer as Parameters<typeof layerLocalToCanvas>[1],
        atFrame,
      );
      if (canvas.width > 0 && canvas.height > 0) {
        candidates.push({
          shape_path: `layers.${layerIndex}`,
          layer_index: layerIndex,
          bounds: canvas,
        });
      }
    } else if (ty === SOLID_LAYER_TY) {
      const sw = (layer as { sw?: number }).sw;
      const sh = (layer as { sh?: number }).sh;
      if (!sw || !sh) return;
      const local = { x: 0, y: 0, width: sw, height: sh };
      const canvas = layerLocalToCanvas(
        local,
        layer as Parameters<typeof layerLocalToCanvas>[1],
        atFrame,
      );
      if (canvas.width > 0 && canvas.height > 0) {
        candidates.push({
          shape_path: `layers.${layerIndex}`,
          layer_index: layerIndex,
          bounds: canvas,
        });
      }
    } else if (ty === PRECOMP_LAYER_TY) {
      const w = (layer as { w?: number }).w;
      const h = (layer as { h?: number }).h;
      if (!w || !h) return;
      const local = { x: 0, y: 0, width: w, height: h };
      const canvas = layerLocalToCanvas(
        local,
        layer as Parameters<typeof layerLocalToCanvas>[1],
        atFrame,
      );
      if (canvas.width > 0 && canvas.height > 0) {
        candidates.push({
          shape_path: `layers.${layerIndex}`,
          layer_index: layerIndex,
          bounds: canvas,
        });
      }
    }
  });
  // Lottie renders top-to-bottom in array order (index 0 is on TOP visually).
  for (const c of candidates) {
    const { x, y, width, height } = c.bounds;
    if (
      canvasX >= x &&
      canvasX <= x + width &&
      canvasY >= y &&
      canvasY <= y + height
    ) {
      return { shape_path: c.shape_path, layer_index: c.layer_index };
    }
  }
  return null;
};
