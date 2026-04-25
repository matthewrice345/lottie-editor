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
//# sourceMappingURL=schemas.js.map