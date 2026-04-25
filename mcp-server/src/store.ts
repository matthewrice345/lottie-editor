import { Animation } from "@lottie-animation-community/lottie-types";
import { History } from "../../lib/history.js";
import { randomUUID } from "node:crypto";
import { Bridge } from "./bridge.js";

export interface DocumentEntry {
  id: string;
  name: string;
  sourcePath?: string;
  history: History<Animation>;
  dirty: boolean;
  touchedAt: number;
}

export class DocumentStore {
  private docs = new Map<string, DocumentEntry>();
  private bridge?: Bridge;

  constructor(bridge?: Bridge) {
    this.bridge = bridge;
  }

  create(
    animation: Animation,
    name: string,
    sourcePath?: string,
    fromClientId?: string,
  ): DocumentEntry {
    const id = randomUUID();
    const entry: DocumentEntry = {
      id,
      name,
      sourcePath,
      history: new History<Animation>(animation),
      dirty: false,
      touchedAt: Date.now(),
    };
    this.docs.set(id, entry);
    this.broadcastUpdate(entry, fromClientId);
    return entry;
  }

  get(id: string): DocumentEntry {
    const entry = this.docs.get(id);
    if (!entry) throw new Error(`Unknown doc_id: ${id}`);
    return entry;
  }

  has(id: string): boolean {
    return this.docs.has(id);
  }

  list(): DocumentEntry[] {
    return Array.from(this.docs.values());
  }

  resolveId(id?: string | null): string {
    if (id) {
      if (!this.docs.has(id)) throw new Error(`Unknown doc_id: ${id}`);
      return id;
    }
    if (this.docs.size === 0) {
      throw new Error(
        "No documents are open. Use load_lottie or open one in the browser editor.",
      );
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

  close(id: string, fromClientId?: string): boolean {
    const removed = this.docs.delete(id);
    if (removed)
      this.bridge?.broadcast({
        type: "doc-closed",
        doc_id: id,
        from_client_id: fromClientId,
      });
    return removed;
  }

  applyMutation(id: string, next: Animation): DocumentEntry {
    const entry = this.get(id);
    entry.history.push(next);
    entry.dirty = true;
    entry.touchedAt = Date.now();
    this.broadcastUpdate(entry);
    return entry;
  }

  applyClientMutation(
    id: string,
    next: Animation,
    fromClientId: string,
  ): DocumentEntry {
    const entry = this.get(id);
    entry.history.push(next);
    entry.dirty = true;
    entry.touchedAt = Date.now();
    this.broadcastUpdate(entry, fromClientId);
    return entry;
  }

  rename(id: string, name: string): void {
    const entry = this.get(id);
    if (name && name !== entry.name) entry.name = name;
  }

  markClean(id: string): void {
    const entry = this.get(id);
    entry.dirty = false;
    this.broadcastUpdate(entry);
  }

  notifyHistoryChanged(id: string): void {
    const entry = this.get(id);
    entry.touchedAt = Date.now();
    this.broadcastUpdate(entry);
  }

  private broadcastUpdate(
    entry: DocumentEntry,
    fromClientId?: string,
  ): void {
    if (!this.bridge) return;
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
