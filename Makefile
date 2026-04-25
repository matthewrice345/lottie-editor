.PHONY: help install start stop dev build start-prod lint format clean \
        mcp-dev mcp-build mcp-inspect

help:                ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install:             ## Install all workspace dependencies
	npm install

start: mcp-build      ## Start web editor + MCP bridge (Ctrl-C stops both)
	@echo "▶ web editor:  http://localhost:3000"
	@echo "▶ MCP bridge:  ws://localhost:8765"
	@echo "  Ctrl-C to stop both."
	@trap 'echo; echo "▶ stopping..."; kill 0 2>/dev/null; wait 2>/dev/null; exit 0' INT TERM; \
	  npm run dev & \
	  node mcp-server/dist/mcp-server/src/index.js & \
	  wait

stop:                ## Force-kill anything bound to ports 3000 and 8765
	@lsof -ti :3000 2>/dev/null | xargs -r kill 2>/dev/null || true
	@lsof -ti :8765 2>/dev/null | xargs -r kill 2>/dev/null || true
	@echo "stopped"

dev:                 ## Run only the Next.js dev server
	npm run dev

build:               ## Build web app + MCP server
	npm run build
	npm -w mcp-server run build

start-prod:          ## Start the production Next.js server
	npm start

lint:                ## Lint the web app
	npm run lint

format:              ## Prettier-format the repo
	npm run format

clean:               ## Remove build artifacts (keeps node_modules)
	rm -rf .next mcp-server/dist

mcp-dev:             ## Run only the MCP server via tsx
	npm -w mcp-server run dev

mcp-build:           ## Build only the MCP server
	npm -w mcp-server run build

mcp-inspect:         ## Open MCP Inspector against the built server
	npx @modelcontextprotocol/inspector node mcp-server/dist/mcp-server/src/index.js

.DEFAULT_GOAL := help
