import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DocumentStore } from "../store.js";
import {
  AnimatePropertyInput,
  RemoveKeyframeInput,
  ScaleKeyframeTimesInput,
  SetKeyframeInput,
  ShiftKeyframesInput,
} from "../schemas.js";
import {
  animateProperty,
  removeKeyframe,
  scaleKeyframeTimes,
  setKeyframe,
  shiftKeyframes,
} from "../../../lib/animation.js";
import { jsonResult } from "./shared.js";

export const register = (server: McpServer, store: DocumentStore) => {
  server.registerTool(
    "animate_property",
    {
      description:
        "Convert a property from static (`a:0`) to animated (`a:1`) by providing a list of keyframes. Each keyframe is `{t, v, easing?}` where `t` is the frame, `v` is the value (number for scalars like rotation/opacity, array for vectors like position/scale/color), and `easing` is one of: linear, ease-in, ease-out, ease-in-out (default: linear). At least 2 keyframes required. `property_path` is a lodash path like `layers.0.ks.s` (scale) or `layers.0.shapes.0.it.2.p` (group position). Use `list_animated_properties` to find existing animated paths, or pick any static property and animate it. Pushes onto undo history.",
      inputSchema: AnimatePropertyInput,
    },
    async ({ doc_id, property_path, keyframes, default_easing }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = animateProperty(
        entry.history.current,
        property_path,
        keyframes,
        default_easing,
      );
      store.applyMutation(id, next);
      return jsonResult({
        doc_id: id,
        property_path,
        keyframe_count: keyframes.length,
      });
    },
  );

  server.registerTool(
    "set_keyframe",
    {
      description:
        "Add or replace a single keyframe at a specific time on a property. If the property is static, it's automatically converted to animated using the existing static value as a baseline at frame 0. If a keyframe already exists at that time, it's replaced. Pushes onto undo history.",
      inputSchema: SetKeyframeInput,
    },
    async ({ doc_id, property_path, time, value, easing }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = setKeyframe(
        entry.history.current,
        property_path,
        time,
        value,
        easing,
      );
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, property_path, time });
    },
  );

  server.registerTool(
    "remove_keyframe",
    {
      description:
        "Remove a keyframe by its index in the keyframe array. If the property ends up with one or zero keyframes, it's collapsed back to static. Pushes onto undo history.",
      inputSchema: RemoveKeyframeInput,
    },
    async ({ doc_id, property_path, index }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = removeKeyframe(entry.history.current, property_path, index);
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, property_path, removed_index: index });
    },
  );

  server.registerTool(
    "shift_keyframes",
    {
      description:
        "Shift every keyframe of an animated property by `frame_offset` (positive = later, negative = earlier). Useful for delaying or advancing an entire animation segment. Pushes onto undo history.",
      inputSchema: ShiftKeyframesInput,
    },
    async ({ doc_id, property_path, frame_offset }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = shiftKeyframes(
        entry.history.current,
        property_path,
        frame_offset,
      );
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, property_path, frame_offset });
    },
  );

  server.registerTool(
    "scale_keyframe_times",
    {
      description:
        "Scale the timing of an animated property by `multiplier` (e.g. 2 = twice as long, 0.5 = twice as fast). `anchor` controls the pivot: \"first\" (default) keeps the first keyframe in place; a number uses that frame as the pivot. Pushes onto undo history.",
      inputSchema: ScaleKeyframeTimesInput,
    },
    async ({ doc_id, property_path, multiplier, anchor }) => {
      const id = store.resolveId(doc_id);
      const entry = store.get(id);
      const next = scaleKeyframeTimes(
        entry.history.current,
        property_path,
        multiplier,
        anchor,
      );
      store.applyMutation(id, next);
      return jsonResult({ doc_id: id, property_path, multiplier });
    },
  );
};
