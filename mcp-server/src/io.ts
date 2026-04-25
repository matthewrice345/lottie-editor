import { Animation } from "@lottie-animation-community/lottie-types";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

export interface LoadResult {
  animation: Animation;
  name: string;
  sourcePath?: string;
}

export const loadFromSource = async (source: string): Promise<LoadResult> => {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${source}: HTTP ${res.status}`);
    }
    const animation = (await res.json()) as Animation;
    return { animation, name: source };
  }

  if (!source.startsWith("/")) {
    throw new Error(
      `Path must be absolute or an http(s):// URL. Got: ${source}`,
    );
  }

  const text = await readFile(source, "utf8");
  const animation = JSON.parse(text) as Animation;
  return { animation, name: basename(source), sourcePath: source };
};

export const writeToPath = async (
  path: string,
  animation: Animation,
): Promise<number> => {
  if (!path.startsWith("/")) {
    throw new Error(`save path must be absolute. Got: ${path}`);
  }
  const text = JSON.stringify(animation, null, 2);
  await writeFile(path, text, "utf8");
  return Buffer.byteLength(text, "utf8");
};
