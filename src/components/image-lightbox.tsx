"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export interface ImageLightboxProps {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ open, src, alt = "", onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-md p-2 bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative z-10 max-w-full max-h-full flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
