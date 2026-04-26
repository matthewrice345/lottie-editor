import { AddBlurInput, AddDropShadowInput, AddMaskInput, DuplicateLayerInput, SetCornerRadiusInput, SetLayerBlendModeInput, SetLayerParentInput, SetStrokeDashInput, } from "../schemas.js";
import { addBlur, addDropShadow, addMask, duplicateLayer, setCornerRadius, setLayerBlendMode, setLayerParent, setStrokeDash, } from "../../../lib/animation.js";
import { jsonResult } from "./shared.js";
export const register = (server, store) => {
    // ===== Tier 1: Layer parenting =====
    server.registerTool("set_layer_parent", {
        description: "Make one layer a child of another. The child's transform inherits from the parent's, so moving the parent moves the child too. Pass `parent_layer_index: null` to detach. Foundational for character rigging and compound motion.",
        inputSchema: SetLayerParentInput,
    }, async ({ doc_id, child_layer_index, parent_layer_index }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = setLayerParent(entry.history.current, child_layer_index, parent_layer_index);
        store.applyMutation(id, next);
        return jsonResult({
            doc_id: id,
            child_layer_index,
            parent_layer_index,
        });
    });
    // ===== Tier 2: Duplicate =====
    server.registerTool("duplicate_layer", {
        description: "Deep-clone a layer (including all its shapes, transforms, and animations) and append the copy to the end of the layer stack. Returns the new layer's index. Pushes onto undo history.",
        inputSchema: DuplicateLayerInput,
    }, async ({ doc_id, layer_index, name }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const result = duplicateLayer(entry.history.current, layer_index, name);
        store.applyMutation(id, result.animation);
        return jsonResult({
            doc_id: id,
            source_layer_index: layer_index,
            new_layer_index: result.layer_index,
        });
    });
    // ===== Tier 2: Corner radius =====
    server.registerTool("set_corner_radius", {
        description: "Set the corner radius of a rectangle shape. `shape_path` can point at a `rc` shape directly or at a `gr` group containing one. Pushes onto undo history.",
        inputSchema: SetCornerRadiusInput,
    }, async ({ doc_id, shape_path, radius }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = setCornerRadius(entry.history.current, shape_path, radius);
        store.applyMutation(id, next);
        return jsonResult({ doc_id: id, shape_path, radius });
    });
    // ===== Tier 3: Blend mode =====
    server.registerTool("set_layer_blend_mode", {
        description: "Set a layer's blend mode (how it composites against layers below). Modes: normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity.",
        inputSchema: SetLayerBlendModeInput,
    }, async ({ doc_id, layer_index, mode }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = setLayerBlendMode(entry.history.current, layer_index, mode);
        store.applyMutation(id, next);
        return jsonResult({ doc_id: id, layer_index, mode });
    });
    // ===== Tier 3: Mask =====
    server.registerTool("add_mask", {
        description: "Add a vector mask to a layer, clipping its rendering to the masked region. `vertices` is an array of [x, y] points in layer-local coords. Optional `in_tangents`/`out_tangents` for bezier curves. `mode`: add (default), subtract, intersect, lighten, darken, difference. Use `inverted: true` to flip the mask. Pushes onto undo history.",
        inputSchema: AddMaskInput,
    }, async ({ doc_id, layer_index, vertices, in_tangents, out_tangents, closed, mode, inverted, opacity, expansion, name, }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = addMask(entry.history.current, layer_index, {
            vertices,
            in_tangents,
            out_tangents,
            closed,
            mode,
            inverted,
            opacity,
            expansion,
            name,
        });
        store.applyMutation(id, next);
        return jsonResult({
            doc_id: id,
            layer_index,
            mask_mode: mode ?? "add",
            vertex_count: vertices.length,
        });
    });
    // ===== Tier 3: Stroke dash =====
    server.registerTool("set_stroke_dash", {
        description: "Make a stroke shape dashed. `dash` is the dash length in pixels; `gap` defaults to the same value (so equal dashes/gaps); `offset` shifts the pattern start. Useful for line-drawing animations (animate the offset to draw the line on). Pushes onto undo history.",
        inputSchema: SetStrokeDashInput,
    }, async ({ doc_id, shape_path, dash, gap, offset }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = setStrokeDash(entry.history.current, shape_path, {
            dash,
            gap,
            offset,
        });
        store.applyMutation(id, next);
        return jsonResult({ doc_id: id, shape_path, dash, gap: gap ?? dash, offset: offset ?? 0 });
    });
    // ===== Tier 3: Effects =====
    server.registerTool("add_drop_shadow", {
        description: "Add a drop shadow effect to a layer. Defaults: black, 100% opacity, 135° direction, 10px distance, 5px softness. Pushes onto undo history.",
        inputSchema: AddDropShadowInput,
    }, async ({ doc_id, layer_index, color, opacity, direction, distance, softness }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = addDropShadow(entry.history.current, layer_index, {
            color,
            opacity,
            direction,
            distance,
            softness,
        });
        store.applyMutation(id, next);
        return jsonResult({ doc_id: id, layer_index, effect: "drop_shadow" });
    });
    server.registerTool("add_blur", {
        description: "Add a Gaussian blur effect to a layer. `amount` is the blurriness in pixels. `dimensions`: 1 = horizontal & vertical (default), 2 = horizontal only, 3 = vertical only. Pushes onto undo history.",
        inputSchema: AddBlurInput,
    }, async ({ doc_id, layer_index, amount, dimensions, repeat_edge_pixels }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const next = addBlur(entry.history.current, layer_index, {
            amount,
            dimensions,
            repeat_edge_pixels,
        });
        store.applyMutation(id, next);
        return jsonResult({ doc_id: id, layer_index, effect: "blur", amount });
    });
};
//# sourceMappingURL=compose.js.map