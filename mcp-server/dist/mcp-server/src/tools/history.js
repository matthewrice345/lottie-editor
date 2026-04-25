import { RedoInput, UndoInput } from "../schemas.js";
import { jsonResult } from "./shared.js";
export const register = (server, store) => {
    server.registerTool("undo", {
        description: "Undo the last mutation on a document. Returns whether an undo was performed and the resulting can_undo/can_redo state.",
        inputSchema: UndoInput,
    }, async ({ doc_id }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const before = entry.history.current;
        const result = entry.history.undo();
        const undone = result !== null;
        if (undone) {
            entry.dirty = entry.history.current !== before;
            store.notifyHistoryChanged(id);
        }
        return jsonResult({
            doc_id: id,
            undone,
            can_undo: entry.history.canUndo,
            can_redo: entry.history.canRedo,
        });
    });
    server.registerTool("redo", {
        description: "Redo the last undone mutation on a document. Returns whether a redo was performed and the resulting can_undo/can_redo state.",
        inputSchema: RedoInput,
    }, async ({ doc_id }) => {
        const id = store.resolveId(doc_id);
        const entry = store.get(id);
        const before = entry.history.current;
        const result = entry.history.redo();
        const redone = result !== null;
        if (redone) {
            entry.dirty = entry.history.current !== before;
            store.notifyHistoryChanged(id);
        }
        return jsonResult({
            doc_id: id,
            redone,
            can_undo: entry.history.canUndo,
            can_redo: entry.history.canRedo,
        });
    });
};
//# sourceMappingURL=history.js.map