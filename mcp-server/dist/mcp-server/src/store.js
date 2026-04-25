import { History } from "../../lib/history.js";
import { randomUUID } from "node:crypto";
export class DocumentStore {
    docs = new Map();
    bridge;
    constructor(bridge) {
        this.bridge = bridge;
    }
    create(animation, name, sourcePath, fromClientId) {
        const id = randomUUID();
        const entry = {
            id,
            name,
            sourcePath,
            history: new History(animation),
            dirty: false,
            touchedAt: Date.now(),
        };
        this.docs.set(id, entry);
        this.broadcastUpdate(entry, fromClientId);
        return entry;
    }
    get(id) {
        const entry = this.docs.get(id);
        if (!entry)
            throw new Error(`Unknown doc_id: ${id}`);
        return entry;
    }
    has(id) {
        return this.docs.has(id);
    }
    list() {
        return Array.from(this.docs.values());
    }
    resolveId(id) {
        if (id) {
            if (!this.docs.has(id))
                throw new Error(`Unknown doc_id: ${id}`);
            return id;
        }
        if (this.docs.size === 0) {
            throw new Error("No documents are open. Use load_lottie or open one in the browser editor.");
        }
        let bestId = "";
        let bestTime = -Infinity;
        for (const [k, v] of this.docs) {
            if (v.touchedAt > bestTime) {
                bestTime = v.touchedAt;
                bestId = k;
            }
        }
        return bestId;
    }
    close(id, fromClientId) {
        const removed = this.docs.delete(id);
        if (removed)
            this.bridge?.broadcast({
                type: "doc-closed",
                doc_id: id,
                from_client_id: fromClientId,
            });
        return removed;
    }
    applyMutation(id, next) {
        const entry = this.get(id);
        entry.history.push(next);
        entry.dirty = true;
        entry.touchedAt = Date.now();
        this.broadcastUpdate(entry);
        return entry;
    }
    applyClientMutation(id, next, fromClientId) {
        const entry = this.get(id);
        entry.history.push(next);
        entry.dirty = true;
        entry.touchedAt = Date.now();
        this.broadcastUpdate(entry, fromClientId);
        return entry;
    }
    rename(id, name) {
        const entry = this.get(id);
        if (name && name !== entry.name)
            entry.name = name;
    }
    markClean(id) {
        const entry = this.get(id);
        entry.dirty = false;
        this.broadcastUpdate(entry);
    }
    notifyHistoryChanged(id) {
        const entry = this.get(id);
        entry.touchedAt = Date.now();
        this.broadcastUpdate(entry);
    }
    broadcastUpdate(entry, fromClientId) {
        if (!this.bridge)
            return;
        this.bridge.broadcast({
            type: "doc-update",
            doc_id: entry.id,
            name: entry.name,
            animation: entry.history.current,
            can_undo: entry.history.canUndo,
            can_redo: entry.history.canRedo,
            dirty: entry.dirty,
            from_client_id: fromClientId,
        });
    }
}
//# sourceMappingURL=store.js.map