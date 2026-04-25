import { DimensionsInput, FindByColorInput, FindByNameInput, FramerateInput, LayersInput, ShapeInput, } from "../schemas.js";
import { getAnimationLayers, getDimensions, getFramerate, getSelectedShape, } from "../../../lib/animation.js";
import { colorDistance, walkColoredShapes } from "../lottie-utils.js";
import { jsonResult } from "./shared.js";
const DEFAULT_TOLERANCE = 8;
export const register = (server, store) => {
    server.registerTool("get_animation_layers", {
        description: "Get the full layer tree for a document. Each layer contains shape descendants with lodash-style paths (e.g. `layers.0.shapes.1`) usable with `get_shape` and `update_shape_color`.",
        inputSchema: LayersInput,
    }, async ({ doc_id }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        return jsonResult(getAnimationLayers(a));
    });
    server.registerTool("get_shape", {
        description: "Get details for a single shape by its lodash path (e.g. `layers.0.shapes.1`).",
        inputSchema: ShapeInput,
    }, async ({ doc_id, path }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        return jsonResult(getSelectedShape(a, path));
    });
    server.registerTool("get_framerate", {
        description: "Get the framerate (frames per second) of a document.",
        inputSchema: FramerateInput,
    }, async ({ doc_id }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        return jsonResult({ framerate: getFramerate(a) });
    });
    server.registerTool("get_dimensions", {
        description: "Get the canvas width and height of a document.",
        inputSchema: DimensionsInput,
    }, async ({ doc_id }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        return jsonResult(getDimensions(a));
    });
    server.registerTool("find_shapes_by_color", {
        description: "Find all fill/stroke shapes whose color is within `tolerance` (Euclidean distance in 0–255 RGB space, default 8) of the target color. Returns layer/shape paths usable with `update_shape_color`.",
        inputSchema: FindByColorInput,
    }, async ({ doc_id, color, tolerance }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        const tol = tolerance ?? DEFAULT_TOLERANCE;
        const matches = walkColoredShapes(a).filter((s) => colorDistance(s.color, color) <= tol);
        return jsonResult(matches);
    });
    server.registerTool("find_layer_by_name", {
        description: "Find layers whose name matches `query`. Modes: `exact` (default), `contains` (substring, case-insensitive), `regex` (full JS regex).",
        inputSchema: FindByNameInput,
    }, async ({ doc_id, query, mode }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        const m = mode ?? "exact";
        const layers = getAnimationLayers(a);
        let predicate;
        if (m === "exact") {
            predicate = (n) => n === query;
        }
        else if (m === "contains") {
            const q = query.toLowerCase();
            predicate = (n) => n.toLowerCase().includes(q);
        }
        else {
            const re = new RegExp(query);
            predicate = (n) => re.test(n);
        }
        return jsonResult(layers.filter((l) => predicate(l.name)));
    });
};
//# sourceMappingURL=read.js.map