import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DocumentStore } from "./store.js";
import * as documents from "./tools/documents.js";
import * as read from "./tools/read.js";
import * as write from "./tools/write.js";
import * as create from "./tools/create.js";
import * as edit from "./tools/edit.js";
import * as inspect from "./tools/inspect.js";
import * as geometry from "./tools/geometry.js";
import * as animate from "./tools/animate.js";
import * as compose from "./tools/compose.js";
import * as history from "./tools/history.js";
export const createServer = (bridge) => {
    const server = new McpServer({
        name: "lottie-editor",
        version: "0.1.0",
    });
    const store = new DocumentStore(bridge);
    documents.register(server, store);
    read.register(server, store);
    write.register(server, store);
    create.register(server, store);
    edit.register(server, store);
    inspect.register(server, store);
    geometry.register(server, store);
    animate.register(server, store);
    compose.register(server, store);
    history.register(server, store);
    bridge?.setHandler((msg, fromClientId) => {
        if (msg.type === "client-state") {
            const name = msg.name && msg.name.trim() ? msg.name : "Untitled";
            if (msg.doc_id && store.has(msg.doc_id)) {
                if (msg.name)
                    store.rename(msg.doc_id, msg.name);
                store.applyClientMutation(msg.doc_id, msg.animation, fromClientId);
            }
            else {
                store.create(msg.animation, name, undefined, fromClientId);
            }
        }
        else if (msg.type === "client-clear") {
            store.close(msg.doc_id, fromClientId);
        }
    });
    return { server, bridge };
};
//# sourceMappingURL=server.js.map