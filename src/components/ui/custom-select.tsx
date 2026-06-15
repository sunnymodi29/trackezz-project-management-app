"use client";

import * as React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  avatarUrl?: string;
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
  const [openUpward, setOpenUpward] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Parse currently selected option(s)
  const selectedOptions = React.useMemo(() => {
    if (multiple) {
      const vals = Array.isArray(value) ? value : [];
      return options.filter((o) => vals.includes(o.value));
    } else {
      const val = typeof value === "string" ? value : "";
      return options.find((o) => o.value === val) || null;
    }
  }, [options, value, multiple]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Viewport space check for placement (upward vs downward)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 250px space below, and more space above, open upward
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Handle select toggle
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

  // Keyboard navigation
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

  // Sync scroll on keyboard highlight
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsRef.current) {
      const highlightedEl = optionsRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Render selected trigger text/icon
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
              {o.avatarUrl && (
                <img
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
        {selectedSingle.avatarUrl && (
          <img
            src={selectedSingle.avatarUrl}
            alt={selectedSingle.label}
            className="h-4 w-4 rounded-full object-cover"
          />
        )}
        <span className="truncate">{selectedSingle.label}</span>
      </div>
    );
  };

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
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-card/50 px-3 py-1 text-xs shadow-sm transition-all hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 text-left",
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

      {isOpen && (
        <div
          ref={optionsRef}
          className={cn(
            "custom-select-options absolute z-50 min-w-full max-w-[280px] max-h-[220px] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl p-1 animate-scale-in focus:outline-none scrollbar",
            openUpward ? "bottom-full mb-1" : "top-full mt-1",
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
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer select-none gap-2 mb-0.5",
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
                      {option.avatarUrl && (
                        <img
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
      )}
    </div>
  );
}
