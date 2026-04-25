import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DocumentStore } from "../store.js";
import {
  MoveLayerInput,
  MoveShapeInput,
  RenameLayerInput,
  RenameShapeInput,
  SetAnimationDurationInput,
  SetLayerTransformInput,
  UpdateFillOpacityInput,
  UpdateStrokeWidthInput,
} from "../schemas.js";
import {
  moveLayer,
  moveShape,
  renameLayer,
  renameShape,
  setAnimationDuration,
  setLayerTransform,
  updateFillOpacity,
  updateStrokeWidth,
} from "../../../lib/animation.js";
import { jsonResult } from "./shared.js";

export const register = (server: McpServer, store: DocumentStore) => {
  server.registerTool(
    "rename_layer",
    {
      description:
        "Set the name of a layer. Pushes onto undo history.",
      inputSchema: RenameLayerInput,
    },
    async ({ doc_id, layer_index, name }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = renameLayer(entry.history.current, layer_index, name);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, layer_index, name });
    },
  );

  server.registerTool(
    "rename_shape",
    {
      description:
        "Set the name of a shape (any kind: group, fill, stroke, primitive) by lodash path. Pushes onto undo history.",
      inputSchema: RenameShapeInput,
    },
    async ({ doc_id, shape_path, name }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = renameShape(entry.history.current, shape_path, name);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, shape_path, name });
    },
  );

  server.registerTool(
    "move_layer",
    {
      description:
        "Move a layer to a new index in the layer stack. Index 0 is on top of the canvas; higher indexes render below. Pushes onto undo history.",
      inputSchema: MoveLayerInput,
    },
    async ({ doc_id, from_index, to_index }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = moveLayer(entry.history.current, from_index, to_index);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, from_index, to_index });
    },
  );

  server.registerTool(
    "move_shape",
    {
      description:
        "Move a shape to a new index within its parent (the same shapes array or group's `it` array). Pushes onto undo history.",
      inputSchema: MoveShapeInput,
    },
    async ({ doc_id, shape_path, to_index }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = moveShape(entry.history.current, shape_path, to_index);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, shape_path, to_index });
    },
  );

  server.registerTool(
    "set_layer_transform",
    {
      description:
        "Set one or more transform properties on a layer. `position` is [x, y] or [x, y, z] in canvas pixels (origin top-left). `scale` is a percentage (100 = identity); pass a number, [x_pct, y_pct], or [x, y, z]. `rotation` in degrees. `opacity` 0–100. Omitted properties are left unchanged. Pushes onto undo history.",
      inputSchema: SetLayerTransformInput,
    },
    async ({ doc_id, layer_index, position, scale, rotation, opacity }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = setLayerTransform(entry.history.current, layer_index, {
        position,
        scale,
        rotation,
        opacity,
      });
      store.applyMutation(id, next);
      return jsonResult({
        doc_id: id,
        layer_index,
        applied: { position, scale, rotation, opacity },
      });
    },
  );

  server.registerTool(
    "update_stroke_width",
    {
      description:
        "Set the stroke width (in pixels) of a stroke shape. Pushes onto undo history.",
      inputSchema: UpdateStrokeWidthInput,
    },
    async ({ doc_id, shape_path, width }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = updateStrokeWidth(entry.history.current, shape_path, width);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, shape_path, width });
    },
  );

  server.registerTool(
    "update_fill_opacity",
    {
      description:
        "Set the opacity (0–100) of a fill or stroke shape. This is independent of the color's alpha channel. Pushes onto undo history.",
      inputSchema: UpdateFillOpacityInput,
    },
    async ({ doc_id, shape_path, opacity }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = updateFillOpacity(entry.history.current, shape_path, opacity);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, shape_path, opacity });
    },
  );

  server.registerTool(
    "set_animation_duration",
    {
      description:
        "Set the in-frame and/or out-frame of the animation, controlling its total duration. Frames are in framerate units. Either argument can be omitted to leave that bound unchanged. Pushes onto undo history.",
      inputSchema: SetAnimationDurationInput,
    },
    async ({ doc_id, in_frame, out_frame }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = setAnimationDuration(
        entry.history.current,
        in_frame,
        out_frame,
      );
      store.applyMutation(id, next);
      return jsonResult({
        doc_id: id,
        in_frame: next.ip,
        out_frame: next.op,
      });
    },
  );
};
