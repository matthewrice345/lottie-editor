import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import type { Animation } from "@lottie-animation-community/lottie-types";

export type ServerMessage =
  | {
      type: "doc-update";
      doc_id: string;
      name: string;
      animation: Animation;
      can_undo: boolean;
      can_redo: boolean;
      dirty: boolean;
      from_client_id?: string;
    }
  | { type: "doc-closed"; doc_id: string; from_client_id?: string }
  | { type: "hello"; client_id: string };

export type ClientMessage =
  | {
      type: "client-state";
      doc_id?: string | null;
      animation: Animation;
      name?: string;
    }
  | { type: "client-clear"; doc_id: string };

export type ClientHandler = (
  msg: ClientMessage,
  fromClientId: string,
) => void;

const DEFAULT_PORT = 8765;
const CLIENT_ID = Symbol("clientId");

interface WSWithId extends WebSocket {
  [CLIENT_ID]?: string;
}

export class Bridge {
  private wss?: WebSocketServer;
  private port: number;
  private snapshot: ServerMessage[] = [];
  private handler?: ClientHandler;

  constructor(port = DEFAULT_PORT) {
    this.port = port;
  }

  setHandler(handler: ClientHandler): void {
    this.handler = handler;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port: this.port });
      wss.on("listening", () => {
        console.error(`[bridge] listening on ws://localhost:${this.port}`);
        resolve();
      });
      wss.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.error(
            `[bridge] port ${this.port} in use; live bridge disabled. Set LOTTIE_MCP_BRIDGE_PORT to override or stop the conflicting server.`,
          );
          this.wss = undefined;
          resolve();
        } else {
          reject(err);
        }
      });
      wss.on("connection", (ws: WSWithId) => {
        const clientId = randomUUID();
        ws[CLIENT_ID] = clientId;
        ws.send(
          JSON.stringify({
            type: "hello",
            client_id: clientId,
          } satisfies ServerMessage),
        );
        for (const msg of this.snapshot) {
          ws.send(JSON.stringify(msg));
        }
        console.error(
          `[bridge] client ${clientId.slice(0, 8)} connected (${wss.clients.size} total)`,
        );

        ws.on("message", (data) => {
          if (!this.handler) return;
          let parsed: ClientMessage;
          try {
            parsed = JSON.parse(data.toString());
          } catch (e) {
            console.error("[bridge] bad client message", e);
            return;
          }
          try {
            this.handler(parsed, clientId);
          } catch (e) {
            console.error("[bridge] handler threw", e);
          }
        });

        ws.on("close", () => {
          console.error(
            `[bridge] client ${clientId.slice(0, 8)} disconnected`,
          );
        });
      });
      this.wss = wss;
    });
  }

  broadcast(message: ServerMessage): void {
    if (message.type === "doc-update") {
      const idx = this.snapshot.findIndex(
        (m) => m.type === "doc-update" && m.doc_id === message.doc_id,
      );
      if (idx >= 0) this.snapshot[idx] = message;
      else this.snapshot.push(message);
    } else if (message.type === "doc-closed") {
      this.snapshot = this.snapshot.filter(
        (m) => !(m.type === "doc-update" && m.doc_id === message.doc_id),
      );
    }

    if (!this.wss) return;
    const text = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === client.OPEN) client.send(text);
    }
  }

  stop(): void {
    this.wss?.close();
    this.wss = undefined;
  }
}
