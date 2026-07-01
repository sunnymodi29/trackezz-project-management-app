"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  avatarUrl?: string;
  /** Render a user avatar (photo or initials) beside the label. */
  showAvatar?: boolean;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  optionsClassName?: string;
  disabled?: boolean;
  renderTrigger?: (
    selected: CustomSelectOption | CustomSelectOption[] | null,
  ) => React.ReactNode;
  renderOption?: (
    option: CustomSelectOption,
    isSelected: boolean,
  ) => React.ReactNode;
}

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 220;

function renderOptionAvatar(option: CustomSelectOption, className?: string) {
  if (!option.showAvatar) return null;
  return (
    <Avatar
      src={option.avatarUrl}
      name={option.label}
      size="xs"
      className={cn("h-4 w-4 text-[8px] shrink-0 ring-0", className)}
    />
  );
}

export function CustomSelect({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Select option...",
  className,
  triggerClassName,
  optionsClassName,
  disabled = false,
  renderTrigger,
  renderOption,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOptions = React.useMemo(() => {
    if (multiple) {
      const vals = Array.isArray(value) ? value : [];
      return options.filter((o) => vals.includes(o.value));
    }
    const val = typeof value === "string" ? value : "";
    return options.find((o) => o.value === val) || null;
  }, [options, value, multiple]);

  const updateMenuPosition = React.useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;

    if (openUp) {
      setMenuStyle({
        position: "fixed",
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)),
        width: Math.min(Math.max(rect.width, 220), window.innerWidth - 16),
        maxWidth: window.innerWidth - 16,
        top: "auto",
        bottom: window.innerHeight - rect.top + MENU_GAP,
        zIndex: 999,
      });
      return;
    }

    setMenuStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)),
      width: Math.min(Math.max(rect.width, 220), window.innerWidth - 16),
      maxWidth: window.innerWidth - 16,
      top: rect.bottom + MENU_GAP,
      bottom: "auto",
      zIndex: 999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        optionsRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) setHighlightedIndex(-1);
  }, [isOpen]);

  const handleSelectOption = (optionValue: string) => {
    if (multiple) {
      const currentVals = Array.isArray(value) ? value : [];
      const updated = currentVals.includes(optionValue)
        ? currentVals.filter((v) => v !== optionValue)
        : [...currentVals, optionValue];
      onChange(updated);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        e.key === "Enter" ||
        e.key === " " ||
        e.key === "ArrowDown" ||
        e.key === "ArrowUp"
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + options.length) % options.length,
        );
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelectOption(options[highlightedIndex].value);
        } else if (!multiple) {
          setIsOpen(false);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsRef.current) {
      const highlightedEl = optionsRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      highlightedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  const defaultTriggerContent = () => {
    if (multiple) {
      const selectedList = selectedOptions as CustomSelectOption[];
      if (selectedList.length === 0) {
        return <span className="text-muted-foreground">{placeholder}</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 items-center pr-4">
          {selectedList.map((o) => (
            <div
              key={o.value}
              className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
            >
              {o.icon}
              {renderOptionAvatar(o)}
              {!o.showAvatar && o.avatarUrl && (
                <img
                  key={`${o.value}-${o.avatarUrl}`}
                  src={o.avatarUrl}
                  alt={o.label}
                  className="h-3.5 w-3.5 rounded-full object-cover"
                />
              )}
              <span>{o.label}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectOption(o.value);
                }}
                className="hover:bg-primary/20 rounded px-0.5 cursor-pointer ml-0.5 text-[9px] font-bold"
              >
                ×
              </span>
            </div>
          ))}
        </div>
      );
    }

    const selectedSingle = selectedOptions as CustomSelectOption | null;
    if (!selectedSingle) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    return (
      <div className="flex items-center gap-2 text-xs text-foreground font-medium truncate">
        {selectedSingle.icon}
        {renderOptionAvatar(selectedSingle)}
        {!selectedSingle.showAvatar && selectedSingle.avatarUrl && (
          <img
            key={`${selectedSingle.value}-${selectedSingle.avatarUrl}`}
            src={selectedSingle.avatarUrl}
            alt={selectedSingle.label}
            className="h-4 w-4 rounded-full object-cover"
          />
        )}
        <span className="truncate">{selectedSingle.label}</span>
      </div>
    );
  };

  const optionsMenu = isOpen ? (
    <div
      ref={optionsRef}
      style={menuStyle}
      className={cn(
        "custom-select-options max-h-[min(60dvh,320px)] overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-1 animate-scale-in focus:outline-none scrollbar sm:max-h-[220px] sm:rounded-lg",
        optionsClassName,
      )}
    >
      {options.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-3">
          No options available
        </div>
      ) : (
        options.map((option, index) => {
          const isSelected = multiple
            ? (value as string[]).includes(option.value)
            : value === option.value;
          const isHighlighted = highlightedIndex === index;

          return (
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectOption(option.value);
              }}
              className={cn(
                "mb-0.5 flex min-h-11 cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors sm:min-h-0 sm:rounded-md sm:px-2.5 sm:py-1.5 sm:text-xs",
                isHighlighted
                  ? "bg-accent/80 text-foreground"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                isSelected &&
                  "bg-primary/10 text-primary font-medium hover:bg-primary/15",
              )}
            >
              {renderOption ? (
                renderOption(option, isSelected)
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {option.icon}
                  {renderOptionAvatar(option)}
                  {!option.showAvatar && option.avatarUrl && (
                    <img
                      key={`${option.value}-${option.avatarUrl}`}
                      src={option.avatarUrl}
                      alt={option.label}
                      className="h-4 w-4 rounded-full object-cover shrink-0"
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
              )}
              {isSelected && (
                <Check className="h-3 w-3 text-primary shrink-0" />
              )}
            </div>
          );
        })
      )}
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full select-none", className)}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      {renderTrigger ? (
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="cursor-pointer flex"
        >
          {renderTrigger(selectedOptions)}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-input bg-card/50 px-3 py-1 text-sm shadow-sm transition-all hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 text-left sm:h-8 sm:text-xs",
            triggerClassName,
          )}
        >
          <div className="flex-1 truncate pr-2">{defaultTriggerContent()}</div>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>
      )}

      {typeof document !== "undefined" && optionsMenu
        ? createPortal(optionsMenu, document.body)
        : null}
    </div>
  );
}
