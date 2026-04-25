const SHAPE_LAYER_TY = 4;
const rgbaFrom = (color) => {
    const [r, g, b, a] = color;
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: a === undefined ? 1 : a,
    };
};
const walkShapes = (shapes, shape_path_prefix, layer_path, out) => {
    shapes.forEach((shape, j) => {
        const path = `${shape_path_prefix}.${j}`;
        if (shape.ty === "fl") {
            const fill = shape;
            if (fill.c.a === 1)
                return;
            out.push({
                layer_path,
                shape_path: path,
                name: shape.nm || "Unnamed",
                type: "fill",
                color: rgbaFrom(fill.c.k),
            });
        }
        else if (shape.ty === "st") {
            const stroke = shape;
            if (stroke.c.a === 1)
                return;
            out.push({
                layer_path,
                shape_path: path,
                name: shape.nm || "Unnamed",
                type: "stroke",
                color: rgbaFrom(stroke.c.k),
            });
        }
        else if (shape.ty === "gr") {
            const group = shape;
            walkShapes(group.it || [], `${path}.it`, layer_path, out);
        }
    });
};
export const walkColoredShapes = (animation) => {
    const out = [];
    animation.layers.forEach((layer, i) => {
        if (layer.ty !== SHAPE_LAYER_TY)
            return;
        const shapes = layer.shapes;
        const layer_path = `layers.${i}`;
        walkShapes(shapes, `${layer_path}.shapes`, layer_path, out);
    });
    return out;
};
export const colorDistance = (a, b) => {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
};
export const colorPalette = (animation) => {
    const seen = new Map();
    for (const c of walkColoredShapes(animation)) {
        const key = `${c.color.r}-${c.color.g}-${c.color.b}-${c.color.a}`;
        if (!seen.has(key))
            seen.set(key, c.color);
    }
    return Array.from(seen.values());
};
export const animationDurationSeconds = (animation) => {
    if (!animation.fr || animation.fr <= 0)
        return 0;
    const frames = (animation.op ?? 0) - (animation.ip ?? 0);
    return frames / animation.fr;
};
const LAYER_TYPE_NAMES = {
    0: "precomp",
    1: "solid",
    2: "image",
    3: "null",
    4: "shape",
    5: "text",
    6: "audio",
    13: "camera",
};
const PROPERTY_LABELS = {
    p: "position",
    a: "anchor",
    s: "scale",
    r: "rotation",
    o: "opacity",
    c: "color",
    w: "width",
    sk: "skew",
    sa: "skew_axis",
};
const walkForAnimated = (obj, path, out, animation) => {
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => walkForAnimated(item, `${path}.${i}`, out, animation));
        return;
    }
    if (obj === null || typeof obj !== "object")
        return;
    const o = obj;
    if (typeof o.a === "number" && o.a === 1 && Array.isArray(o.k)) {
        const keyframes = o.k;
        if (keyframes.length > 0) {
            const ts = keyframes.map((kf) => kf.t ?? 0);
            out.push({
                property_path: path,
                label: labelForPropertyPath(path, animation),
                keyframe_count: keyframes.length,
                in_frame: ts[0],
                out_frame: ts[ts.length - 1],
            });
        }
        return;
    }
    for (const [k, v] of Object.entries(o)) {
        walkForAnimated(v, path ? `${path}.${k}` : k, out, animation);
    }
};
const labelForPropertyPath = (path, animation) => {
    const parts = path.split(".");
    const last = parts[parts.length - 1];
    const propName = PROPERTY_LABELS[last] ?? last;
    if (parts[0] === "layers" && parts.length >= 2) {
        const layerIdx = Number(parts[1]);
        const layer = animation.layers[layerIdx];
        const layerName = layer?.nm || `Layer ${layerIdx}`;
        if (parts.length === 4 && parts[2] === "ks") {
            return `${layerName} → ${propName}`;
        }
        if (parts.length > 4) {
            return `${layerName} → … → ${propName}`;
        }
        return `${layerName} → ${propName}`;
    }
    return path;
};
export const walkAnimatedProperties = (animation) => {
    const out = [];
    walkForAnimated(animation, "", out, animation);
    return out;
};
export const describeLayer = (animation, index) => {
    const layer = animation.layers[index];
    if (!layer)
        throw new Error(`No layer at index ${index}`);
    const animatedHere = [];
    walkForAnimated(layer, `layers.${index}`, animatedHere, animation);
    let parentIndex = null;
    if (typeof layer.parent === "number") {
        const idx = animation.layers.findIndex((l) => l.ind === layer.parent);
        parentIndex = idx >= 0 ? idx : null;
    }
    return {
        index,
        ind: typeof layer.ind === "number" ? layer.ind : null,
        name: layer.nm || `Layer ${index}`,
        type: LAYER_TYPE_NAMES[layer.ty ?? -1] ?? `unknown(${layer.ty})`,
        type_code: layer.ty ?? -1,
        in_frame: layer.ip ?? 0,
        out_frame: layer.op ?? 0,
        time_stretch: layer.sr ?? 1,
        blend_mode: layer.bm ?? 0,
        parent_ind: typeof layer.parent === "number" ? layer.parent : null,
        parent_index: parentIndex,
        shape_count: Array.isArray(layer.shapes) ? layer.shapes.length : null,
        animated_property_count: animatedHere.length,
    };
};
const unionBox = (a, b) => {
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.width, b.x + b.width);
    const y2 = Math.max(a.y + a.height, b.y + b.height);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
};
const computeShapeNodeBounds = (shape, parentOffset, notes) => {
    if (!shape || typeof shape !== "object")
        return null;
    const s = shape;
    if (s.ty === "rc" || s.ty === "el") {
        const sizeK = s.s?.k;
        const posK = s.p?.k;
        if (!Array.isArray(sizeK) || sizeK.length < 2)
            return null;
        const [w, h] = sizeK;
        const [px, py] = Array.isArray(posK) ? posK : [0, 0];
        return {
            x: parentOffset[0] + px - w / 2,
            y: parentOffset[1] + py - h / 2,
            width: w,
            height: h,
        };
    }
    if (s.ty === "gr" && Array.isArray(s.it)) {
        const tr = s.it.find((it) => it.ty === "tr");
        const trK = tr?.p?.k;
        const [tx, ty] = Array.isArray(trK) ? trK : [0, 0];
        const childOffset = [
            parentOffset[0] + tx,
            parentOffset[1] + ty,
        ];
        let acc = null;
        for (const child of s.it) {
            const childBox = computeShapeNodeBounds(child, childOffset, notes);
            if (childBox)
                acc = acc ? unionBox(acc, childBox) : childBox;
        }
        return acc;
    }
    if (s.ty === "sh" || s.ty === "sr") {
        notes.push(`shape type "${s.ty}" not bounded; skipping`);
        return null;
    }
    return null;
};
const layerLocalToCanvas = (box, layer) => {
    const pk = layer.ks?.p?.k ?? [0, 0];
    const ak = layer.ks?.a?.k ?? [0, 0];
    const sk = layer.ks?.s?.k ?? [100, 100];
    const sx = (sk[0] ?? 100) / 100;
    const sy = (sk[1] ?? 100) / 100;
    const px = pk[0] ?? 0;
    const py = pk[1] ?? 0;
    const ax = ak[0] ?? 0;
    const ay = ak[1] ?? 0;
    return {
        x: px + (box.x - ax) * sx,
        y: py + (box.y - ay) * sy,
        width: box.width * sx,
        height: box.height * sy,
    };
};
export const computeLayerBounds = (animation, layerIndex) => {
    const layer = animation.layers[layerIndex];
    if (!layer) {
        return { layer_local: null, canvas: null, best_effort: true, notes: ["no layer"] };
    }
    const notes = [];
    let local = null;
    if (layer.ty === SHAPE_LAYER_TY && Array.isArray(layer.shapes)) {
        for (const shape of layer.shapes) {
            const box = computeShapeNodeBounds(shape, [0, 0], notes);
            if (box)
                local = local ? unionBox(local, box) : box;
        }
    }
    else if (layer.ty === 1 && layer.sw && layer.sh) {
        local = { x: 0, y: 0, width: layer.sw, height: layer.sh };
    }
    else {
        notes.push(`layer type ${layer.ty} not supported for bounds`);
    }
    if (!local) {
        return { layer_local: null, canvas: null, best_effort: true, notes };
    }
    const canvas = layerLocalToCanvas(local, layer);
    return { layer_local: local, canvas, best_effort: notes.length > 0, notes };
};
export const computeShapeBounds = (animation, shapePath) => {
    const parts = shapePath.split(".");
    if (parts[0] !== "layers" || parts.length < 4) {
        return {
            layer_local: null,
            canvas: null,
            best_effort: true,
            notes: ["invalid shape path"],
        };
    }
    const layerIndex = Number(parts[1]);
    const notes = [];
    let cursor = animation;
    for (const p of parts) {
        cursor = cursor?.[p];
    }
    const local = computeShapeNodeBounds(cursor, [0, 0], notes);
    if (!local) {
        return { layer_local: null, canvas: null, best_effort: true, notes };
    }
    const layer = animation.layers[layerIndex];
    const canvas = layerLocalToCanvas(local, layer);
    return { layer_local: local, canvas, best_effort: notes.length > 0, notes };
};
const horizontalSlot = (canvasW, key) => {
    switch (key) {
        case "left":
            return 0;
        case "right":
            return canvasW;
        case "center":
            return canvasW / 2;
        case "third-left":
            return canvasW / 6; // center of left third
        case "third-right":
            return (5 * canvasW) / 6;
    }
};
const verticalSlot = (canvasH, key) => {
    switch (key) {
        case "top":
            return 0;
        case "bottom":
            return canvasH;
        case "middle":
            return canvasH / 2;
        case "third-top":
            return canvasH / 6;
        case "third-bottom":
            return (5 * canvasH) / 6;
    }
};
export const computeAlignDelta = (animation, currentCanvasBox, horizontal, vertical, margin = 0) => {
    const W = animation.w;
    const H = animation.h;
    const target = {
        x: currentCanvasBox.x,
        y: currentCanvasBox.y,
        width: currentCanvasBox.width,
        height: currentCanvasBox.height,
    };
    if (horizontal !== undefined) {
        const slot = horizontalSlot(W, horizontal);
        if (horizontal === "left") {
            target.x = margin;
        }
        else if (horizontal === "right") {
            target.x = W - target.width - margin;
        }
        else if (horizontal === "center") {
            target.x = (W - target.width) / 2;
        }
        else if (horizontal === "third-left" || horizontal === "third-right") {
            target.x = slot - target.width / 2;
        }
    }
    if (vertical !== undefined) {
        const slot = verticalSlot(H, vertical);
        if (vertical === "top") {
            target.y = margin;
        }
        else if (vertical === "bottom") {
            target.y = H - target.height - margin;
        }
        else if (vertical === "middle") {
            target.y = (H - target.height) / 2;
        }
        else if (vertical === "third-top" || vertical === "third-bottom") {
            target.y = slot - target.height / 2;
        }
    }
    return {
        delta_x: target.x - currentCanvasBox.x,
        delta_y: target.y - currentCanvasBox.y,
        current_canvas_bounds: currentCanvasBox,
        target_canvas_bounds: target,
    };
};
//# sourceMappingURL=lottie-utils.js.map