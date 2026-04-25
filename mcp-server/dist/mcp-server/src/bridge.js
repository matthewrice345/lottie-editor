import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
const DEFAULT_PORT = 8765;
const CLIENT_ID = Symbol("clientId");
export class Bridge {
    wss;
    port;
    snapshot = [];
    handler;
    constructor(port = DEFAULT_PORT) {
        this.port = port;
    }
    setHandler(handler) {
        this.handler = handler;
    }
    start() {
        return new Promise((resolve, reject) => {
            const wss = new WebSocketServer({ port: this.port });
            wss.on("listening", () => {
                console.error(`[bridge] listening on ws://localhost:${this.port}`);
                resolve();
            });
            wss.on("error", (err) => {
                if (err.code === "EADDRINUSE") {
                    console.error(`[bridge] port ${this.port} in use; live bridge disabled. Set LOTTIE_MCP_BRIDGE_PORT to override or stop the conflicting server.`);
                    this.wss = undefined;
                    resolve();
                }
                else {
                    reject(err);
                }
            });
            wss.on("connection", (ws) => {
                const clientId = randomUUID();
                ws[CLIENT_ID] = clientId;
                ws.send(JSON.stringify({
                    type: "hello",
                    client_id: clientId,
                }));
                for (const msg of this.snapshot) {
                    ws.send(JSON.stringify(msg));
                }
                console.error(`[bridge] client ${clientId.slice(0, 8)} connected (${wss.clients.size} total)`);
                ws.on("message", (data) => {
                    if (!this.handler)
                        return;
                    let parsed;
                    try {
                        parsed = JSON.parse(data.toString());
                    }
                    catch (e) {
                        console.error("[bridge] bad client message", e);
                        return;
                    }
                    try {
                        this.handler(parsed, clientId);
                    }
                    catch (e) {
                        console.error("[bridge] handler threw", e);
                    }
                });
                ws.on("close", () => {
                    console.error(`[bridge] client ${clientId.slice(0, 8)} disconnected`);
                });
            });
            this.wss = wss;
        });
    }
    broadcast(message) {
        if (message.type === "doc-update") {
            const idx = this.snapshot.findIndex((m) => m.type === "doc-update" && m.doc_id === message.doc_id);
            if (idx >= 0)
                this.snapshot[idx] = message;
            else
                this.snapshot.push(message);
        }
        else if (message.type === "doc-closed") {
            this.snapshot = this.snapshot.filter((m) => !(m.type === "doc-update" && m.doc_id === message.doc_id));
        }
        if (!this.wss)
            return;
        const text = JSON.stringify(message);
        for (const client of this.wss.clients) {
            if (client.readyState === client.OPEN)
                client.send(text);
        }
    }
    stop() {
        this.wss?.close();
        this.wss = undefined;
    }
}
//# sourceMappingURL=bridge.js.map