import { readFile } from "node:fs/promises";
import {
  convertSvgString,
  type SvgConversion,
} from "../../lib/svg-converter.js";

export type { SvgConversion } from "../../lib/svg-converter.js";

export const readSvgFile = async (path: string): Promise<SvgConversion> => {
  if (!path.startsWith("/")) {
    throw new Error(`SVG path must be absolute. Got: ${path}`);
  }
  const text = await readFile(path, "utf8");
  return convertSvgString(text);
};
