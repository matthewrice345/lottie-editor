import { loadFromSource, writeToPath } from "../io.js";
import { CloseInput, CreateBlankLottieInput, ListInput, LoadInput, SaveInput, SummaryInput, } from "../schemas.js";
import { animationDurationSeconds, colorPalette } from "../lottie-utils.js";
import { createBlankLottie } from "../../../lib/animation.js";
import { jsonResult } from "./shared.js";
export const register = (server, store) => {
    server.registerTool("load_lottie", {
        description: "Load a lottie file from an absolute filesystem path or an http(s):// URL. Returns a doc_id used by subsequent tools, plus a one-shot summary of the animation.",
        inputSchema: LoadInput,
    }, async ({ source }) => {
        const { animation, name, sourcePath } = await loadFromSource(source);
        const entry = store.create(animation, name, sourcePath);
        return jsonResult({
            doc_id: entry.id,
            name: entry.name,
            source_path: entry.sourcePath ?? null,
            summary: {
                width: animation.w,
                height: animation.h,
                framerate: animation.fr,
                duration_seconds: animationDurationSeconds(animation),
                layer_count: animation.layers.length,
                color_palette: colorPalette(animation),
            },
        });
    });
    server.registerTool("create_blank_lottie", {
        description: "Create a fresh empty lottie document with no layers and become its owner. Defaults: 1080×1080, 30fps, 3-second duration, name 'Untitled'. Returns a doc_id ready for `import_svg`, `add_shape_layer`, or other create tools. Use this as the first step when starting from scratch (e.g., when building a lottie around an SVG).",
        inputSchema: CreateBlankLottieInput,
    }, async ({ width, height, fps, duration_seconds, duration_frames, name }) => {
        const animation = createBlankLottie({
            width,
            height,
            fps,
            duration_seconds,
            duration_frames,
            name,
        });
        const entry = store.create(animation, animation.nm ?? "Untitled");
        return jsonResult({
            doc_id: entry.id,
            name: entry.name,
            width: animation.w,
            height: animation.h,
            framerate: animation.fr,
            in_frame: animation.ip,
            out_frame: animation.op,
            duration_seconds: animationDurationSeconds(animation),
        });
    });
    server.registerTool("save_lottie", {
        description: "Write the current state of a document to disk as JSON. If `path` is omitted, writes back to the document's original source path (only valid for documents loaded from a local file).",
        inputSchema: SaveInput,
    }, async ({ doc_id, path }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const target = path ?? entry.sourcePath;
        if (!target) {
            throw new Error("No path provided and document has no source path (loaded from URL?). Provide an absolute `path`.");
        }
        const bytes = await writeToPath(target, entry.history.current);
        if (!entry.sourcePath)
            entry.sourcePath = target;
        store.markClean(id);
        return jsonResult({ path: target, bytes_written: bytes });
    });
    server.registerTool("list_documents", {
        description: "List all currently loaded documents.",
        inputSchema: ListInput,
    }, async () => {
        return jsonResult(store.list().map((e) => ({
            doc_id: e.id,
            name: e.name,
            source_path: e.sourcePath ?? null,
            dirty: e.dirty,
            can_undo: e.history.canUndo,
            can_redo: e.history.canRedo,
        })));
    });
    server.registerTool("close_document", {
        description: "Drop a document from memory. Warns if there are unsaved changes (returns dirty=true) but still closes.",
        inputSchema: CloseInput,
    }, async ({ doc_id }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const wasDirty = entry.dirty;
        store.close(id);
        return jsonResult({ closed: true, was_dirty: wasDirty });
    });
    server.registerTool("get_animation_summary", {
        description: "Get a single-call overview of a document: dimensions, framerate, duration, layer count, and unique color palette.",
        inputSchema: SummaryInput,
    }, async ({ doc_id }) => {
        const a = store.get(store.resolveId(doc_id)).history.current;
        return jsonResult({
            width: a.w,
            height: a.h,
            framerate: a.fr,
            duration_seconds: animationDurationSeconds(a),
            layer_count: a.layers.length,
            color_palette: colorPalette(a),
        });
    });
};
//# sourceMappingURL=documents.js.map