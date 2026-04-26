import { parse } from "svgson";
import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";
const NAMED_COLORS = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    red: [255, 0, 0],
    green: [0, 128, 0],
    lime: [0, 255, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    cyan: [0, 255, 255],
    aqua: [0, 255, 255],
    magenta: [255, 0, 255],
    fuchsia: [255, 0, 255],
    silver: [192, 192, 192],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    maroon: [128, 0, 0],
    olive: [128, 128, 0],
    purple: [128, 0, 128],
    teal: [0, 128, 128],
    navy: [0, 0, 128],
    orange: [255, 165, 0],
    pink: [255, 192, 203],
    brown: [165, 42, 42],
    transparent: [0, 0, 0],
};
export const parseColor = (str) => {
    if (!str)
        return null;
    const t = str.trim().toLowerCase();
    if (t === "" || t === "none" || t === "transparent")
        return null;
    const named = NAMED_COLORS[t];
    if (named)
        return { r: named[0], g: named[1], b: named[2], a: 1 };
    const hex = t.match(/^#([0-9a-f]+)$/);
    if (hex) {
        const h = hex[1];
        if (h.length === 3) {
            return {
                r: parseInt(h[0] + h[0], 16),
                g: parseInt(h[1] + h[1], 16),
                b: parseInt(h[2] + h[2], 16),
                a: 1,
            };
        }
        if (h.length === 6) {
            return {
                r: parseInt(h.slice(0, 2), 16),
                g: parseInt(h.slice(2, 4), 16),
                b: parseInt(h.slice(4, 6), 16),
                a: 1,
            };
        }
        if (h.length === 8) {
            return {
                r: parseInt(h.slice(0, 2), 16),
                g: parseInt(h.slice(2, 4), 16),
                b: parseInt(h.slice(4, 6), 16),
                a: parseInt(h.slice(6, 8), 16) / 255,
            };
        }
    }
    const rgba = t.match(/^rgba?\(([^)]+)\)$/);
    if (rgba) {
        const parts = rgba[1].split(/[,\s]+/).filter(Boolean).map(Number);
        if (parts.length >= 3) {
            return {
                r: parts[0],
                g: parts[1],
                b: parts[2],
                a: parts.length === 4 ? parts[3] : 1,
            };
        }
    }
    return null;
};
const identityTransform = () => ({
    tx: 0,
    ty: 0,
    sx: 1,
    sy: 1,
    rot: 0,
    best_effort: false,
});
const parseTransform = (str) => {
    const out = identityTransform();
    if (!str)
        return out;
    const re = /(translate|scale|rotate|matrix)\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(str)) !== null) {
        const op = m[1];
        const args = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
        if (op === "translate") {
            out.tx += args[0] ?? 0;
            out.ty += args[1] ?? 0;
        }
        else if (op === "scale") {
            out.sx *= args[0] ?? 1;
            out.sy *= args[1] ?? args[0] ?? 1;
        }
        else if (op === "rotate") {
            out.rot += args[0] ?? 0;
        }
        else if (op === "matrix") {
            // Decompose: matrix(a,b,c,d,e,f). Best effort: tx=e, ty=f, sx=sqrt(a²+b²), sy=sqrt(c²+d²)
            const [a, b, c, d, e, f] = args;
            out.tx += e ?? 0;
            out.ty += f ?? 0;
            out.sx *= Math.sqrt((a ?? 1) ** 2 + (b ?? 0) ** 2);
            out.sy *= Math.sqrt((c ?? 0) ** 2 + (d ?? 1) ** 2);
            out.rot += (Math.atan2(b ?? 0, a ?? 1) * 180) / Math.PI;
            out.best_effort = true;
        }
    }
    return out;
};
const makeStatic = (value, ix) => ix === undefined ? { a: 0, k: value } : { a: 0, k: value, ix };
const colorToK = (c) => [
    c.r / 255,
    c.g / 255,
    c.b / 255,
    c.a,
];
const makeFill = (color, opacity = 100) => ({
    ty: "fl",
    c: makeStatic(colorToK(color), 4),
    o: makeStatic(opacity, 5),
    r: 1,
    bm: 0,
    nm: "Fill",
    hd: false,
});
const LINECAP_CODES = {
    butt: 1,
    round: 2,
    square: 3,
};
const LINEJOIN_CODES = {
    miter: 1,
    round: 2,
    bevel: 3,
};
const parseDasharray = (raw) => {
    if (!raw)
        return null;
    const parts = raw
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);
    if (parts.length === 0)
        return null;
    // SVG semantics: alternating dash/gap. If an odd count, repeat once to even.
    const seq = parts.length % 2 === 0 ? parts : [...parts, ...parts];
    return seq.map((length, i) => ({
        kind: i % 2 === 0 ? "d" : "g",
        length,
    }));
};
const makeStroke = (opts) => {
    const lc = LINECAP_CODES[opts.linecap ?? "butt"] ?? 1;
    const lj = LINEJOIN_CODES[opts.linejoin ?? "miter"] ?? 1;
    const stroke = {
        ty: "st",
        c: makeStatic(colorToK(opts.color), 3),
        o: makeStatic(opts.opacity ?? 100, 4),
        w: makeStatic(opts.width, 5),
        lc,
        lj,
        ml: 4,
        bm: 0,
        nm: "Stroke",
        hd: false,
    };
    const dash = parseDasharray(opts.dasharray ?? null);
    if (dash) {
        stroke.d = dash.map((seg, i) => ({
            n: seg.kind,
            nm: seg.kind === "d" ? "dash" : "gap",
            v: makeStatic(seg.length, i + 1),
        }));
    }
    return stroke;
};
const makeGroupTransform = (t) => ({
    ty: "tr",
    p: makeStatic([t.tx, t.ty], 2),
    a: makeStatic([0, 0], 1),
    s: makeStatic([t.sx * 100, t.sy * 100], 3),
    r: makeStatic(t.rot, 6),
    o: makeStatic(100, 7),
    sk: makeStatic(0, 4),
    sa: makeStatic(0, 5),
    nm: "Transform",
});
const convertPathDataToSubpaths = (d) => {
    let pd = new SVGPathData(d);
    pd = pd.toAbs();
    pd = pd.transform(SVGPathDataTransformer.NORMALIZE_HVZ());
    pd = pd.transform(SVGPathDataTransformer.NORMALIZE_ST());
    pd = pd.transform(SVGPathDataTransformer.QT_TO_C());
    pd = pd.transform(SVGPathDataTransformer.A_TO_C());
    const subpaths = [];
    let firstX = 0;
    let firstY = 0;
    const ensureCur = () => {
        let last = subpaths[subpaths.length - 1];
        if (!last || last.v.length === 0 || last.c) {
            last = { i: [], o: [], v: [], c: false };
            subpaths.push(last);
        }
        return last;
    };
    for (const cmd of pd.commands) {
        const c = cmd;
        if (c.type === SVGPathData.MOVE_TO) {
            // Start a new subpath
            const sp = { i: [], o: [], v: [], c: false };
            subpaths.push(sp);
            sp.v.push([c.x, c.y]);
            sp.i.push([0, 0]);
            sp.o.push([0, 0]);
            firstX = c.x;
            firstY = c.y;
        }
        else if (c.type === SVGPathData.LINE_TO) {
            const sp = ensureCur();
            sp.v.push([c.x, c.y]);
            sp.i.push([0, 0]);
            sp.o.push([0, 0]);
        }
        else if (c.type === SVGPathData.CURVE_TO) {
            const sp = ensureCur();
            const prevIdx = sp.v.length - 1;
            const prev = sp.v[prevIdx];
            sp.o[prevIdx] = [c.x1 - prev[0], c.y1 - prev[1]];
            sp.v.push([c.x, c.y]);
            sp.i.push([c.x2 - c.x, c.y2 - c.y]);
            sp.o.push([0, 0]);
        }
        else if (c.type === SVGPathData.CLOSE_PATH) {
            const sp = subpaths[subpaths.length - 1];
            if (sp && sp.v.length > 0) {
                sp.c = true;
                const last = sp.v[sp.v.length - 1];
                if (sp.v.length > 1 &&
                    Math.abs(last[0] - firstX) < 1e-6 &&
                    Math.abs(last[1] - firstY) < 1e-6) {
                    sp.i[0] = sp.i[sp.v.length - 1];
                    sp.v.pop();
                    sp.i.pop();
                    sp.o.pop();
                }
            }
        }
    }
    return subpaths.filter((s) => s.v.length > 0);
};
const makePathShape = (subpath, name = "Path") => ({
    ty: "sh",
    d: 1,
    ks: makeStatic({
        i: subpath.i,
        o: subpath.o,
        v: subpath.v,
        c: subpath.c,
    }, 2),
    nm: name,
    hd: false,
});
const makeRect = (width, height, position, cornerRadius, name = "Rectangle Path") => ({
    ty: "rc",
    d: 1,
    s: makeStatic([width, height], 2),
    p: makeStatic(position, 3),
    r: makeStatic(cornerRadius, 4),
    nm: name,
    hd: false,
});
const makeEllipse = (width, height, position, name = "Ellipse Path") => ({
    ty: "el",
    d: 1,
    s: makeStatic([width, height], 2),
    p: makeStatic(position, 3),
    nm: name,
    hd: false,
});
const inheritStyle = (parent, attrs) => {
    const next = { ...parent };
    const apply = (k, v) => {
        if (k === "fill") {
            next.fill = v;
            next.fillExplicit = true;
        }
        else if (k === "stroke") {
            next.stroke = v;
            next.strokeExplicit = true;
        }
        else if (k === "stroke-width") {
            next.strokeWidth = parseFloat(v) || 0;
        }
        else if (k === "fill-opacity") {
            next.fillOpacity = parseFloat(v);
        }
        else if (k === "stroke-opacity") {
            next.strokeOpacity = parseFloat(v);
        }
        else if (k === "opacity") {
            next.opacity = parseFloat(v);
        }
        else if (k === "stroke-linecap") {
            next.strokeLinecap = v;
        }
        else if (k === "stroke-linejoin") {
            next.strokeLinejoin = v;
        }
        else if (k === "stroke-dasharray") {
            next.strokeDasharray = v === "none" ? null : v;
        }
    };
    for (const k of [
        "fill",
        "stroke",
        "stroke-width",
        "fill-opacity",
        "stroke-opacity",
        "opacity",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-dasharray",
    ]) {
        if (attrs[k] !== undefined)
            apply(k, attrs[k]);
    }
    // CSS style="" attribute (very simple parser; just splits on ;)
    const style = attrs.style;
    if (style) {
        for (const decl of style.split(";")) {
            const [k, v] = decl.split(":").map((s) => s?.trim());
            if (!k || v === undefined)
                continue;
            apply(k, v);
        }
    }
    return next;
};
const wrapInGroup = (shapes, fillStyle, transform, name) => {
    const items = [...shapes];
    // Stroke-only intent: if stroke is explicitly set on this element/chain
    // but fill was never explicitly set, suppress the inherited fill default.
    // This matches what designers usually mean by `<path stroke="white"/>`.
    const suppressFill = fillStyle.strokeExplicit && !fillStyle.fillExplicit;
    const fillColor = suppressFill
        ? null
        : parseColor(fillStyle.fill ?? undefined);
    if (fillColor)
        items.push(makeFill(fillColor, fillStyle.fillOpacity * 100));
    const strokeColor = parseColor(fillStyle.stroke ?? undefined);
    if (strokeColor && fillStyle.strokeWidth > 0) {
        items.push(makeStroke({
            color: strokeColor,
            width: fillStyle.strokeWidth,
            opacity: fillStyle.strokeOpacity * 100,
            linecap: fillStyle.strokeLinecap ?? "butt",
            linejoin: fillStyle.strokeLinejoin ?? "miter",
            dasharray: fillStyle.strokeDasharray,
        }));
    }
    items.push(makeGroupTransform(transform));
    return {
        ty: "gr",
        it: items,
        nm: name,
        np: items.length - 1,
        cix: 2,
        bm: 0,
        ix: 1,
        hd: false,
    };
};
const convertElement = (node, parentStyle, notes) => {
    const attrs = node.attributes ?? {};
    const style = inheritStyle(parentStyle, attrs);
    const transform = parseTransform(attrs.transform);
    const name = attrs.id || attrs["data-name"] || node.name;
    switch (node.name) {
        case "g": {
            const children = node.children.flatMap((c) => convertElement(c, style, notes));
            if (children.length === 0)
                return [];
            disambiguateNames(children);
            // Reverse: SVG paints first-child first (bottom), Lottie renders
            // it[0] on top. Reverse so the SVG z-order is preserved.
            return [
                {
                    ty: "gr",
                    it: [...children.reverse(), makeGroupTransform(transform)],
                    nm: name,
                    np: children.length,
                    cix: 2,
                    bm: 0,
                    ix: 1,
                    hd: false,
                },
            ];
        }
        case "rect": {
            const x = parseFloat(attrs.x ?? "0");
            const y = parseFloat(attrs.y ?? "0");
            const w = parseFloat(attrs.width ?? "0");
            const h = parseFloat(attrs.height ?? "0");
            const rx = parseFloat(attrs.rx ?? attrs.ry ?? "0");
            if (w <= 0 || h <= 0)
                return [];
            const rect = makeRect(w, h, [x + w / 2, y + h / 2], rx);
            return [wrapInGroup([rect], style, transform, name)];
        }
        case "circle": {
            const cx = parseFloat(attrs.cx ?? "0");
            const cy = parseFloat(attrs.cy ?? "0");
            const r = parseFloat(attrs.r ?? "0");
            if (r <= 0)
                return [];
            const el = makeEllipse(2 * r, 2 * r, [cx, cy]);
            return [wrapInGroup([el], style, transform, name)];
        }
        case "ellipse": {
            const cx = parseFloat(attrs.cx ?? "0");
            const cy = parseFloat(attrs.cy ?? "0");
            const rx = parseFloat(attrs.rx ?? "0");
            const ry = parseFloat(attrs.ry ?? "0");
            if (rx <= 0 || ry <= 0)
                return [];
            const el = makeEllipse(2 * rx, 2 * ry, [cx, cy]);
            return [wrapInGroup([el], style, transform, name)];
        }
        case "line": {
            const x1 = parseFloat(attrs.x1 ?? "0");
            const y1 = parseFloat(attrs.y1 ?? "0");
            const x2 = parseFloat(attrs.x2 ?? "0");
            const y2 = parseFloat(attrs.y2 ?? "0");
            const sub = {
                v: [
                    [x1, y1],
                    [x2, y2],
                ],
                i: [
                    [0, 0],
                    [0, 0],
                ],
                o: [
                    [0, 0],
                    [0, 0],
                ],
                c: false,
            };
            return [wrapInGroup([makePathShape(sub, name)], style, transform, name)];
        }
        case "polyline":
        case "polygon": {
            const pts = (attrs.points ?? "")
                .trim()
                .split(/[\s,]+/)
                .map(Number)
                .filter((n) => Number.isFinite(n));
            const v = [];
            for (let i = 0; i < pts.length - 1; i += 2)
                v.push([pts[i], pts[i + 1]]);
            if (v.length === 0)
                return [];
            const sub = {
                v,
                i: v.map(() => [0, 0]),
                o: v.map(() => [0, 0]),
                c: node.name === "polygon",
            };
            return [wrapInGroup([makePathShape(sub, name)], style, transform, name)];
        }
        case "path": {
            const d = attrs.d ?? "";
            if (!d)
                return [];
            try {
                const subs = convertPathDataToSubpaths(d);
                if (subs.length === 0)
                    return [];
                const shapes = subs.map((s, i) => makePathShape(s, subs.length === 1 ? name : `${name} ${i + 1}`));
                return [wrapInGroup(shapes, style, transform, name)];
            }
            catch (e) {
                notes.push(`failed to parse path "${name}": ${e.message}`);
                return [];
            }
        }
        case "svg":
        case "defs":
        case "symbol": {
            // Recurse into children
            return node.children.flatMap((c) => convertElement(c, style, notes));
        }
        case "title":
        case "desc":
        case "metadata":
        case "style":
            return [];
        default: {
            notes.push(`skipped unsupported element: <${node.name}>`);
            return [];
        }
    }
};
const parseViewBox = (ast) => {
    const vb = ast.attributes?.viewBox;
    if (vb) {
        const parts = vb.split(/[\s,]+/).map(Number);
        if (parts.length === 4) {
            return { width: parts[2], height: parts[3] };
        }
    }
    const w = parseFloat(ast.attributes?.width ?? "0");
    const h = parseFloat(ast.attributes?.height ?? "0");
    return { width: w || 100, height: h || 100 };
};
// When SVG siblings have the same tag (e.g. multiple `<rect>` with no `id`),
// the converter would name them all `rect`, making them ambiguous in the
// sidebar. Suffix duplicates: "rect", "rect 2", "rect 3" — first stays bare.
const disambiguateNames = (shapes) => {
    const counts = new Map();
    for (const shape of shapes) {
        const obj = shape;
        const base = obj.nm ?? "";
        const seen = counts.get(base) ?? 0;
        if (seen > 0)
            obj.nm = `${base} ${seen + 1}`;
        counts.set(base, seen + 1);
    }
};
export const convertSvgString = async (svgText) => {
    const ast = await parse(svgText);
    const notes = [];
    // SVG's true default is fill=black, but for line-art SVGs designers usually
    // mean "no fill unless I say so." We default fill to black BUT mark it as
    // not-explicit; wrapInGroup suppresses the inherited fill when a stroke is
    // explicitly set with no explicit fill. So plain `<rect/>` still renders
    // black, and `<path stroke="white"/>` (no fill) renders stroke-only.
    const rootStyle = {
        fill: "#000000",
        fillExplicit: false,
        stroke: null,
        strokeExplicit: false,
        strokeWidth: 1,
        fillOpacity: 1,
        strokeOpacity: 1,
        opacity: 1,
        strokeLinecap: null,
        strokeLinejoin: null,
        strokeDasharray: null,
    };
    const top = [];
    for (const child of ast.children) {
        const converted = convertElement(child, rootStyle, notes);
        top.push(...converted);
    }
    disambiguateNames(top);
    // SVG renders earlier siblings UNDER later ones; Lottie renders shape[0]
    // ON TOP. Reverse so the SVG's first child (typically a background) ends
    // up at the bottom of the Lottie z-stack.
    const allShapes = [...top].reverse();
    const viewBox = parseViewBox(ast);
    return {
        shapes: allShapes,
        top_level_groups: top,
        view_width: viewBox.width,
        view_height: viewBox.height,
        notes,
    };
};
//# sourceMappingURL=svg-converter.js.map