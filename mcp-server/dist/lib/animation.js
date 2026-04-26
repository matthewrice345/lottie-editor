import { set, get } from "lodash-es";
const LayerTypes = {
    Shape: 4,
};
const ShapeTypes = {
    Fill: "fl",
    Stroke: "st",
    Group: "gr",
};
const defaultColor = { r: 0, g: 0, b: 0, a: 1 };
export const getAnimationLayers = (animation) => {
    const layers = animation.layers;
    return layers.map((layer, i) => {
        const path = `layers.${i}`;
        const layerInfo = {
            path: path,
            name: layer.nm || "Unnamed Layer",
            hidden: layer.hd === true,
            shapes: [],
        };
        switch (layer.ty) {
            case LayerTypes.Shape:
                layerInfo.shapes = getShapesFromLayer(layer.shapes, `${path}.shapes`);
                break;
            default:
                break;
        }
        return layerInfo;
    });
};
export const getShape = (shape, path) => {
    const shapeInfo = {
        path: path,
        name: shape.nm || "Unnamed Shape",
        hidden: shape.hd === true,
        colorRgb: defaultColor,
        children: [],
    };
    switch (shape.ty) {
        case ShapeTypes.Fill:
            shapeInfo.colorRgb = getColorsFromFillShape(shape);
            break;
        case ShapeTypes.Stroke:
            shapeInfo.colorRgb = getColorsFromStrokeShape(shape);
            break;
        case ShapeTypes.Group:
            shapeInfo.children = getShapesFromLayer(shape.it || [], `${path}.it`);
            break;
    }
    return shapeInfo;
};
const getShapesFromLayer = (shapes, path) => {
    return shapes.map((shape, i) => getShape(shape, `${path}.${i}`));
};
const getColorsFromFillShape = (shape) => {
    return toRgbColor(shape.c.k);
};
const getColorsFromStrokeShape = (shape) => {
    if (shape.c.a === 1)
        return defaultColor; // TODO: handle multiple colors
    return toRgbColor(shape.c.k);
};
const toRgbColor = (color) => {
    const [r, g, b, a] = color;
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: a === undefined ? 1 : a,
    };
};
const fromRgbColor = (color) => {
    const { r, g, b, a } = color;
    return [r / 255, g / 255, b / 255, a];
};
export const getSelectedShape = (animation, path) => {
    const shape = get(animation, path);
    if (!shape)
        return null;
    return getShape(shape, path);
};
const cloneAnimation = (animation) => JSON.parse(JSON.stringify(animation));
export const updateShapeColor = (animation, shapePath, color) => {
    const next = cloneAnimation(animation);
    return set(next, `${shapePath}.c.k`, fromRgbColor(color));
};
export const getFramerate = (animation) => {
    return animation.fr;
};
export const getDimensions = (animation) => {
    return { width: animation.w, height: animation.h };
};
export const updateDimensions = (animation, width, height) => {
    return { ...animation, w: width, h: height };
};
export const updateFramerate = (animation, framerate) => {
    return { ...animation, fr: framerate };
};
export const deleteLayer = (animation, layerIndex) => {
    const newLayers = [...animation.layers];
    newLayers.splice(layerIndex, 1);
    return { ...animation, layers: newLayers };
};
const nextLayerInd = (animation) => {
    let max = 0;
    for (const l of animation.layers) {
        const ind = l.ind;
        if (typeof ind === "number" && ind > max)
            max = ind;
    }
    return max + 1;
};
const makeStatic = (value, ix) => ix === undefined ? { a: 0, k: value } : { a: 0, k: value, ix };
const makeIdentityLayerTransform = (centerX, centerY) => ({
    o: makeStatic(100, 11),
    r: makeStatic(0, 10),
    p: { ...makeStatic([centerX, centerY, 0], 2), l: 2 },
    a: { ...makeStatic([0, 0, 0], 1), l: 2 },
    s: { ...makeStatic([100, 100, 100], 6), l: 2 },
});
export const addShapeLayer = (animation, name) => {
    const ind = nextLayerInd(animation);
    const op = animation.op ?? 60;
    const layer = {
        ddd: 0,
        ind,
        ty: 4,
        nm: name && name.trim() ? name : `Layer ${ind}`,
        sr: 1,
        ks: makeIdentityLayerTransform(animation.w / 2, animation.h / 2),
        ao: 0,
        shapes: [],
        ip: animation.ip ?? 0,
        op,
        st: 0,
        bm: 0,
    };
    return { ...animation, layers: [...animation.layers, layer] };
};
const makePrimitiveShape = (kind, width, height) => {
    if (kind === "rect") {
        return {
            ty: "rc",
            d: 1,
            s: makeStatic([width, height], 2),
            p: makeStatic([0, 0], 3),
            r: makeStatic(0, 4),
            nm: "Rectangle Path 1",
            hd: false,
        };
    }
    return {
        ty: "el",
        d: 1,
        s: makeStatic([width, height], 2),
        p: makeStatic([0, 0], 3),
        nm: "Ellipse Path 1",
        hd: false,
    };
};
const makeFillShape = (color) => ({
    ty: "fl",
    c: makeStatic(fromRgbColor(color), 4),
    o: makeStatic(100, 5),
    r: 1,
    bm: 0,
    nm: "Fill 1",
    hd: false,
});
const makeGroupTransform = (position) => ({
    ty: "tr",
    p: makeStatic(position, 2),
    a: makeStatic([0, 0], 1),
    s: makeStatic([100, 100], 3),
    r: makeStatic(0, 6),
    o: makeStatic(100, 7),
    sk: makeStatic(0, 4),
    sa: makeStatic(0, 5),
    nm: "Transform",
});
export const addShape = (animation, layerIndex, options) => {
    const layer = animation.layers[layerIndex];
    if (!layer || layer.ty !== 4) {
        throw new Error(`Layer at index ${layerIndex} is not a shape layer (ty=4); cannot add a shape to it.`);
    }
    const width = options.width ?? 200;
    const height = options.height ?? 200;
    const position = options.position ?? [0, 0];
    const labelDefault = options.kind === "rect" ? "Rectangle" : "Ellipse";
    const group = {
        ty: "gr",
        it: [
            makePrimitiveShape(options.kind, width, height),
            makeFillShape(options.color),
            makeGroupTransform(position),
        ],
        nm: options.name && options.name.trim() ? options.name : labelDefault,
        np: 2,
        cix: 2,
        bm: 0,
        ix: (layer.shapes.length ?? 0) + 1,
        hd: false,
    };
    const next = cloneAnimation(animation);
    const targetLayer = next.layers[layerIndex];
    targetLayer.shapes = [...targetLayer.shapes, group];
    return next;
};
export const renameLayer = (animation, layerIndex, name) => {
    if (!animation.layers[layerIndex]) {
        throw new Error(`No layer at index ${layerIndex}`);
    }
    const next = cloneAnimation(animation);
    next.layers[layerIndex].nm = name;
    return next;
};
export const renameShape = (animation, shapePath, name) => {
    if (!get(animation, shapePath)) {
        throw new Error(`No shape at path ${shapePath}`);
    }
    const next = cloneAnimation(animation);
    set(next, `${shapePath}.nm`, name);
    return next;
};
export const moveLayer = (animation, fromIndex, toIndex) => {
    const layers = [...animation.layers];
    if (fromIndex < 0 || fromIndex >= layers.length) {
        throw new Error(`fromIndex ${fromIndex} out of range (0-${layers.length - 1})`);
    }
    const clamped = Math.max(0, Math.min(toIndex, layers.length - 1));
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(clamped, 0, moved);
    return { ...animation, layers };
};
export const moveShape = (animation, shapePath, toIndex) => {
    const dotIdx = shapePath.lastIndexOf(".");
    if (dotIdx < 0)
        throw new Error(`Bad shape path: ${shapePath}`);
    const containerPath = shapePath.slice(0, dotIdx);
    const fromIndex = Number(shapePath.slice(dotIdx + 1));
    const container = get(animation, containerPath);
    if (!Array.isArray(container)) {
        throw new Error(`Container at ${containerPath} is not an array`);
    }
    if (fromIndex < 0 || fromIndex >= container.length) {
        throw new Error(`fromIndex ${fromIndex} out of range`);
    }
    const next = cloneAnimation(animation);
    const arr = get(next, containerPath);
    const clamped = Math.max(0, Math.min(toIndex, arr.length - 1));
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(clamped, 0, moved);
    return next;
};
const pad3 = (v, pad) => v.length === 3 ? v : [v[0], v[1], pad];
export const setLayerTransform = (animation, layerIndex, t) => {
    if (!animation.layers[layerIndex]) {
        throw new Error(`No layer at index ${layerIndex}`);
    }
    const next = cloneAnimation(animation);
    const layer = next.layers[layerIndex];
    if (!layer.ks)
        layer.ks = {};
    if (t.position !== undefined) {
        if (!layer.ks.p)
            layer.ks.p = { k: [0, 0, 0] };
        layer.ks.p.k = pad3(t.position, 0);
    }
    if (t.scale !== undefined) {
        if (!layer.ks.s)
            layer.ks.s = { k: [100, 100, 100] };
        const s = typeof t.scale === "number" ? [t.scale, t.scale] : t.scale;
        layer.ks.s.k = pad3(s, 100);
    }
    if (t.rotation !== undefined) {
        if (!layer.ks.r)
            layer.ks.r = { k: 0 };
        layer.ks.r.k = t.rotation;
    }
    if (t.opacity !== undefined) {
        if (!layer.ks.o)
            layer.ks.o = { k: 100 };
        layer.ks.o.k = t.opacity;
    }
    return next;
};
const makeStrokeShape = (color, width) => ({
    ty: "st",
    c: makeStatic(fromRgbColor(color), 3),
    o: makeStatic(100, 4),
    w: makeStatic(width, 5),
    lc: 1,
    lj: 1,
    ml: 4,
    bm: 0,
    nm: "Stroke 1",
    hd: false,
});
export const addStroke = (animation, groupPath, color, width = 4) => {
    const group = get(animation, groupPath);
    if (!group || group.ty !== "gr" || !Array.isArray(group.it)) {
        throw new Error(`No group shape at ${groupPath}`);
    }
    const next = cloneAnimation(animation);
    const targetGroup = get(next, groupPath);
    const transformIdx = targetGroup.it.findIndex((s) => s.ty === "tr");
    const insertAt = transformIdx >= 0 ? transformIdx : targetGroup.it.length;
    targetGroup.it.splice(insertAt, 0, makeStrokeShape(color, width));
    return next;
};
export const updateStrokeWidth = (animation, shapePath, width) => {
    const shape = get(animation, shapePath);
    if (!shape || shape.ty !== "st") {
        throw new Error(`No stroke shape at ${shapePath}`);
    }
    const next = cloneAnimation(animation);
    set(next, `${shapePath}.w.k`, width);
    return next;
};
export const updateFillOpacity = (animation, shapePath, opacity) => {
    const shape = get(animation, shapePath);
    if (!shape || (shape.ty !== "fl" && shape.ty !== "st")) {
        throw new Error(`No fill or stroke at ${shapePath}`);
    }
    const next = cloneAnimation(animation);
    set(next, `${shapePath}.o.k`, opacity);
    return next;
};
export const setAnimationDuration = (animation, inFrame, outFrame) => {
    return {
        ...animation,
        ip: inFrame ?? animation.ip,
        op: outFrame ?? animation.op,
    };
};
export const createBlankLottie = (options = {}) => {
    const w = options.width ?? 1080;
    const h = options.height ?? 1080;
    const fr = options.fps ?? 30;
    const op = options.duration_frames ?? Math.round((options.duration_seconds ?? 3) * fr);
    return {
        v: "5.7.0",
        fr,
        ip: 0,
        op,
        w,
        h,
        nm: options.name && options.name.trim() ? options.name : "Untitled",
        ddd: 0,
        assets: [],
        layers: [],
        fonts: { list: [] },
    };
};
export const importSvgLayers = (animation, options) => {
    const next = cloneAnimation(animation);
    const startInd = nextLayerInd(next);
    const layer_indices = [];
    const op = next.op ?? 60;
    const ip = next.ip ?? 0;
    options.shapes_per_layer.forEach((shapes, i) => {
        const layer = {
            ddd: 0,
            ind: startInd + i,
            ty: 4,
            nm: options.layer_names[i] && options.layer_names[i].trim()
                ? options.layer_names[i]
                : `SVG Layer ${startInd + i}`,
            sr: 1,
            // SVG-imported content uses SVG's top-left-origin coordinate system,
            // so the layer's origin must be at canvas (0, 0) — NOT canvas center
            // (which is the default for blank shape layers we add manually).
            // Otherwise every shape gets shifted by half the canvas size and
            // ends up off-canvas.
            ks: makeIdentityLayerTransform(0, 0),
            ao: 0,
            shapes,
            ip,
            op,
            st: 0,
            bm: 0,
        };
        next.layers = [...next.layers, layer];
        layer_indices.push(next.layers.length - 1);
    });
    return { animation: next, layer_indices };
};
const randomAssetId = () => `img_${Math.random().toString(36).slice(2, 10)}`;
export const importImageLayer = (animation, options) => {
    const next = cloneAnimation(animation);
    const nextWithAssets = next;
    if (!Array.isArray(nextWithAssets.assets))
        nextWithAssets.assets = [];
    const assetId = randomAssetId();
    nextWithAssets.assets.push({
        id: assetId,
        w: options.width,
        h: options.height,
        u: "",
        p: `data:${options.mime_type};base64,${options.base64}`,
        e: 1,
    });
    const ind = nextLayerInd(next);
    const op = next.op ?? 60;
    const layer = {
        ddd: 0,
        ind,
        ty: 2, // image layer
        nm: options.name && options.name.trim()
            ? options.name
            : `Image ${ind}`,
        refId: assetId,
        sr: 1,
        ks: makeIdentityLayerTransform(animation.w / 2, animation.h / 2),
        ao: 0,
        ip: next.ip ?? 0,
        op,
        st: 0,
        bm: 0,
    };
    next.layers = [...next.layers, layer];
    return { animation: next, layer_index: next.layers.length - 1, asset_id: assetId };
};
export const setGroupTransform = (animation, groupPath, t) => {
    const group = get(animation, groupPath);
    if (!group || group.ty !== "gr" || !Array.isArray(group.it)) {
        throw new Error(`No group shape at ${groupPath}`);
    }
    const next = cloneAnimation(animation);
    const targetGroup = get(next, groupPath);
    const tr = targetGroup.it.find((s) => s.ty === "tr");
    if (!tr)
        throw new Error(`Group at ${groupPath} has no transform child`);
    if (t.position !== undefined) {
        if (!tr.p)
            tr.p = { k: [0, 0] };
        tr.p.k = [t.position[0], t.position[1]];
    }
    if (t.scale !== undefined) {
        if (!tr.s)
            tr.s = { k: [100, 100] };
        const s = typeof t.scale === "number" ? [t.scale, t.scale] : t.scale;
        tr.s.k = [s[0], s[1]];
    }
    if (t.rotation !== undefined) {
        if (!tr.r)
            tr.r = { k: 0 };
        tr.r.k = t.rotation;
    }
    if (t.opacity !== undefined) {
        if (!tr.o)
            tr.o = { k: 100 };
        tr.o.k = t.opacity;
    }
    return next;
};
const EASING_PRESETS = {
    linear: { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } },
    "ease-in": { o: { x: 0.42, y: 0 }, i: { x: 1, y: 1 } },
    "ease-out": { o: { x: 0, y: 0 }, i: { x: 0.58, y: 1 } },
    "ease-in-out": { o: { x: 0.42, y: 0 }, i: { x: 0.58, y: 1 } },
};
const makeEasingHandles = (easing, dimensions) => {
    const e = EASING_PRESETS[easing];
    return {
        o: {
            x: Array(dimensions).fill(e.o.x),
            y: Array(dimensions).fill(e.o.y),
        },
        i: {
            x: Array(dimensions).fill(e.i.x),
            y: Array(dimensions).fill(e.i.y),
        },
    };
};
const normalizeKeyframeValue = (v) => Array.isArray(v) ? v : [v];
const detectDimensions = (v) => {
    if (Array.isArray(v))
        return v.length;
    if (typeof v === "number")
        return 1;
    return 1;
};
const buildKeyframes = (inputs, defaultEasing = "linear") => {
    const sorted = [...inputs].sort((a, b) => a.t - b.t);
    const dims = detectDimensions(sorted[0].v);
    return sorted.map((kf, i) => {
        const k = {
            t: kf.t,
            s: normalizeKeyframeValue(kf.v),
        };
        if (i < sorted.length - 1) {
            const handles = makeEasingHandles(kf.easing ?? defaultEasing, dims);
            k.i = handles.i;
            k.o = handles.o;
        }
        return k;
    });
};
export const animateProperty = (animation, propertyPath, keyframes, defaultEasing = "linear") => {
    if (keyframes.length < 2) {
        throw new Error("Need at least 2 keyframes to animate a property");
    }
    const prop = get(animation, propertyPath);
    if (!prop || typeof prop !== "object") {
        throw new Error(`No property at ${propertyPath}`);
    }
    const next = cloneAnimation(animation);
    const kfs = buildKeyframes(keyframes, defaultEasing);
    set(next, `${propertyPath}.a`, 1);
    set(next, `${propertyPath}.k`, kfs);
    return next;
};
export const setKeyframe = (animation, propertyPath, time, value, easing = "linear") => {
    const prop = get(animation, propertyPath);
    if (!prop || typeof prop !== "object") {
        throw new Error(`No property at ${propertyPath}`);
    }
    const next = cloneAnimation(animation);
    if (prop.a !== 1) {
        // Convert static → animated. Use the existing static value as a baseline keyframe at frame 0.
        const staticValue = prop.k;
        if (time === 0) {
            // Setting at frame 0 with no other keyframes — keep static, just update value.
            set(next, `${propertyPath}.k`, normalizeKeyframeValue(value));
            return next;
        }
        const baseline = {
            t: 0,
            v: typeof staticValue === "number" || Array.isArray(staticValue)
                ? staticValue
                : 0,
            easing,
        };
        const kfs = buildKeyframes([baseline, { t: time, v: value, easing }]);
        set(next, `${propertyPath}.a`, 1);
        set(next, `${propertyPath}.k`, kfs);
        return next;
    }
    // Already animated. Add or replace the keyframe at this time.
    const existing = prop.k ?? [];
    const filtered = existing.filter((kf) => kf.t !== time);
    const allInputs = filtered.map((kf) => ({
        t: kf.t,
        v: kf.s ?? 0,
        easing,
    }));
    allInputs.push({ t: time, v: value, easing });
    const kfs = buildKeyframes(allInputs, easing);
    set(next, `${propertyPath}.k`, kfs);
    return next;
};
export const removeKeyframe = (animation, propertyPath, index) => {
    const prop = get(animation, propertyPath);
    if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) {
        throw new Error(`Property at ${propertyPath} is not animated`);
    }
    if (index < 0 || index >= prop.k.length) {
        throw new Error(`Keyframe index ${index} out of range (0-${prop.k.length - 1})`);
    }
    const next = cloneAnimation(animation);
    const kfs = [...get(next, propertyPath).k];
    kfs.splice(index, 1);
    if (kfs.length === 0) {
        // No keyframes left: revert to static with the removed value (or 0)
        set(next, `${propertyPath}.a`, 0);
        set(next, `${propertyPath}.k`, 0);
    }
    else if (kfs.length === 1) {
        // Only one keyframe: collapse to static
        const sole = kfs[0];
        const v = sole.s;
        set(next, `${propertyPath}.a`, 0);
        set(next, `${propertyPath}.k`, Array.isArray(v) && v.length === 1 ? v[0] : v);
    }
    else {
        // Strip i/o from new last keyframe
        const last = kfs[kfs.length - 1];
        delete last.i;
        delete last.o;
        set(next, `${propertyPath}.k`, kfs);
    }
    return next;
};
export const shiftKeyframes = (animation, propertyPath, frameOffset) => {
    const prop = get(animation, propertyPath);
    if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) {
        throw new Error(`Property at ${propertyPath} is not animated`);
    }
    const next = cloneAnimation(animation);
    const kfs = get(next, propertyPath).k;
    for (const kf of kfs)
        kf.t += frameOffset;
    return next;
};
export const scaleKeyframeTimes = (animation, propertyPath, multiplier, anchor = "first") => {
    if (multiplier <= 0)
        throw new Error("multiplier must be positive");
    const prop = get(animation, propertyPath);
    if (!prop || prop.a !== 1 || !Array.isArray(prop.k)) {
        throw new Error(`Property at ${propertyPath} is not animated`);
    }
    const next = cloneAnimation(animation);
    const kfs = get(next, propertyPath).k;
    const anchorTime = anchor === "first" ? kfs[0].t : anchor;
    for (const kf of kfs) {
        kf.t = anchorTime + (kf.t - anchorTime) * multiplier;
    }
    return next;
};
const ensureFontInList = (animation, fontFamily) => {
    if (!animation.fonts)
        animation.fonts = { list: [] };
    if (!Array.isArray(animation.fonts.list))
        animation.fonts.list = [];
    const list = animation.fonts.list;
    if (!list.find((f) => f.fName === fontFamily)) {
        list.push({
            fName: fontFamily,
            fFamily: fontFamily,
            fStyle: "Regular",
            ascent: 75,
        });
    }
};
export const addTextLayer = (animation, options) => {
    const next = cloneAnimation(animation);
    const ind = nextLayerInd(next);
    const fontFamily = options.font_family ?? "Arial";
    const fontSize = options.font_size ?? 48;
    const color = options.color ?? { r: 0, g: 0, b: 0, a: 1 };
    const position = options.position ?? [next.w / 2, next.h / 2];
    const justification = options.justification === "left"
        ? 0
        : options.justification === "right"
            ? 1
            : 2;
    ensureFontInList(next, fontFamily);
    const layer = {
        ddd: 0,
        ind,
        ty: 5, // text layer
        nm: options.name && options.name.trim() ? options.name : `Text ${ind}`,
        sr: 1,
        ks: {
            o: makeStatic(100, 11),
            r: makeStatic(0, 10),
            p: { ...makeStatic([position[0], position[1], 0], 2), l: 2 },
            a: { ...makeStatic([0, 0, 0], 1), l: 2 },
            s: { ...makeStatic([100, 100, 100], 6), l: 2 },
        },
        ao: 0,
        t: {
            d: {
                k: [
                    {
                        s: {
                            s: fontSize,
                            f: fontFamily,
                            t: options.text,
                            j: justification,
                            tr: options.tracking ?? 0,
                            lh: options.line_height ?? fontSize * 1.2,
                            ls: 0,
                            fc: [color.r / 255, color.g / 255, color.b / 255],
                        },
                        t: 0,
                    },
                ],
            },
            p: {},
            m: { g: 1, a: makeStatic([0, 0], 2) },
            a: [],
        },
        ip: next.ip ?? 0,
        op: next.op ?? 60,
        st: 0,
        bm: 0,
    };
    next.layers = [...next.layers, layer];
    return { animation: next, layer_index: next.layers.length - 1 };
};
// ============================================================
// Tier 1: Layer parenting
// ============================================================
export const setLayerParent = (animation, childLayerIndex, parentLayerIndex) => {
    if (!animation.layers[childLayerIndex]) {
        throw new Error(`No layer at index ${childLayerIndex}`);
    }
    const next = cloneAnimation(animation);
    const child = next.layers[childLayerIndex];
    if (parentLayerIndex === null) {
        delete child.parent;
        return next;
    }
    const parent = next.layers[parentLayerIndex];
    if (!parent)
        throw new Error(`No layer at index ${parentLayerIndex}`);
    if (parentLayerIndex === childLayerIndex) {
        throw new Error("A layer cannot be its own parent");
    }
    if (typeof parent.ind !== "number") {
        throw new Error(`Parent layer has no ind`);
    }
    child.parent = parent.ind;
    return next;
};
// ============================================================
// Tier 2: Duplicate layer
// ============================================================
export const duplicateLayer = (animation, layerIndex, newName) => {
    const layer = animation.layers[layerIndex];
    if (!layer)
        throw new Error(`No layer at index ${layerIndex}`);
    const next = cloneAnimation(animation);
    const clone = JSON.parse(JSON.stringify(next.layers[layerIndex]));
    const newInd = nextLayerInd(next);
    clone.ind = newInd;
    if (newName && newName.trim()) {
        clone.nm = newName;
    }
    else if (clone.nm) {
        clone.nm = `${clone.nm} copy`;
    }
    next.layers = [...next.layers, clone];
    return { animation: next, layer_index: next.layers.length - 1 };
};
// ============================================================
// Tier 2: Polygon / Star (sr polystar)
// ============================================================
const makePolystar = (starType, // 1 = star, 2 = polygon
points, outerRadius, innerRadius, position, rotation, innerRoundness, outerRoundness) => {
    const base = {
        ty: "sr",
        sy: starType,
        pt: makeStatic(points, 3),
        p: makeStatic(position, 4),
        r: makeStatic(rotation, 5),
        or: makeStatic(outerRadius, 7),
        os: makeStatic(outerRoundness, 9),
        nm: starType === 1 ? "Star Path 1" : "Polygon Path 1",
        hd: false,
        d: 1,
    };
    if (starType === 1) {
        base.ir = makeStatic(innerRadius, 6);
        base.is = makeStatic(innerRoundness, 8);
    }
    return base;
};
const wrapPolystarInGroup = (shape, color, name, layer, position) => ({
    ty: "gr",
    it: [shape, makeFillShape(color), makeGroupTransform(position)],
    nm: name,
    np: 2,
    cix: 2,
    bm: 0,
    ix: layer.shapes.length + 1,
    hd: false,
});
export const addPolygonShape = (animation, layerIndex, options) => {
    const layer = animation.layers[layerIndex];
    if (!layer || layer.ty !== 4 || !Array.isArray(layer.shapes)) {
        throw new Error(`Layer at ${layerIndex} is not a shape layer`);
    }
    const polygon = makePolystar(2, options.points, options.outer_radius, 0, [0, 0], options.rotation ?? 0, 0, options.outer_roundness ?? 0);
    const next = cloneAnimation(animation);
    const targetLayer = next.layers[layerIndex];
    const group = wrapPolystarInGroup(polygon, options.color, options.name ?? "Polygon", targetLayer, options.position ?? [0, 0]);
    targetLayer.shapes = [...targetLayer.shapes, group];
    return next;
};
export const addStarShape = (animation, layerIndex, options) => {
    const layer = animation.layers[layerIndex];
    if (!layer || layer.ty !== 4 || !Array.isArray(layer.shapes)) {
        throw new Error(`Layer at ${layerIndex} is not a shape layer`);
    }
    const star = makePolystar(1, options.points, options.outer_radius, options.inner_radius ?? options.outer_radius / 2, [0, 0], options.rotation ?? 0, options.inner_roundness ?? 0, options.outer_roundness ?? 0);
    const next = cloneAnimation(animation);
    const targetLayer = next.layers[layerIndex];
    const group = wrapPolystarInGroup(star, options.color, options.name ?? "Star", targetLayer, options.position ?? [0, 0]);
    targetLayer.shapes = [...targetLayer.shapes, group];
    return next;
};
export const addPath = (animation, layerIndex, options) => {
    const layer = animation.layers[layerIndex];
    if (!layer || layer.ty !== 4 || !Array.isArray(layer.shapes)) {
        throw new Error(`Layer at ${layerIndex} is not a shape layer`);
    }
    const v = options.vertices;
    if (!v || v.length < 2)
        throw new Error("addPath needs at least 2 vertices");
    const i = options.in_tangents ?? v.map(() => [0, 0]);
    const o = options.out_tangents ?? v.map(() => [0, 0]);
    if (i.length !== v.length || o.length !== v.length) {
        throw new Error("in_tangents and out_tangents must have same length as vertices");
    }
    const pathShape = {
        ty: "sh",
        d: 1,
        ks: makeStatic({ i, o, v, c: options.closed ?? true }, 2),
        nm: options.name ?? "Path",
        hd: false,
    };
    const items = [pathShape];
    if (options.fill_color)
        items.push(makeFillShape(options.fill_color));
    if (options.stroke_color) {
        items.push(makeStrokeShape(options.stroke_color, options.stroke_width ?? 4));
    }
    items.push(makeGroupTransform(options.position ?? [0, 0]));
    const next = cloneAnimation(animation);
    const targetLayer = next.layers[layerIndex];
    const group = {
        ty: "gr",
        it: items,
        nm: options.name ?? "Custom Path",
        np: items.length - 1,
        cix: 2,
        bm: 0,
        ix: targetLayer.shapes.length + 1,
        hd: false,
    };
    targetLayer.shapes = [...targetLayer.shapes, group];
    return next;
};
// ============================================================
// Tier 2: Set corner radius (animatable rect rounding)
// ============================================================
export const setCornerRadius = (animation, shapePath, radius) => {
    const shape = get(animation, shapePath);
    if (!shape)
        throw new Error(`No shape at ${shapePath}`);
    const next = cloneAnimation(animation);
    // If pointed at a group, find the rect inside it
    const targetShape = get(next, shapePath);
    if (targetShape.ty === "rc") {
        if (!targetShape.r)
            targetShape.r = { k: 0 };
        targetShape.r.k = radius;
        return next;
    }
    if (targetShape.ty === "gr" && Array.isArray(targetShape.it)) {
        const rect = targetShape.it.find((s) => s.ty === "rc");
        if (!rect)
            throw new Error(`No rectangle inside group at ${shapePath}`);
        if (!rect.r)
            rect.r = { k: 0 };
        rect.r.k = radius;
        return next;
    }
    throw new Error(`Shape at ${shapePath} is not a rectangle (or a group containing one)`);
};
const BLEND_MODE_CODES = {
    normal: 0,
    multiply: 1,
    screen: 2,
    overlay: 3,
    darken: 4,
    lighten: 5,
    "color-dodge": 6,
    "color-burn": 7,
    "hard-light": 8,
    "soft-light": 9,
    difference: 10,
    exclusion: 11,
    hue: 12,
    saturation: 13,
    color: 14,
    luminosity: 15,
};
export const setLayerBlendMode = (animation, layerIndex, mode) => {
    if (!animation.layers[layerIndex]) {
        throw new Error(`No layer at index ${layerIndex}`);
    }
    const next = cloneAnimation(animation);
    next.layers[layerIndex].bm = BLEND_MODE_CODES[mode];
    return next;
};
const MASK_MODE_CODES = {
    add: "a",
    subtract: "s",
    intersect: "i",
    lighten: "l",
    darken: "d",
    difference: "f",
};
export const addMask = (animation, layerIndex, options) => {
    const layer = animation.layers[layerIndex];
    if (!layer)
        throw new Error(`No layer at index ${layerIndex}`);
    const v = options.vertices;
    if (!v || v.length < 3)
        throw new Error("Mask needs at least 3 vertices to form a closed region");
    const i = options.in_tangents ?? v.map(() => [0, 0]);
    const o = options.out_tangents ?? v.map(() => [0, 0]);
    const next = cloneAnimation(animation);
    const target = next.layers[layerIndex];
    if (!Array.isArray(target.masksProperties))
        target.masksProperties = [];
    target.hasMask = true;
    target.masksProperties.push({
        inv: options.inverted ?? false,
        mode: MASK_MODE_CODES[options.mode ?? "add"],
        pt: makeStatic({ i, o, v, c: options.closed ?? true }, 1),
        o: makeStatic(options.opacity ?? 100, 3),
        x: makeStatic(options.expansion ?? 0, 4),
        nm: options.name ?? "Mask",
    });
    return next;
};
export const setStrokeDash = (animation, shapePath, options) => {
    const shape = get(animation, shapePath);
    if (!shape || shape.ty !== "st") {
        throw new Error(`No stroke shape at ${shapePath}`);
    }
    const next = cloneAnimation(animation);
    const stroke = get(next, shapePath);
    stroke.d = [
        { n: "d", nm: "dash", v: makeStatic(options.dash, 1) },
        { n: "g", nm: "gap", v: makeStatic(options.gap ?? options.dash, 2) },
        { n: "o", nm: "offset", v: makeStatic(options.offset ?? 0, 7) },
    ];
    return next;
};
// ============================================================
// Tier 3: Effects (drop shadow, gaussian blur)
// ============================================================
const ensureEffectsArray = (layer) => {
    if (!Array.isArray(layer.ef))
        layer.ef = [];
    return layer.ef;
};
export const addDropShadow = (animation, layerIndex, options = {}) => {
    if (!animation.layers[layerIndex]) {
        throw new Error(`No layer at index ${layerIndex}`);
    }
    const next = cloneAnimation(animation);
    const layer = next.layers[layerIndex];
    const ef = ensureEffectsArray(layer);
    const color = options.color ?? { r: 0, g: 0, b: 0, a: 1 };
    ef.push({
        ty: 25,
        nm: "Drop Shadow",
        np: 8,
        mn: "ADBE Drop Shadow",
        ix: ef.length + 1,
        en: 1,
        ef: [
            { ty: 2, nm: "Shadow Color", mn: "ADBE Drop Shadow-0001", ix: 1, v: makeStatic(fromRgbColor(color), 0) },
            { ty: 0, nm: "Opacity", mn: "ADBE Drop Shadow-0002", ix: 2, v: makeStatic(((options.opacity ?? 100) / 100) * 255, 0) },
            { ty: 0, nm: "Direction", mn: "ADBE Drop Shadow-0003", ix: 3, v: makeStatic(options.direction ?? 135, 0) },
            { ty: 0, nm: "Distance", mn: "ADBE Drop Shadow-0004", ix: 4, v: makeStatic(options.distance ?? 10, 0) },
            { ty: 0, nm: "Softness", mn: "ADBE Drop Shadow-0005", ix: 5, v: makeStatic(options.softness ?? 5, 0) },
            { ty: 7, nm: "Shadow Only", mn: "ADBE Drop Shadow-0006", ix: 6, v: makeStatic(0, 0) },
        ],
    });
    return next;
};
export const addBlur = (animation, layerIndex, options) => {
    if (!animation.layers[layerIndex]) {
        throw new Error(`No layer at index ${layerIndex}`);
    }
    const next = cloneAnimation(animation);
    const layer = next.layers[layerIndex];
    const ef = ensureEffectsArray(layer);
    ef.push({
        ty: 29,
        nm: "Gaussian Blur",
        np: 5,
        mn: "ADBE Gaussian Blur 2",
        ix: ef.length + 1,
        en: 1,
        ef: [
            { ty: 0, nm: "Blurriness", mn: "ADBE Gaussian Blur 2-0001", ix: 1, v: makeStatic(options.amount, 0) },
            { ty: 7, nm: "Blur Dimensions", mn: "ADBE Gaussian Blur 2-0002", ix: 2, v: makeStatic(options.dimensions ?? 1, 0) },
            { ty: 7, nm: "Repeat Edge Pixels", mn: "ADBE Gaussian Blur 2-0003", ix: 3, v: makeStatic(options.repeat_edge_pixels ? 1 : 0, 0) },
        ],
    });
    return next;
};
// ============================================================
// Visibility (hide/show) — toggles lottie's native `hd` flag
// ============================================================
export const setLayerVisibility = (animation, layerIndex, hidden) => {
    if (!animation.layers[layerIndex]) {
        throw new Error(`No layer at index ${layerIndex}`);
    }
    const next = cloneAnimation(animation);
    next.layers[layerIndex].hd = hidden;
    return next;
};
export const setShapeVisibility = (animation, shapePath, hidden) => {
    if (!get(animation, shapePath)) {
        throw new Error(`No shape at ${shapePath}`);
    }
    const next = cloneAnimation(animation);
    set(next, `${shapePath}.hd`, hidden);
    return next;
};
const SHAPE_LAYER_TY = 4;
// Resolve an animatable lottie property value at a given frame. Handles both
// static `{a:0, k: value}` and animated `{a:1, k: [keyframes]}` shapes.
// For animated, picks the keyframe at or before `atFrame` (or the first one
// if atFrame is before any keyframe).
const evalProperty = (prop, atFrame, fallback) => {
    if (!prop || typeof prop !== "object")
        return fallback;
    const p = prop;
    if (Array.isArray(p.k)) {
        if (p.a === 1 || (p.k.length > 0 && typeof p.k[0] === "object")) {
            // Keyframe array
            const kfs = p.k;
            let active = kfs[0];
            for (const kf of kfs) {
                if ((kf.t ?? 0) <= atFrame)
                    active = kf;
                else
                    break;
            }
            const v = active?.s;
            if (Array.isArray(v))
                return v;
            if (typeof v === "number")
                return [v];
            return fallback;
        }
        return p.k;
    }
    if (typeof p.k === "number")
        return [p.k];
    return fallback;
};
const computeBoundsForShapeNode = (shape, parentOffset, atFrame) => {
    if (!shape || typeof shape !== "object")
        return null;
    const s = shape;
    if (s.ty === "rc" || s.ty === "el") {
        const size = evalProperty(s.s, atFrame, [0, 0]);
        if (size.length < 2 || size[0] <= 0 || size[1] <= 0)
            return null;
        const pos = evalProperty(s.p, atFrame, [0, 0]);
        const [w, h] = size;
        const [px, py] = [pos[0] ?? 0, pos[1] ?? 0];
        return {
            x: parentOffset[0] + px - w / 2,
            y: parentOffset[1] + py - h / 2,
            width: w,
            height: h,
        };
    }
    if (s.ty === "gr" && Array.isArray(s.it)) {
        const tr = s.it.find((it) => it.ty === "tr");
        const trP = evalProperty(tr?.p, atFrame, [0, 0]);
        const childOffset = [
            parentOffset[0] + (trP[0] ?? 0),
            parentOffset[1] + (trP[1] ?? 0),
        ];
        let acc = null;
        for (const child of s.it) {
            const cb = computeBoundsForShapeNode(child, childOffset, atFrame);
            if (!cb)
                continue;
            if (!acc)
                acc = cb;
            else {
                const x1 = Math.min(acc.x, cb.x);
                const y1 = Math.min(acc.y, cb.y);
                const x2 = Math.max(acc.x + acc.width, cb.x + cb.width);
                const y2 = Math.max(acc.y + acc.height, cb.y + cb.height);
                acc = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
            }
        }
        return acc;
    }
    return null;
};
const layerLocalToCanvas = (box, layer, atFrame) => {
    const pk = evalProperty(layer.ks?.p, atFrame, [0, 0]);
    const ak = evalProperty(layer.ks?.a, atFrame, [0, 0]);
    const sk = evalProperty(layer.ks?.s, atFrame, [100, 100]);
    const sx = (sk[0] ?? 100) / 100;
    const sy = (sk[1] ?? 100) / 100;
    // If the layer is scaled to ~0 (not visible at this frame), skip — we'd
    // produce zero-sized bounds that never match a click.
    if (Math.abs(sx) < 0.01 || Math.abs(sy) < 0.01) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
        x: (pk[0] ?? 0) + (box.x - (ak[0] ?? 0)) * sx,
        y: (pk[1] ?? 0) + (box.y - (ak[1] ?? 0)) * sy,
        width: box.width * sx,
        height: box.height * sy,
    };
};
const collectGroupHitCandidates = (shapes, prefix, layerIndex, layer, parentOffset, atFrame, out) => {
    shapes.forEach((shape, i) => {
        const path = `${prefix}.${i}`;
        const s = shape;
        if (s.hd === true)
            return;
        if (s.ty === "gr" && Array.isArray(s.it)) {
            const local = computeBoundsForShapeNode(s, parentOffset, atFrame);
            if (local && local.width > 0 && local.height > 0) {
                const canvas = layerLocalToCanvas(local, layer, atFrame);
                if (canvas.width > 0 && canvas.height > 0) {
                    out.push({
                        shape_path: path,
                        layer_index: layerIndex,
                        bounds: canvas,
                    });
                }
            }
            // Don't recurse into nested groups — selecting the outer group is the right UX.
        }
    });
};
const IMAGE_LAYER_TY = 2;
const PRECOMP_LAYER_TY = 0;
const SOLID_LAYER_TY = 1;
const findAssetDims = (animation, refId) => {
    const assets = animation.assets;
    if (!Array.isArray(assets))
        return null;
    const a = assets.find((x) => x.id === refId);
    if (!a || !a.w || !a.h)
        return null;
    return { w: a.w, h: a.h };
};
export const hitTestShape = (animation, canvasX, canvasY, atFrame = 0) => {
    const candidates = [];
    animation.layers.forEach((layer, layerIndex) => {
        const ty = layer.ty;
        if (layer.hd === true)
            return;
        const ip = layer.ip ?? 0;
        const op = layer.op ?? Infinity;
        if (atFrame < ip || atFrame > op)
            return;
        if (ty === SHAPE_LAYER_TY) {
            const shapes = layer.shapes;
            if (!Array.isArray(shapes))
                return;
            collectGroupHitCandidates(shapes, `layers.${layerIndex}.shapes`, layerIndex, layer, [0, 0], atFrame, candidates);
        }
        else if (ty === IMAGE_LAYER_TY) {
            const refId = layer.refId;
            if (!refId)
                return;
            const dims = findAssetDims(animation, refId);
            if (!dims)
                return;
            // Image is drawn from (0,0) to (w,h) in layer-local coords (top-left origin)
            const local = { x: 0, y: 0, width: dims.w, height: dims.h };
            const canvas = layerLocalToCanvas(local, layer, atFrame);
            if (canvas.width > 0 && canvas.height > 0) {
                candidates.push({
                    shape_path: `layers.${layerIndex}`,
                    layer_index: layerIndex,
                    bounds: canvas,
                });
            }
        }
        else if (ty === SOLID_LAYER_TY) {
            const sw = layer.sw;
            const sh = layer.sh;
            if (!sw || !sh)
                return;
            const local = { x: 0, y: 0, width: sw, height: sh };
            const canvas = layerLocalToCanvas(local, layer, atFrame);
            if (canvas.width > 0 && canvas.height > 0) {
                candidates.push({
                    shape_path: `layers.${layerIndex}`,
                    layer_index: layerIndex,
                    bounds: canvas,
                });
            }
        }
        else if (ty === PRECOMP_LAYER_TY) {
            const w = layer.w;
            const h = layer.h;
            if (!w || !h)
                return;
            const local = { x: 0, y: 0, width: w, height: h };
            const canvas = layerLocalToCanvas(local, layer, atFrame);
            if (canvas.width > 0 && canvas.height > 0) {
                candidates.push({
                    shape_path: `layers.${layerIndex}`,
                    layer_index: layerIndex,
                    bounds: canvas,
                });
            }
        }
    });
    // Lottie renders top-to-bottom in array order (index 0 is on TOP visually).
    for (const c of candidates) {
        const { x, y, width, height } = c.bounds;
        if (canvasX >= x &&
            canvasX <= x + width &&
            canvasY >= y &&
            canvasY <= y + height) {
            return { shape_path: c.shape_path, layer_index: c.layer_index };
        }
    }
    return null;
};
//# sourceMappingURL=animation.js.map