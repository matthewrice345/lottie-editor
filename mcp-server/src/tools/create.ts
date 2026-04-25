import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DocumentStore } from "../store.js";
import {
  AddPrimitiveInput,
  AddShapeLayerInput,
  AddStrokeInput,
} from "../schemas.js";
import {
  addShape,
  addShapeLayer,
  addStroke,
} from "../../../lib/animation.js";
import { jsonResult } from "./shared.js";

export const register = (server: McpServer, store: DocumentStore) => {
  server.registerTool(
    "add_shape_layer",
    {
      description:
        "Append a new empty shape layer to the document. The layer is positioned at the canvas center with an identity transform and an out-frame matching the animation's existing duration. Pushes onto undo history.",
      inputSchema: AddShapeLayerInput,
    },
    async ({ doc_id, name }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = addShapeLayer(entry.history.current, name);
      store.applyMutation(id, next);
      return jsonResult({
        doc_id: id,
        layer_index: next.layers.length - 1,
        layer_count: next.layers.length,
      });
    },
  );

  server.registerTool(
    "add_rectangle",
    {
      description:
        "Append a filled rectangle (wrapped in a Group with a Fill and Transform) to the shapes array of an existing shape layer. Defaults: 200×200, position [0,0]. Returns the new shape's path. Pushes onto undo history.",
      inputSchema: AddPrimitiveInput,
    },
    async ({ doc_id, layer_index, color, width, height, position, name }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = addShape(entry.history.current, layer_index, {
        kind: "rect",
        color,
        width,
        height,
        position,
        name,
      });
      store.applyMutation(id, next);
      const newShapeIndex =
        (next.layers[layer_index] as { shapes: unknown[] }).shapes.length - 1;
      return jsonResult({
        doc_id: id,
        shape_path: `layers.${layer_index}.shapes.${newShapeIndex}`,
      });
    },
  );

  server.registerTool(
    "add_ellipse",
    {
      description:
        "Append a filled ellipse (wrapped in a Group with a Fill and Transform) to the shapes array of an existing shape layer. Defaults: 200×200, position [0,0]. Returns the new shape's path. Pushes onto undo history.",
      inputSchema: AddPrimitiveInput,
    },
    async ({ doc_id, layer_index, color, width, height, position, name }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = addShape(entry.history.current, layer_index, {
        kind: "ellipse",
        color,
        width,
        height,
        position,
        name,
      });
      store.applyMutation(id, next);
      const newShapeIndex =
        (next.layers[layer_index] as { shapes: unknown[] }).shapes.length - 1;
      return jsonResult({
        doc_id: id,
        shape_path: `layers.${layer_index}.shapes.${newShapeIndex}`,
      });
    },
  );

  server.registerTool(
    "add_stroke",
    {
      description:
        "Add a stroke (outline) to an existing Group shape. The stroke is inserted before the Group's Transform so it renders correctly. Default width: 4. Pushes onto undo history.",
      inputSchema: AddStrokeInput,
    },
    async ({ doc_id, group_path, color, width }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = addStroke(entry.history.current, group_path, color, width);
      store.applyMutation(id, next);
      return jsonResult({
        doc_id: id,
        group_path,
        stroke_color: color,
        stroke_width: width ?? 4,
      });
    },
  );
};
