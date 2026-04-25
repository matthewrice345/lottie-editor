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
//# sourceMappingURL=animation.js.map