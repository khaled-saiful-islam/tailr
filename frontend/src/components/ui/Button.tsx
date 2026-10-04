import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "tape" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-hover shadow-[inset_0_-1px_0_rgb(0_0_0/0.18)]",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-surface-2",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2",
  tape: "bg-tape text-tape-ink hover:bg-tape-deep shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)]",
  danger: "bg-pin text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
  md: "h-10 px-4 text-[0.9375rem] gap-2",
  lg: "h-12 px-5 text-base gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  /** Render the child element (e.g. a router Link) with button styling. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, asChild, className, children, disabled, ...props },
  ref,
) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      ref={ref}
      className={cn(
        "relative inline-flex select-none items-center justify-center rounded-control font-semibold",
        "transition-[background-color,border-color,color,transform,filter] duration-150 ease-tailor",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner className="size-4" /> : icon}
          <span className={cn(loading && "opacity-80")}>{children}</span>
        </>
      )}
    </Component>
  );
});
