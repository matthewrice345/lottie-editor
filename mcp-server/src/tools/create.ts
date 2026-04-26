import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { basename } from "node:path";
import { DocumentStore } from "../store.js";
import {
  AddPathInput,
  AddPolygonInput,
  AddPrimitiveInput,
  AddShapeLayerInput,
  AddStarInput,
  AddStrokeInput,
  AddTextLayerInput,
  ImportImageInput,
  ImportSvgInput,
} from "../schemas.js";
import {
  addPath,
  addPolygonShape,
  addShape,
  addShapeLayer,
  addStarShape,
  addStroke,
  addTextLayer,
  importImageLayer,
  importSvgLayers,
} from "../../../lib/animation.js";
import { readImageFile } from "../import-image.js";
import { readSvgFile } from "../import-svg.js";
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
    "import_image",
    {
      description:
        "Import a PNG or JPEG file from disk into the lottie as a new image layer. The file is read, dimensions are detected, and the bytes are embedded base64 in the lottie's `assets` array (so the image travels with the file on save). The new layer is positioned at canvas center with identity transform. Note: image layers are unitary — you can move/scale/rotate/animate the whole image but cannot decompose it into pieces. For SVGs that need decomposition, use `import_svg` (when available). Pushes onto undo history.",
      inputSchema: ImportImageInput,
    },
    async ({ doc_id, source, name }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const img = await readImageFile(source);
      const layerName = name && name.trim() ? name : basename(source);
      const result = importImageLayer(entry.history.current, {
        name: layerName,
        width: img.width,
        height: img.height,
        mime_type: img.mime_type,
        base64: img.base64,
      });
      store.applyMutation(id, result.animation);
      return jsonResult({
        doc_id: id,
        layer_index: result.layer_index,
        asset_id: result.asset_id,
        image: {
          width: img.width,
          height: img.height,
          mime_type: img.mime_type,
          byte_size: img.byte_size,
        },
        name: layerName,
      });
    },
  );

  server.registerTool(
    "import_svg",
    {
      description:
        "Import an SVG file and convert it into native Lottie shapes (rectangles, circles, ellipses, lines, polygons, polylines, paths). Each top-level SVG element becomes its own Group inside a shape layer, so you can move/recolor/animate the pieces individually with `set_group_transform`, `update_shape_color`, etc. `split` controls layering: `'single-layer'` (default) puts all converted shapes in one layer; `'per-top-level'` makes each top-level SVG element its own layer (better for independent animation timing). Supports SVG `<g>`, `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`, `<path>` (with M/L/C/Q/T/S/A/Z, all normalized to cubic bezier). Path data is converted using `svg-pathdata`. Best-effort for `matrix()` transforms; full support for translate/scale/rotate. Pushes one undo entry. Returns the new layer indices and any conversion notes (skipped elements, etc.).",
      inputSchema: ImportSvgInput,
    },
    async ({ doc_id, source, name, split }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const conv = await readSvgFile(source);
      const baseName = name && name.trim() ? name : basename(source);
      const splitMode = split ?? "single-layer";
      let shapes_per_layer: object[][];
      let layer_names: string[];
      if (splitMode === "per-top-level") {
        shapes_per_layer = conv.top_level_groups.map((g) => [g]);
        layer_names = conv.top_level_groups.map((g) => {
          const nm = (g as { nm?: string }).nm;
          return nm ? `${baseName} – ${nm}` : baseName;
        });
      } else {
        shapes_per_layer = [conv.shapes];
        layer_names = [baseName];
      }
      const result = importSvgLayers(entry.history.current, {
        shapes_per_layer,
        layer_names,
      });
      store.applyMutation(id, result.animation);
      return jsonResult({
        doc_id: id,
        layer_indices: result.layer_indices,
        layer_count_added: result.layer_indices.length,
        view_box: { width: conv.view_width, height: conv.view_height },
        notes: conv.notes,
        split: splitMode,
      });
    },
  );

  server.registerTool(
    "add_polygon",
    {
      description:
        "Append a regular polygon (triangle, square, pentagon, hexagon, etc.) to a shape layer. Uses Lottie's native `sr` polystar shape with `sy:2`. `points` is the number of sides (>= 3). `outer_radius` is the distance from center to vertex. Pushes onto undo history.",
      inputSchema: AddPolygonInput,
    },
    async ({ doc_id, layer_index, points, outer_radius, rotation, outer_roundness, position, color, name }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = addPolygonShape(entry.history.current, layer_index, {
        points,
        outer_radius,
        rotation,
        outer_roundness,
        position,
        color,
        name,
      });
      store.applyMutation(id, next);
      const newShapeIndex = (next.layers[layer_index] as { shapes: unknown[] }).shapes.length - 1;
      return jsonResult({
        doc_id: id,
        shape_path: `layers.${layer_index}.shapes.${newShapeIndex}`,
      });
    },
  );

  server.registerTool(
    "add_star",
    {
      description:
        "Append a star (or starburst) to a shape layer. Uses Lottie's native `sr` polystar shape with `sy:1`. `points` is the number of star points; `outer_radius` and `inner_radius` (default outer/2) define the spikiness. `outer_roundness` and `inner_roundness` round the corners (0–100). Pushes onto undo history.",
      inputSchema: AddStarInput,
    },
    async ({
      doc_id,
      layer_index,
      points,
      outer_radius,
      inner_radius,
      rotation,
      outer_roundness,
      inner_roundness,
      position,
      color,
      name,
    }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = addStarShape(entry.history.current, layer_index, {
        points,
        outer_radius,
        inner_radius,
        rotation,
        outer_roundness,
        inner_roundness,
        position,
        color,
        name,
      });
      store.applyMutation(id, next);
      const newShapeIndex = (next.layers[layer_index] as { shapes: unknown[] }).shapes.length - 1;
      return jsonResult({
        doc_id: id,
        shape_path: `layers.${layer_index}.shapes.${newShapeIndex}`,
      });
    },
  );

  server.registerTool(
    "add_path",
    {
      description:
        "Append a custom path (free-form polygon or bezier curve) to a shape layer. `vertices` is an array of [x, y] points in layer-local coords. Optional `in_tangents`/`out_tangents` (same length as vertices, [0,0] for sharp corners) define bezier curves. `closed` (default true) closes the path back to the first vertex. Optional `fill_color` / `stroke_color` / `stroke_width`. Pushes onto undo history.",
      inputSchema: AddPathInput,
    },
    async ({
      doc_id,
      layer_index,
      vertices,
      in_tangents,
      out_tangents,
      closed,
      fill_color,
      stroke_color,
      stroke_width,
      position,
      name,
    }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = addPath(entry.history.current, layer_index, {
        vertices,
        in_tangents,
        out_tangents,
        closed,
        fill_color,
        stroke_color,
        stroke_width,
        position,
        name,
      });
      store.applyMutation(id, next);
      const newShapeIndex = (next.layers[layer_index] as { shapes: unknown[] }).shapes.length - 1;
      return jsonResult({
        doc_id: id,
        shape_path: `layers.${layer_index}.shapes.${newShapeIndex}`,
      });
    },
  );

  server.registerTool(
    "add_text_layer",
    {
      description:
        "Add a text layer to the lottie. `text` is the string to display. `font_family` defaults to Arial; the font name is recorded in the lottie's `fonts.list` so the player knows what to render with (system font fallback applies if not embedded). `font_size` defaults to 48px. `color` defaults to black. `position` defaults to canvas center. `justification`: left, center (default), or right. `tracking` is letter-spacing. `line_height` defaults to 1.2× font_size. Pushes onto undo history.",
      inputSchema: AddTextLayerInput,
    },
    async ({
      doc_id,
      text,
      font_family,
      font_size,
      color,
      position,
      justification,
      name,
      tracking,
      line_height,
    }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const result = addTextLayer(entry.history.current, {
        text,
        font_family,
        font_size,
        color,
        position,
        justification,
        name,
        tracking,
        line_height,
      });
      store.applyMutation(id, result.animation);
      return jsonResult({
        doc_id: id,
        layer_index: result.layer_index,
        text,
        font_family: font_family ?? "Arial",
        font_size: font_size ?? 48,
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
