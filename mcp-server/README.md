# `@lottie-editor/mcp-server`

A stdio MCP (Model Context Protocol) server that exposes the lottie-editor's manipulation primitives so a Claude conversation can load, inspect, and edit lottie files via tool calls.

## Build

From the repo root:

```bash
npm install
npm -w mcp-server run build
```

Or via the top-level `Makefile`: `make build`.

## Smoke-test with the MCP Inspector

```bash
npx @modelcontextprotocol/inspector node mcp-server/dist/mcp-server/src/index.js
```

(or `make mcp-inspect`)

This opens a UI listing every tool with its input schema. A good first call:

- `load_lottie` with `source = /Users/mrice/Development/lottie-editor/public/example-animation.json`
- Then `get_animation_summary` with the returned `doc_id`

## Wire into Claude Desktop / Claude Code

### Production (built JS)

```json
{
  "mcpServers": {
    "lottie-editor": {
      "command": "node",
      "args": [
        "/Users/mrice/Development/lottie-editor/mcp-server/dist/mcp-server/src/index.js"
      ]
    }
  }
}
```

### Dev (no rebuild between edits)

```json
{
  "mcpServers": {
    "lottie-editor": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/mrice/Development/lottie-editor/mcp-server/src/index.ts"
      ]
    }
  }
}
```

Goes in `~/Library/Application Support/Claude/claude_desktop_config.json` (Claude Desktop) or your Claude Code MCP config. Restart the client after editing.

## Tools (37)

Every tool's `doc_id` is **optional** — when omitted, it defaults to the most-recently-touched open document. With one document open (the typical case when chatting alongside the editor), you never need to pass `doc_id`.

Documents: `load_lottie`, `save_lottie`, `list_documents`, `close_document`, `get_animation_summary`.

Reads: `get_animation_layers`, `get_shape`, `get_framerate`, `get_dimensions`, `find_shapes_by_color`, `find_layer_by_name`.

Writes: `update_shape_color`, `update_framerate`, `update_dimensions`, `delete_layer`, `bulk_update_color`, `update_stroke_width`, `update_fill_opacity`, `set_animation_duration`.

Edit: `rename_layer`, `rename_shape`, `move_layer`, `move_shape`, `set_layer_transform`.

Create: `add_shape_layer`, `add_rectangle`, `add_ellipse`, `add_stroke`.

Inspect (animation/timing): `describe_animation`, `list_animated_properties`, `get_keyframes`, `get_layer_timing`.

Geometry (positioning): `set_group_transform`, `get_layer_bounds`, `get_shape_bounds`, `align`.

History: `undo`, `redo` (per document; up to 50 entries; in-memory only).

Shape paths are lodash-style strings (e.g. `layers.0.shapes.1`), returned by `get_animation_layers` / `find_*` and accepted by `get_shape` / `update_shape_color`.

Documents are held in memory by `doc_id` for the lifetime of the server process. State does not persist across restarts.
