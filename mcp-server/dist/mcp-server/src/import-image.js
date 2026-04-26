import { readFile } from "node:fs/promises";
import { extname } from "node:path";
const parsePngDimensions = (buf) => {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A (8 bytes)
    // Then 4-byte length, 4-byte type "IHDR", then 13-byte IHDR data:
    //   width (uint32 BE), height (uint32 BE), depth, color, ...
    if (buf.length < 24 ||
        buf[0] !== 0x89 ||
        buf[1] !== 0x50 ||
        buf[2] !== 0x4e ||
        buf[3] !== 0x47) {
        throw new Error("Not a valid PNG file");
    }
    return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
    };
};
const parseJpegDimensions = (buf) => {
    // JPEG: starts with FF D8. Scan markers; SOF0 (FFC0), SOF1 (FFC1), SOF2 (FFC2),
    // SOF3 (FFC3), SOF5..7 (FFC5..C7), SOF9..11 (FFC9..CB), SOF13..15 (FFCD..CF)
    // contain dimensions: 0xFFCx, 2-byte length, 1-byte precision, 2-byte height, 2-byte width.
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
        throw new Error("Not a valid JPEG file");
    }
    let i = 2;
    while (i < buf.length) {
        if (buf[i] !== 0xff)
            throw new Error("Bad JPEG marker");
        const marker = buf[i + 1];
        // SOF markers (excluding DHT=C4 and DAC=CC and JPG=C8)
        if ((marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)) {
            // SOF found
            return {
                height: buf.readUInt16BE(i + 5),
                width: buf.readUInt16BE(i + 7),
            };
        }
        // Skip this segment: marker (2) + length (2 BE includes itself) + payload
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
    }
    throw new Error("JPEG dimensions not found");
};
export const readImageFile = async (path) => {
    if (!path.startsWith("/")) {
        throw new Error(`Image path must be absolute. Got: ${path}`);
    }
    const ext = extname(path).toLowerCase();
    let mime;
    if (ext === ".png")
        mime = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg")
        mime = "image/jpeg";
    else
        throw new Error(`Unsupported image extension: ${ext}. Supported: .png, .jpg, .jpeg`);
    const buf = await readFile(path);
    const dims = mime === "image/png"
        ? parsePngDimensions(buf)
        : parseJpegDimensions(buf);
    return {
        width: dims.width,
        height: dims.height,
        base64: buf.toString("base64"),
        mime_type: mime,
        byte_size: buf.length,
    };
};
//# sourceMappingURL=import-image.js.map