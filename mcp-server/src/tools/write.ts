import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DocumentStore } from "../store.js";
import {
  BulkUpdateColorInput,
  DeleteLayerInput,
  UpdateColorInput,
  UpdateDimensionsInput,
  UpdateFramerateInput,
} from "../schemas.js";
import {
  deleteLayer,
  getSelectedShape,
  updateDimensions,
  updateFramerate,
  updateShapeColor,
} from "../../../lib/animation.js";
import { colorDistance, walkColoredShapes } from "../lottie-utils.js";
import { jsonResult } from "./shared.js";

const DEFAULT_TOLERANCE = 8;

export const register = (server: McpServer, store: DocumentStore) => {
  server.registerTool(
    "update_shape_color",
    {
      description:
        "Set the color of a single shape (fill or stroke) at the given lodash path. Pushes a new entry onto the document's undo history.",
      inputSchema: UpdateColorInput,
    },
    async ({ doc_id, shape_path, color }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = updateShapeColor(entry.history.current, shape_path, color);
      store.applyMutation(id, next);
      return jsonResult({
        doc_id: id,
        updated_shape: getSelectedShape(next, shape_path),
      });
    },
  );

  server.registerTool(
    "update_framerate",
    {
      description:
        "Set the framerate (frames per second) of the animation. Pushes onto undo history.",
      inputSchema: UpdateFramerateInput,
    },
    async ({ doc_id, framerate }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = updateFramerate(entry.history.current, framerate);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, framerate });
    },
  );

  server.registerTool(
    "update_dimensions",
    {
      description:
        "Set the canvas width and height of the animation. Pushes onto undo history.",
      inputSchema: UpdateDimensionsInput,
    },
    async ({ doc_id, width, height }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = updateDimensions(entry.history.current, width, height);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, width, height });
    },
  );

  server.registerTool(
    "delete_layer",
    {
      description:
        "Remove the layer at the given index from the animation. Pushes onto undo history.",
      inputSchema: DeleteLayerInput,
    },
    async ({ doc_id, layer_index }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = deleteLayer(entry.history.current, layer_index);
      store.applyMutation(id, next);
      return jsonResult({
        doc_id: id,
        remaining_layer_count: next.layers.length,
      });
    },
  );

  server.registerTool(
    "bulk_update_color",
    {
      description:
        "Replace one color with another across every fill/stroke whose color is within `tolerance` (default 8) of `from`. A single undo entry is recorded for the whole bulk change.",
      inputSchema: BulkUpdateColorInput,
    },
    async ({ doc_id, from, to, tolerance }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const tol = tolerance ?? DEFAULT_TOLERANCE;
      const matches = walkColoredShapes(entry.history.current).filter(
        (s) => colorDistance(s.color, from) <= tol,
      );
      let next = entry.history.current;
      for (const m of matches) {
        next = updateShapeColor(next, m.shape_path, to);
      }
      if (matches.length > 0) {
        store.applyMutation(id, next);
      }
      return jsonResult({
        doc_id: id,
        updated_count: matches.length,
        paths: matches.map((m) => m.shape_path),
      });
    },
  );
};
