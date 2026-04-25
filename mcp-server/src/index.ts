#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { Bridge } from "./bridge.js";

const main = async () => {
  const bridgeDisabled = process.env.LOTTIE_MCP_BRIDGE === "off";
  const bridgePort = process.env.LOTTIE_MCP_BRIDGE_PORT
    ? parseInt(process.env.LOTTIE_MCP_BRIDGE_PORT, 10)
    : undefined;

  let bridge: Bridge | undefined;
  if (!bridgeDisabled) {
    bridge = new Bridge(bridgePort);
    await bridge.start();
  }

  const { server } = createServer(bridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[lottie-editor-mcp] ready on stdio");
};

process.on("uncaughtException", (err) => {
  console.error("[lottie-editor-mcp] uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("[lottie-editor-mcp] unhandledRejection:", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("[lottie-editor-mcp] fatal:", err);
  process.exit(1);
});
