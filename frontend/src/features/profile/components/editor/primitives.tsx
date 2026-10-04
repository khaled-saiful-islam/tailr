import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { Field } from "@/components/ui/Field";
import { IconButton, Select } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { monthNames, type YearMonth } from "../../types";

/** A text input bound to a nullable string. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  autoComplete,
  required,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const showRequired = required && !(value ?? "").trim();
  return (
    <Field
      label={label}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      className={className}
      autoComplete={autoComplete ?? "off"}
      hint={showRequired ? "Required before this item is saved." : undefined}
    />
  );
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR + 2 - 1960 },
  (_, i) => CURRENT_YEAR + 1 - i,
);

/** Month and year, either optional. A year alone is fine. */
export function MonthField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: YearMonth | null;
  onChange: (value: YearMonth | null) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" disabled={disabled}>
      <legend className="type-label mb-1.5 text-ink">{label}</legend>
      <div className="grid grid-cols-[1fr_1.1fr] gap-2">
        <Select
          id={`${id}-month`}
          aria-label={`${label} month`}
          value={value?.month ?? ""}
          disabled={disabled || !value}
          onChange={(event) =>
            value &&
            onChange({
              ...value,
              month: event.target.value ? Number(event.target.value) : null,
            })
          }
        >
          <option value="">Month</option>
          {monthNames.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          id={`${id}-year`}
          aria-label={`${label} year`}
          value={value?.year ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.value
                ? {
                    year: Number(event.target.value),
                    month: value?.month ?? null,
                  }
                : null,
            )
          }
        >
          <option value="">Year</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      </div>
    </fieldset>
  );
}

/**
 * One item in a list (a role, a degree, a project): a header you can click to
 * open, with move and delete actions.
 */
export function ItemCard({
  title,
  subtitle,
  meta,
  defaultOpen = false,
  onMoveUp,
  onMoveDown,
  onRemove,
  removeLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  defaultOpen?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div
      className={cn(
        "rounded-panel border bg-surface transition-colors",
        open ? "border-line-strong" : "border-line",
      )}
    >
      <div className="flex items-start gap-2 p-2 pl-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-[8px] py-2 text-left"
        >
          <ChevronDown
            className={cn(
              "mt-1 size-4 shrink-0 text-ink-3 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className={cn("block font-semibold", !title && "text-ink-3")}>
              {title || "Untitled"}
            </span>
            {(subtitle || meta) && (
              <span className="mt-0.5 flex flex-wrap gap-x-3 text-[0.875rem] text-ink-2">
                {subtitle && <span>{subtitle}</span>}
                {meta && <span className="text-ink-3">{meta}</span>}
              </span>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          {onMoveUp && (
            <IconButton label="Move up" onClick={onMoveUp}>
              <ArrowUp className="size-4" />
            </IconButton>
          )}
          {onMoveDown && (
            <IconButton label="Move down" onClick={onMoveDown}>
              <ArrowDown className="size-4" />
            </IconButton>
          )}
          <IconButton label={removeLabel} tone="danger" onClick={onRemove}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 pb-5 pt-5 sm:px-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A full-width "add another" button with a stitched outline. */
export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-panel border border-dashed border-line-strong px-4 py-3.5 text-[0.9375rem] font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:bg-surface-2 hover:text-ink"
    >
      <Plus className="size-4" aria-hidden />
      {children}
    </button>
  );
}

/** Shown in a section with nothing in it yet. */
export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[0.9375rem] text-ink-3">{children}</p>;
}
