"use client";

import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { FAB_CONFIG } from "@/config/nav";
import { useEffect, useRef, useState } from "react";

const FAB_SIZE = 56;
const STORAGE_KEY = "fab-position";
const DRAG_THRESHOLD = 5;

type Position = { x: number; y: number };

function defaultPosition(): Position {
  return {
    x: window.innerWidth - FAB_SIZE - 16,
    y: window.innerHeight - FAB_SIZE - 80,
  };
}

function clamp(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(window.innerWidth - FAB_SIZE, pos.x)),
    y: Math.max(0, Math.min(window.innerHeight - FAB_SIZE, pos.y)),
  };
}

function loadPosition(): Position {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return clamp(JSON.parse(raw));
  } catch {}
  return defaultPosition();
}

export function FAB() {
  const pathname = usePathname();
  const router = useRouter();
  const [position, setPosition] = useState<Position | null>(null);

  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const posOrigin = useRef<Position>({ x: 0, y: 0 });
  const latestPos = useRef<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const pos = loadPosition();
    latestPos.current = pos;
    setPosition(pos);
  }, []);

  const fabEntry = Object.entries(FAB_CONFIG).find(([key]) =>
    pathname.startsWith(key)
  );

  if (!fabEntry || !position) return null;

  const [, { label, href }] = fabEntry;

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    isDragging.current = true;
    hasMoved.current = false;
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    posOrigin.current = { ...latestPos.current };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      hasMoved.current = true;
    }
    const next = clamp({ x: posOrigin.current.x + dx, y: posOrigin.current.y + dy });
    latestPos.current = next;
    setPosition(next);
  }

  function onPointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!hasMoved.current) {
      router.push(href);
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestPos.current));
      } catch {}
    }
  }

  return (
    <button
      aria-label={label}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-orange-500 text-white shadow-lg active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 touch-none select-none"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <Plus size={24} aria-hidden="true" />
    </button>
  );
}
