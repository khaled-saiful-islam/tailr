import { ChevronDown } from "lucide-react";
import { Switch as RadixSwitch } from "radix-ui";
import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { inputClass as inputBase } from "./styles";

/** A label above any control, with optional hint. */
export function Labelled({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="type-label text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[0.8125rem] text-ink-3">{hint}</p> : null}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with the content instead of scrolling. */
  autoGrow?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    { autoGrow = true, className, onInput, value, ...props },
    forwarded,
  ) {
    const inner = useRef<HTMLTextAreaElement | null>(null);
    const resize = useCallback(() => {
      const el = inner.current;
      if (!el || !autoGrow) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    }, [autoGrow]);

    useLayoutEffect(resize, [resize, value]);

    return (
      <textarea
        ref={(node) => {
          inner.current = node;
          if (typeof forwarded === "function") forwarded(node);
          else if (forwarded) forwarded.current = node;
        }}
        value={value}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        rows={2}
        className={cn(
          inputBase,
          "resize-none px-3.5 py-2.5 leading-relaxed",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(inputBase, "h-11 appearance-none pl-3.5 pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
    </div>
  );
});

export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
}) {
  const autoId = useId();
  const switchId = id ?? autoId;
  return (
    <div className="flex items-center gap-2.5">
      <RadixSwitch.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-10 shrink-0 rounded-full bg-surface-3 transition-colors data-[state=checked]:bg-primary"
      >
        <RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-surface shadow transition-transform duration-200 ease-tailor data-[state=checked]:translate-x-[18px]" />
      </RadixSwitch.Root>
      <label htmlFor={switchId} className="text-[0.9375rem] text-ink">
        {label}
      </label>
    </div>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "danger";
}

/** A square icon-only button. `label` is required: it is the accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, tone = "default", className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-3 transition-colors disabled:opacity-40",
          tone === "danger"
            ? "hover:bg-pin-soft hover:text-pin"
            : "hover:bg-surface-2 hover:text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

/** A titled surface for one part of a page. */
export function Panel({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-24 rounded-panel border border-line bg-surface p-5 sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-[min(100%,14rem)] flex-1">
          <h2 id={headingId} className="type-heading">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[0.9375rem] text-ink-2">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
