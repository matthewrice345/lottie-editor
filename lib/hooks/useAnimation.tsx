"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { Animation } from "@lottie-animation-community/lottie-types";
import {
  RgbaColor,
  updateDimensions,
  updateFramerate,
  updateShapeColor,
  deleteLayer,
  addShapeLayer,
  addShape,
  AddShapeOptions,
} from "../animation";
import { History } from "../history";
import { createStorageValue } from "../storage";

interface AnimationContext {
  isAnimationLoading: boolean;
  animationJson: Animation | null;
  setAnimationJson: (animationJson: Animation, name?: string) => void;
  removeAnimationJson: () => void;
  selectedShapePath: string | null;
  setSelectedShapePath: (path: string) => void;
  updateSelectedShapeColor: (color: RgbaColor) => void;
  updateFramerate: (framerate: number) => void;
  updateDimensions: (width: number, height: number) => void;
  deleteLayer: (layerIndex: number) => void;
  addShapeLayer: (name?: string) => void;
  addShape: (layerIndex: number, options: AddShapeOptions) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface AnimationProviderProps {
  children: React.ReactNode;
}

const AnimationContext = createContext<AnimationContext>({
  isAnimationLoading: true,
  animationJson: null,
  setAnimationJson: () => null,
  removeAnimationJson: () => null,
  selectedShapePath: null,
  setSelectedShapePath: () => null,
  updateSelectedShapeColor: () => null,
  updateFramerate: () => null,
  updateDimensions: () => null,
  deleteLayer: () => null,
  addShapeLayer: () => null,
  addShape: () => null,
  undo: () => null,
  redo: () => null,
  canUndo: false,
  canRedo: false,
});

const animationStorage = createStorageValue<Animation>("animationJson", null);

export const AnimationProvider = ({ children }: AnimationProviderProps) => {
  const [isAnimationLoading, setIsAnimationLoading] = useState(true);
  const [animationJson, setAnimationJsonState] = useState<Animation | null>(
    null,
  );
  const [selectedShapePath, setSelectedShapePath] = useState<string>("");
  const historyRef = useRef<History<Animation> | null>(null);
  const animationJsonRef = useRef<Animation | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const docIdRef = useRef<string | null>(null);
  const docNameRef = useRef<string | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const setAnimation = useCallback((next: Animation | null) => {
    animationJsonRef.current = next;
    setAnimationJsonState(next);
  }, []);

  const sendState = useCallback((next: Animation) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "client-state",
        doc_id: docIdRef.current,
        animation: next,
        name: docNameRef.current ?? undefined,
      }),
    );
  }, []);

  const sendClear = useCallback(() => {
    const ws = wsRef.current;
    const docId = docIdRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !docId) return;
    ws.send(JSON.stringify({ type: "client-clear", doc_id: docId }));
  }, []);

  useEffect(() => {
    if (animationJson) {
      animationStorage.set(animationJson);
    } else {
      const stored = animationStorage.get();
      if (stored) {
        historyRef.current = new History<Animation>(stored);
        setAnimation(stored);
      }
      setIsAnimationLoading(false);
    }
  }, [animationJson, setAnimation]);

  const commit = useCallback(
    (next: Animation) => {
      if (!historyRef.current) {
        historyRef.current = new History<Animation>(next);
      } else {
        historyRef.current.push(next);
      }
      setAnimation(next);
      forceRender();
      sendState(next);
    },
    [setAnimation, sendState],
  );

  const handleSetAnimationJson = useCallback(
    (next: Animation, name?: string) => {
      docIdRef.current = null;
      docNameRef.current = name ?? null;
      historyRef.current = new History<Animation>(next);
      setAnimation(next);
      forceRender();
      sendState(next);
    },
    [setAnimation, sendState],
  );

  const handleRemoveAnimationJson = useCallback(() => {
    sendClear();
    docIdRef.current = null;
    docNameRef.current = null;
    animationStorage.remove();
    historyRef.current = null;
    setAnimation(null);
    forceRender();
  }, [setAnimation, sendClear]);

  const handleUpdateSelectedShapeColor = useCallback(
    (color: RgbaColor) => {
      if (!animationJson) return;
      commit(updateShapeColor(animationJson, selectedShapePath, color));
    },
    [animationJson, selectedShapePath, commit],
  );

  const handleUpdateFramerate = useCallback(
    (framerate: number) => {
      if (!animationJson) return;
      commit(updateFramerate(animationJson, framerate));
    },
    [animationJson, commit],
  );

  const handleUpdateDimensions = useCallback(
    (width: number, height: number) => {
      if (!animationJson) return;
      commit(updateDimensions(animationJson, width, height));
    },
    [animationJson, commit],
  );

  const handleDeleteLayer = useCallback(
    (layerIndex: number) => {
      if (!animationJson) return;
      commit(deleteLayer(animationJson, layerIndex));
      setSelectedShapePath("");
    },
    [animationJson, commit],
  );

  const handleAddShapeLayer = useCallback(
    (name?: string) => {
      if (!animationJson) return;
      commit(addShapeLayer(animationJson, name));
    },
    [animationJson, commit],
  );

  const handleAddShape = useCallback(
    (layerIndex: number, options: AddShapeOptions) => {
      if (!animationJson) return;
      commit(addShape(animationJson, layerIndex, options));
    },
    [animationJson, commit],
  );

  const undo = useCallback(() => {
    const next = historyRef.current?.undo();
    if (next) {
      setAnimation(next);
      forceRender();
      sendState(next);
    }
  }, [setAnimation, sendState]);

  const redo = useCallback(() => {
    const next = historyRef.current?.redo();
    if (next) {
      setAnimation(next);
      forceRender();
      sendState(next);
    }
  }, [setAnimation, sendState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = "ws://localhost:8765";
    let ws: WebSocket | null = null;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        console.info("[bridge] connected to MCP server at", url);
        if (animationJsonRef.current) sendState(animationJsonRef.current);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.type === "hello") {
            clientIdRef.current = msg.client_id;
            return;
          }
          if (msg.type === "doc-closed") {
            if (docIdRef.current === msg.doc_id) {
              docIdRef.current = null;
              docNameRef.current = null;
            }
            return;
          }
          if (msg.type === "doc-update" && msg.animation) {
            const isOwn =
              msg.from_client_id &&
              clientIdRef.current &&
              msg.from_client_id === clientIdRef.current;
            docIdRef.current = msg.doc_id;
            if (msg.name) docNameRef.current = msg.name;
            if (isOwn) return;
            historyRef.current = new History<Animation>(msg.animation);
            setAnimation(msg.animation);
            setSelectedShapePath("");
            forceRender();
          }
        } catch (e) {
          console.warn("[bridge] bad message", e);
        }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!cancelled) scheduleReconnect();
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 3000);
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [sendState, setAnimation]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key !== "z" && e.key !== "Z") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return (
    <AnimationContext.Provider
      value={{
        isAnimationLoading,
        animationJson,
        setAnimationJson: handleSetAnimationJson,
        removeAnimationJson: handleRemoveAnimationJson,
        updateSelectedShapeColor: handleUpdateSelectedShapeColor,
        updateFramerate: handleUpdateFramerate,
        updateDimensions: handleUpdateDimensions,
        deleteLayer: handleDeleteLayer,
        addShapeLayer: handleAddShapeLayer,
        addShape: handleAddShape,
        selectedShapePath,
        setSelectedShapePath,
        undo,
        redo,
        canUndo: historyRef.current?.canUndo ?? false,
        canRedo: historyRef.current?.canRedo ?? false,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => useContext(AnimationContext);
