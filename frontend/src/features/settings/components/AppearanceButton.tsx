import { Moon, Palette, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Popover } from "radix-ui";
import { Link } from "react-router";
import { PALETTES } from "@/app/appearance";
import { useTheme } from "@/app/theme-context";
import { cn } from "@/lib/cn";
import { AppearancePicker } from "./AppearancePicker";

/** The current mode's icon; it turns over when the mode changes. */
function ModeIcon() {
  const { resolved } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={resolved}
        initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className="grid place-items-center"
      >
        <Icon className="size-[18px]" aria-hidden />
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * The quick way to change how Tailr looks. On a computer it's a labelled row at the
 * bottom of the menu; on a phone, an icon in the top bar.
 */
export function AppearanceButton({
  variant = "icon",
  side = "bottom",
  align = "end",
}: {
  variant?: "icon" | "row";
  side?: "top" | "bottom" | "right";
  align?: "start" | "end";
}) {
  const { resolved, choice, palette } = useTheme();
  const paletteName =
    PALETTES.find((option) => option.value === palette)?.label ?? "Classic";
  const mode =
    choice === "system"
      ? `Device (${resolved})`
      : resolved === "dark"
        ? "Dark"
        : "Light";
  return (
    <Popover.Root>
      {variant === "row" ? (
        <Popover.Trigger className="press group flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-[0.9375rem] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink">
          <ModeIcon />
          <span className="min-w-0 flex-1">
            <span className="block leading-tight">Appearance</span>
            <span className="block text-[0.75rem] font-normal leading-tight text-ink-3">
              {mode}, {paletteName}
            </span>
          </span>
          <span
            data-swatch={palette}
            className="swatch size-5 shrink-0 rounded-full ring-1 ring-line-strong transition-transform duration-200 ease-tailor group-hover:rotate-45"
            aria-hidden
          />
        </Popover.Trigger>
      ) : (
        <Popover.Trigger
          aria-label="Appearance: theme and colours"
          className="press relative grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink"
        >
          <ModeIcon />
          <span
            className="absolute bottom-[7px] right-[7px] size-[7px] rounded-full bg-tape"
            aria-hidden
          />
        </Popover.Trigger>
      )}
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={variant === "row" ? 14 : 8}
          collisionPadding={16}
          className={cn(
            "z-50 w-[min(20rem,calc(100vw-2rem))] animate-pop rounded-panel border border-line bg-surface p-4 text-ink shadow-sheet outline-none",
          )}
        >
          <div className="mb-4 flex items-center gap-2">
            <Palette className="size-4 text-ink-2" aria-hidden />
            <h2 className="font-semibold">Appearance</h2>
          </div>
          <AppearancePicker />
          <p className="mt-4 border-t border-line pt-3 text-[0.8125rem] text-ink-3">
            Saved to your account, so it follows you to every device.{" "}
            <Popover.Close asChild>
              <Link
                to="/settings#preferences"
                className="font-semibold text-chalk hover:underline"
              >
                More settings
              </Link>
            </Popover.Close>
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
