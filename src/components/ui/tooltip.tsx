"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom" | "left" | "right";

const GAP = 8;
const VIEWPORT_PAD = 4;

function getCoords(
  rect: DOMRect,
  side: TooltipSide,
  size: { width: number; height: number },
) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  switch (side) {
    case "top":
      return { top: rect.top - size.height - GAP, left: cx - size.width / 2 };
    case "bottom":
      return { top: rect.bottom + GAP, left: cx - size.width / 2 };
    case "left":
      return { top: cy - size.height / 2, left: rect.left - size.width - GAP };
    case "right":
      return { top: cy - size.height / 2, left: rect.right + GAP };
  }
}

function clampToViewport(
  pos: { top: number; left: number },
  size: { width: number; height: number },
) {
  return {
    top: Math.max(
      VIEWPORT_PAD,
      Math.min(pos.top, window.innerHeight - size.height - VIEWPORT_PAD),
    ),
    left: Math.max(
      VIEWPORT_PAD,
      Math.min(pos.left, window.innerWidth - size.width - VIEWPORT_PAD),
    ),
  };
}

function resolveSide(
  preferred: TooltipSide,
  rect: DOMRect,
  size: { width: number; height: number },
): TooltipSide {
  const space = {
    top: rect.top,
    bottom: window.innerHeight - rect.bottom,
    left: rect.left,
    right: window.innerWidth - rect.right,
  };

  const fits = (s: TooltipSide) => {
    if (s === "top") return space.top >= size.height + GAP;
    if (s === "bottom") return space.bottom >= size.height + GAP;
    if (s === "left") return space.left >= size.width + GAP;
    return space.right >= size.width + GAP;
  };

  if (fits(preferred)) return preferred;

  const flips: Record<TooltipSide, TooltipSide> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };
  const opposite = flips[preferred];
  if (fits(opposite)) return opposite;

  if (preferred === "top" || preferred === "bottom") {
    return space.bottom > space.top ? "bottom" : "top";
  }
  return space.right > space.left ? "right" : "left";
}

export function Tooltip({
  children,
  content,
  side = "top",
  className,
}: {
  children: React.ReactNode;
  content: string;
  side?: TooltipSide;
  className?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [positioned, setPositioned] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const hide = React.useCallback(() => {
    setVisible(false);
    setPositioned(false);
  }, []);

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const size = {
      width: tooltip.offsetWidth,
      height: tooltip.offsetHeight,
    };
    const resolved = resolveSide(side, rect, size);
    const coords = getCoords(rect, resolved, size);
    setPosition(clampToViewport(coords, size));
    setPositioned(true);
  }, [side]);

  React.useEffect(() => setMounted(true), []);

  React.useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, content, updatePosition]);

  React.useEffect(() => {
    if (!visible) return;
    const onChange = () => updatePosition();
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [visible, updatePosition]);

  const show = () => setVisible(true);

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("inline-flex", className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onPointerDown={hide}
        onBlur={hide}
      >
        {children}
      </div>
      {mounted &&
        visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            aria-hidden={!positioned}
            style={{ top: position.top, left: position.left }}
            className={cn(
              "fixed z-10000 px-2 py-1 text-xs rounded-md bg-popover border border-border text-popover-foreground whitespace-nowrap shadow-lg pointer-events-none transition-opacity duration-100",
              positioned ? "opacity-100" : "opacity-0",
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
