import { AlignInput, LayerBoundsInput, SetGroupTransformInput, ShapeBoundsInput, } from "../schemas.js";
import { setGroupTransform, setLayerTransform, } from "../../../lib/animation.js";
import { computeAlignDelta, computeLayerBounds, computeShapeBounds, } from "../lottie-utils.js";
import { jsonResult } from "./shared.js";
export const register = (server, store) => {
    server.registerTool("set_group_transform", {
        description: "Set transform properties on a Group shape (the dual of `set_layer_transform`, but for shapes inside a layer). `position` is [x, y] in layer-local pixels. `scale` is a percentage (100 = identity). `rotation` in degrees. `opacity` 0–100. Omitted properties are left unchanged. Pushes onto undo history.",
        inputSchema: SetGroupTransformInput,
    }, async ({ doc_id, group_path, position, scale, rotation, opacity }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = setGroupTransform(entry.history.current, group_path, {
            position,
            scale,
            rotation,
            opacity,
        });
        store.applyMutation(id, next);
        return jsonResult({
            doc_id: id,
            group_path,
            applied: { position, scale, rotation, opacity },
        });
    });
    server.registerTool("get_layer_bounds", {
        description: "Compute the bounding box of a layer's content. Returns both `layer_local` (in the layer's own coordinate space, useful for setting group transforms) and `canvas` (in canvas pixels, useful for aligning to the page). Best-effort: exact for shape layers built from rectangles/ellipses/groups; returns approximations for paths and unsupported types.",
        inputSchema: LayerBoundsInput,
    }, async ({ doc_id, layer_index }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        const bounds = computeLayerBounds(a, layer_index);
        return jsonResult({ layer_index, ...bounds });
    });
    server.registerTool("get_shape_bounds", {
        description: "Compute the bounding box of a single shape (group or primitive) at the given lodash path. Returns layer-local and canvas coordinates plus a best-effort flag.",
        inputSchema: ShapeBoundsInput,
    }, async ({ doc_id, shape_path }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        const bounds = computeShapeBounds(a, shape_path);
        return jsonResult({ shape_path, ...bounds });
    });
    server.registerTool("align", {
        description: "High-level positioning: align a layer or group to a canvas-relative slot in one call. `target_path` is a layer path (`layers.N`) or group path (`layers.N.shapes.M`). Horizontal: left|center|right|third-left|third-right. Vertical: top|middle|bottom|third-top|third-bottom. `margin` (default 0) is the offset from the canvas edge for left/right/top/bottom anchors. Internally uses get_*_bounds to figure out the object's size, then nudges the appropriate transform. Pushes one undo entry.",
        inputSchema: AlignInput,
    }, async ({ doc_id, target_path, horizontal, vertical, margin }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const animation = entry.history.current;
        const isLayerPath = /^layers\.\d+$/.test(target_path);
        const isShapePath = /^layers\.\d+\.shapes\.[\d.it]+$/.test(target_path);
        if (!isLayerPath && !isShapePath) {
            throw new Error(`target_path must be a layer (layers.N) or shape path (layers.N.shapes.M…); got "${target_path}"`);
        }
        const bounds = isLayerPath
            ? computeLayerBounds(animation, Number(target_path.split(".")[1]))
            : computeShapeBounds(animation, target_path);
        if (!bounds.canvas) {
            throw new Error(`Could not compute bounds for ${target_path}. Notes: ${bounds.notes.join("; ")}`);
        }
        const delta = computeAlignDelta(animation, bounds.canvas, horizontal, vertical, margin ?? 0);
        let next;
        if (isLayerPath) {
            const layerIndex = Number(target_path.split(".")[1]);
            const layer = animation.layers[layerIndex];
            const currentP = layer.ks?.p?.k ?? [0, 0, 0];
            next = setLayerTransform(animation, layerIndex, {
                position: [
                    (currentP[0] ?? 0) + delta.delta_x,
                    (currentP[1] ?? 0) + delta.delta_y,
                    currentP[2] ?? 0,
                ],
            });
        }
        else {
            // shape path
            const groupPath = target_path;
            const dotIdx = groupPath.lastIndexOf(".shapes.");
            const layerIdxStr = groupPath.slice("layers.".length, dotIdx);
            const layerIndex = Number(layerIdxStr);
            const layer = animation.layers[layerIndex];
            const sk = layer.ks?.s?.k ?? [100, 100];
            const sx = (sk[0] ?? 100) / 100;
            const sy = (sk[1] ?? 100) / 100;
            // Find the group; it's a `gr` shape with a tr child whose .p we modify in layer-local coords.
            // Convert canvas delta to layer-local by dividing by layer scale.
            const groupNode = (await import("../../../lib/animation.js")).getSelectedShape(animation, groupPath);
            if (!groupNode) {
                throw new Error(`No shape at ${groupPath}`);
            }
            // Read current group tr.p
            const lodash = await import("lodash-es");
            const itArr = lodash.get(animation, `${groupPath}.it`);
            const tr = itArr?.find((s) => s.ty === "tr");
            if (!tr)
                throw new Error(`Group at ${groupPath} has no transform`);
            const cur = tr.p?.k ?? [0, 0];
            next = setGroupTransform(animation, groupPath, {
                position: [
                    (cur[0] ?? 0) + delta.delta_x / sx,
                    (cur[1] ?? 0) + delta.delta_y / sy,
                ],
            });
        }
        store.applyMutation(id, next);
        return jsonResult({
            doc_id: id,
            target_path,
            delta_canvas: { x: delta.delta_x, y: delta.delta_y },
            target_bounds: delta.target_canvas_bounds,
            was_best_effort: bounds.best_effort,
            bounds_notes: bounds.notes,
        });
    });
};
//# sourceMappingURL=geometry.js.map