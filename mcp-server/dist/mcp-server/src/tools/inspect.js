import { get } from "lodash-es";
import { DescribeInput, KeyframesInput, LayerTimingInput, ListAnimatedInput, } from "../schemas.js";
import { animationDurationSeconds, colorPalette, describeLayer, walkAnimatedProperties, } from "../lottie-utils.js";
import { jsonResult } from "./shared.js";
export const register = (server, store) => {
    server.registerTool("describe_animation", {
        description: "Comprehensive single-call summary of a lottie. Returns dimensions, framerate, in/out frames, duration, layer count, animated-property count, color palette, and a per-layer breakdown (name, type, in/out, parent, blend mode, shape count, animated-property count). Best opening call for a new conversation about a lottie.",
        inputSchema: DescribeInput,
    }, async ({ doc_id }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        const animated = walkAnimatedProperties(a);
        const layers = a.layers.map((_, i) => describeLayer(a, i));
        return jsonResult({
            width: a.w,
            height: a.h,
            framerate: a.fr,
            in_frame: a.ip,
            out_frame: a.op,
            duration_seconds: animationDurationSeconds(a),
            duration_frames: (a.op ?? 0) - (a.ip ?? 0),
            layer_count: a.layers.length,
            animated_property_count: animated.length,
            color_palette: colorPalette(a),
            layers,
        });
    });
    server.registerTool("list_animated_properties", {
        description: "Walk the lottie and return every animated property (`a:1`) with its lodash path, human label, keyframe count, and frame range. Use this to find what's actually moving — required before timing edits like 'make the bounce slower' or 'start the rotation later'.",
        inputSchema: ListAnimatedInput,
    }, async ({ doc_id }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        return jsonResult(walkAnimatedProperties(a));
    });
    server.registerTool("get_keyframes", {
        description: "Return the raw keyframe array for an animated property at the given path (e.g. `layers.0.ks.s`). Each keyframe has `t` (frame), `s` (value at this frame), and bezier `i`/`o` handles for easing. Returns null/error if the property is not animated.",
        inputSchema: KeyframesInput,
    }, async ({ doc_id, property_path }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        const prop = get(a, property_path);
        if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) {
            return jsonResult({
                property_path,
                animated: false,
                note: "property is static (a=0) or path does not point to a property object",
            });
        }
        return jsonResult({
            property_path,
            animated: true,
            keyframe_count: prop.k.length,
            keyframes: prop.k,
        });
    });
    server.registerTool("get_layer_timing", {
        description: "Get a layer's visibility/timing info: in/out frames, time-stretch, parent layer (if any), and computed duration in frames and seconds.",
        inputSchema: LayerTimingInput,
    }, async ({ doc_id, layer_index }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        const desc = describeLayer(a, layer_index);
        return jsonResult({
            layer_index: desc.index,
            name: desc.name,
            in_frame: desc.in_frame,
            out_frame: desc.out_frame,
            time_stretch: desc.time_stretch,
            parent_ind: desc.parent_ind,
            parent_index: desc.parent_index,
            duration_frames: desc.out_frame - desc.in_frame,
            duration_seconds: (a.fr ?? 0) > 0 ? (desc.out_frame - desc.in_frame) / (a.fr ?? 1) : 0,
        });
    });
};
//# sourceMappingURL=inspect.js.map