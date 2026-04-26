import { readFile } from "node:fs/promises";
import { convertSvgString, } from "../../lib/svg-converter.js";
export const readSvgFile = async (path) => {
    if (!path.startsWith("/")) {
        throw new Error(`SVG path must be absolute. Got: ${path}`);
    }
    const text = await readFile(path, "utf8");
    return convertSvgString(text);
};
//# sourceMappingURL=import-svg.js.map