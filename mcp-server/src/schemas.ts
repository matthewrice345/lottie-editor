import { z } from "zod";

export const RgbaColorSchema = z.object({
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
  a: z.number().min(0).max(1),
});

export const DocId = z.string().min(1).optional();

const positionTuple = z.tuple([z.number(), z.number()]);
const position3 = z.tuple([z.number(), z.number(), z.number()]);
const positionAny = z.union([positionTuple, position3]);
const scaleSchema = z.union([z.number(), positionTuple, position3]);

export const LoadInput = { source: z.string().min(1) };
export const SaveInput = { doc_id: DocId, path: z.string().optional() };
export const ListInput = {};
export const CloseInput = { doc_id: DocId };
export const SummaryInput = { doc_id: DocId };

export const LayersInput = { doc_id: DocId };
export const ShapeInput = { doc_id: DocId, path: z.string().min(1) };
export const FramerateInput = { doc_id: DocId };
export const DimensionsInput = { doc_id: DocId };

export const UpdateColorInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  color: RgbaColorSchema,
};
export const UpdateFramerateInput = {
  doc_id: DocId,
  framerate: z.number().positive(),
};
export const UpdateDimensionsInput = {
  doc_id: DocId,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
};
export const DeleteLayerInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
};

export const FindByColorInput = {
  doc_id: DocId,
  color: RgbaColorSchema,
  tolerance: z.number().nonnegative().optional(),
};
export const FindByNameInput = {
  doc_id: DocId,
  query: z.string().min(1),
  mode: z.enum(["exact", "contains", "regex"]).optional(),
};
export const BulkUpdateColorInput = {
  doc_id: DocId,
  from: RgbaColorSchema,
  to: RgbaColorSchema,
  tolerance: z.number().nonnegative().optional(),
};

export const UndoInput = { doc_id: DocId };
export const RedoInput = { doc_id: DocId };

export const AddShapeLayerInput = {
  doc_id: DocId,
  name: z.string().optional(),
};

export const AddPrimitiveInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  color: RgbaColorSchema,
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  position: positionTuple.optional(),
  name: z.string().optional(),
};

export const RenameLayerInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  name: z.string().min(1),
};

export const RenameShapeInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  name: z.string().min(1),
};

export const MoveLayerInput = {
  doc_id: DocId,
  from_index: z.number().int().nonnegative(),
  to_index: z.number().int().nonnegative(),
};

export const MoveShapeInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  to_index: z.number().int().nonnegative(),
};

export const SetLayerTransformInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  position: positionAny.optional(),
  scale: scaleSchema.optional(),
  rotation: z.number().optional(),
  opacity: z.number().min(0).max(100).optional(),
};

export const AddStrokeInput = {
  doc_id: DocId,
  group_path: z.string().min(1),
  color: RgbaColorSchema,
  width: z.number().positive().optional(),
};

export const UpdateStrokeWidthInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  width: z.number().positive(),
};

export const UpdateFillOpacityInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  opacity: z.number().min(0).max(100),
};

export const SetAnimationDurationInput = {
  doc_id: DocId,
  in_frame: z.number().int().nonnegative().optional(),
  out_frame: z.number().int().positive().optional(),
};

// Inspection
export const DescribeInput = { doc_id: DocId };
export const ListAnimatedInput = { doc_id: DocId };
export const KeyframesInput = {
  doc_id: DocId,
  property_path: z.string().min(1),
};
export const LayerTimingInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
};

// Geometry
export const SetGroupTransformInput = {
  doc_id: DocId,
  group_path: z.string().min(1),
  position: positionTuple.optional(),
  scale: z.union([z.number(), positionTuple]).optional(),
  rotation: z.number().optional(),
  opacity: z.number().min(0).max(100).optional(),
};

export const LayerBoundsInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
};

export const ShapeBoundsInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
};

const HorizontalAlign = z.enum([
  "left",
  "center",
  "right",
  "third-left",
  "third-right",
]);
const VerticalAlign = z.enum([
  "top",
  "middle",
  "bottom",
  "third-top",
  "third-bottom",
]);

export const AlignInput = {
  doc_id: DocId,
  target_path: z.string().min(1),
  horizontal: HorizontalAlign.optional(),
  vertical: VerticalAlign.optional(),
  margin: z.number().nonnegative().optional(),
};

export const ImportImageInput = {
  doc_id: DocId,
  source: z.string().min(1),
  name: z.string().optional(),
};

export const ImportSvgInput = {
  doc_id: DocId,
  source: z.string().min(1),
  name: z.string().optional(),
  split: z
    .enum(["single-layer", "per-top-level"])
    .optional(),
};

// ===== Tier 1: Keyframes =====
const EasingEnum = z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]);
const KeyframeValue = z.union([z.number(), z.array(z.number())]);
const KeyframeInputSchema = z.object({
  t: z.number(),
  v: KeyframeValue,
  easing: EasingEnum.optional(),
});

export const AnimatePropertyInput = {
  doc_id: DocId,
  property_path: z.string().min(1),
  keyframes: z.array(KeyframeInputSchema).min(2),
  default_easing: EasingEnum.optional(),
};

export const SetKeyframeInput = {
  doc_id: DocId,
  property_path: z.string().min(1),
  time: z.number(),
  value: KeyframeValue,
  easing: EasingEnum.optional(),
};

export const RemoveKeyframeInput = {
  doc_id: DocId,
  property_path: z.string().min(1),
  index: z.number().int().nonnegative(),
};

export const ShiftKeyframesInput = {
  doc_id: DocId,
  property_path: z.string().min(1),
  frame_offset: z.number(),
};

export const ScaleKeyframeTimesInput = {
  doc_id: DocId,
  property_path: z.string().min(1),
  multiplier: z.number().positive(),
  anchor: z.union([z.literal("first"), z.number()]).optional(),
};

// ===== Tier 1: Text =====
export const AddTextLayerInput = {
  doc_id: DocId,
  text: z.string().min(1),
  font_family: z.string().optional(),
  font_size: z.number().positive().optional(),
  color: RgbaColorSchema.optional(),
  position: positionTuple.optional(),
  justification: z.enum(["left", "center", "right"]).optional(),
  name: z.string().optional(),
  tracking: z.number().optional(),
  line_height: z.number().optional(),
};

// ===== Tier 1: Parenting =====
export const SetLayerParentInput = {
  doc_id: DocId,
  child_layer_index: z.number().int().nonnegative(),
  parent_layer_index: z.number().int().nonnegative().nullable(),
};

// ===== Tier 2: Duplicate =====
export const DuplicateLayerInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  name: z.string().optional(),
};

// ===== Tier 2: Polygon / Star =====
const PolystarShared = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  points: z.number().int().min(3),
  outer_radius: z.number().positive(),
  rotation: z.number().optional(),
  outer_roundness: z.number().min(0).max(100).optional(),
  position: positionTuple.optional(),
  color: RgbaColorSchema,
  name: z.string().optional(),
};

export const AddPolygonInput = PolystarShared;

export const AddStarInput = {
  ...PolystarShared,
  inner_radius: z.number().positive().optional(),
  inner_roundness: z.number().min(0).max(100).optional(),
};

// ===== Tier 2: Custom path =====
export const AddPathInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  vertices: z.array(positionTuple).min(2),
  in_tangents: z.array(positionTuple).optional(),
  out_tangents: z.array(positionTuple).optional(),
  closed: z.boolean().optional(),
  fill_color: RgbaColorSchema.optional(),
  stroke_color: RgbaColorSchema.optional(),
  stroke_width: z.number().positive().optional(),
  position: positionTuple.optional(),
  name: z.string().optional(),
};

// ===== Tier 2: Corner radius =====
export const SetCornerRadiusInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  radius: z.number().min(0),
};

// ===== Tier 3: Blend mode =====
export const SetLayerBlendModeInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  mode: z.enum([
    "normal",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity",
  ]),
};

// ===== Tier 3: Mask =====
export const AddMaskInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  vertices: z.array(positionTuple).min(3),
  in_tangents: z.array(positionTuple).optional(),
  out_tangents: z.array(positionTuple).optional(),
  closed: z.boolean().optional(),
  mode: z
    .enum(["add", "subtract", "intersect", "lighten", "darken", "difference"])
    .optional(),
  inverted: z.boolean().optional(),
  opacity: z.number().min(0).max(100).optional(),
  expansion: z.number().optional(),
  name: z.string().optional(),
};

// ===== Tier 3: Stroke dash =====
export const SetStrokeDashInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  dash: z.number().positive(),
  gap: z.number().positive().optional(),
  offset: z.number().optional(),
};

// ===== Tier 3: Effects =====
export const AddDropShadowInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  color: RgbaColorSchema.optional(),
  opacity: z.number().min(0).max(100).optional(),
  direction: z.number().optional(),
  distance: z.number().nonnegative().optional(),
  softness: z.number().nonnegative().optional(),
};

export const AddBlurInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  dimensions: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  repeat_edge_pixels: z.boolean().optional(),
};

// ===== Visibility =====
export const SetLayerVisibilityInput = {
  doc_id: DocId,
  layer_index: z.number().int().nonnegative(),
  hidden: z.boolean(),
};

export const SetShapeVisibilityInput = {
  doc_id: DocId,
  shape_path: z.string().min(1),
  hidden: z.boolean(),
};

export const CreateBlankLottieInput = {
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().positive().optional(),
  duration_seconds: z.number().positive().optional(),
  duration_frames: z.number().int().positive().optional(),
  name: z.string().optional(),
};
