"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import {
  dateFromKey,
  formatDateDisplay,
  isDateKeyInRange,
  isSameDay,
  isToday,
  toDateKey,
} from "@/lib/issues/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const POPOVER_WIDTH = 280;
const POPOVER_ESTIMATED_HEIGHT = 340;
const GAP = 8;
const VIEWPORT_PAD = 8;

function yearRange(min?: string, max?: string): number[] {
  const current = new Date().getFullYear();
  let start = current - 20;
  let end = current + 20;

  if (min) start = Math.min(start, dateFromKey(min).getFullYear());
  if (max) end = Math.max(end, dateFromKey(max).getFullYear());

  const years: number[] = [];
  for (let y = start; y <= end; y++) years.push(y);
  return years;
}

function computePopoverPosition(
  triggerRect: DOMRect,
  size: { width: number; height: number },
) {
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const openAbove =
    spaceBelow < size.height + GAP && spaceAbove > spaceBelow;

  let top = openAbove
    ? triggerRect.top - size.height - GAP
    : triggerRect.bottom + GAP;

  let left = triggerRect.left;

  if (left + size.width > window.innerWidth - VIEWPORT_PAD) {
    left = triggerRect.right - size.width;
  }

  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - size.width - VIEWPORT_PAD),
  );
  top = Math.max(
    VIEWPORT_PAD,
    Math.min(top, window.innerHeight - size.height - VIEWPORT_PAD),
  );

  return { top, left, openAbove };
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  min?: string;
  max?: string;
  className?: string;
  triggerClassName?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  clearable = true,
  min,
  max,
  className,
  triggerClassName,
  id,
}: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [positioned, setPositioned] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return startOfMonth(dateFromKey(value));
    return startOfMonth(new Date());
  });

  const selectedDate = value ? dateFromKey(value) : null;
  const years = useMemo(() => yearRange(min, max), [min, max]);

  const monthOptions = useMemo(
    () => MONTHS.map((month, index) => ({ value: String(index), label: month })),
    [],
  );

  const yearOptions = useMemo(
    () => years.map((year) => ({ value: String(year), label: String(year) })),
    [years],
  );

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const size = {
      width: popover?.offsetWidth || POPOVER_WIDTH,
      height: popover?.offsetHeight || POPOVER_ESTIMATED_HEIGHT,
    };
    setPosition(computePopoverPosition(rect, size));
    setPositioned(true);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (value) {
      setViewMonth(startOfMonth(dateFromKey(value)));
    }
  }, [value]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setPositioned(false);
    updatePosition();
  }, [isOpen, viewMonth, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setPositioned(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setPositioned(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, updatePosition]);

  const handleSelectDay = (day: Date) => {
    const key = toDateKey(day);
    if (!isDateKeyInRange(key, min, max)) return;
    onChange(key);
    setIsOpen(false);
    setPositioned(false);
  };

  const handleToday = () => {
    const key = toDateKey(new Date());
    if (!isDateKeyInRange(key, min, max)) return;
    onChange(key);
    setViewMonth(startOfMonth(new Date()));
    setIsOpen(false);
    setPositioned(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    setPositioned(false);
  };

  const displayLabel = value ? formatDateDisplay(value) : placeholder;
  const hasValue = Boolean(value);

  const popover = isOpen ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Choose date"
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
      className={cn(
        "fixed z-9999 rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl transition-opacity duration-100",
        positioned ? "opacity-100 animate-scale-in" : "opacity-0 pointer-events-none",
      )}
    >
      <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-2">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <CustomSelect
            options={monthOptions}
            value={String(viewMonth.getMonth())}
            onChange={(val) =>
              setViewMonth(
                (m) => new Date(m.getFullYear(), Number(val), 1),
              )
            }
            className="min-w-0 flex-1 max-w-[120px]"
            triggerClassName="h-7 px-1.5 text-xs font-medium border-border bg-card/50 shadow-none"
            optionsClassName="max-h-48"
          />
          <CustomSelect
            options={yearOptions}
            value={String(viewMonth.getFullYear())}
            onChange={(val) =>
              setViewMonth(
                (m) => new Date(Number(val), m.getMonth(), 1),
              )
            }
            className="w-[76px] shrink-0"
            triggerClassName="h-7 px-1.5 text-xs font-medium border-border bg-card/50 shadow-none"
            optionsClassName="max-h-48"
          />
        </div>

        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px px-2 pt-2">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-2 pb-2">
        {calendarDays.map((day) => {
          const key = toDateKey(day);
          const inMonth = isSameMonth(day, viewMonth);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const today = isToday(day);
          const outOfRange = !isDateKeyInRange(key, min, max);

          return (
            <button
              key={key}
              type="button"
              disabled={outOfRange}
              onClick={() => handleSelectDay(day)}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-md text-xs transition-colors",
                !inMonth && "text-muted-foreground/50",
                inMonth && !selected && !today && "text-foreground hover:bg-accent",
                today &&
                  !selected &&
                  "font-semibold text-primary ring-1 ring-primary/30",
                selected &&
                  "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                outOfRange && "cursor-not-allowed opacity-30 hover:bg-transparent",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
        <button
          type="button"
          onClick={handleToday}
          className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          Today
        </button>
        {clearable ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("relative w-full select-none", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => {
            if (!open) setPositioned(false);
            return !open;
          });
        }}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-card/50 px-3 py-1 text-xs shadow-sm transition-all hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 text-left",
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "truncate",
              hasValue ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {displayLabel}
          </span>
        </span>
        {clearable && hasValue && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </span>
        ) : null}
      </button>

      {mounted && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
