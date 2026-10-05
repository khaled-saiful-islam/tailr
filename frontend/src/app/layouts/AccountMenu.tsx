import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useMe, useSignOut } from "@/features/auth/api";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const item =
  "flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.875rem] outline-none data-[highlighted]:bg-surface-2";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { data: user } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  if (!user) return null;

  const onSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => navigate("/sign-in", { replace: true }),
      onError: () => toast.error("Couldn't sign you out. Try again."),
    });

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex items-center gap-3 rounded-control text-left transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2",
          compact ? "p-1" : "w-full p-2",
        )}
        aria-label="Account and settings"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-[0.8125rem] font-bold text-primary-ink [font-stretch:112%]">
          {initials(user.name)}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block text-[0.875rem] font-semibold leading-tight">
              {user.name}
            </span>
            <span className="block text-[0.8125rem] leading-tight text-ink-3 [overflow-wrap:anywhere]">
              {user.username ?? user.email}
            </span>
          </span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={compact ? "bottom" : "top"}
          align={compact ? "end" : "start"}
          sideOffset={8}
          className="z-50 w-64 animate-pop rounded-panel border border-line bg-surface p-1.5 text-ink shadow-sheet"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-[0.875rem] font-semibold">{user.name}</p>
            <p className="text-[0.8125rem] text-ink-3 [overflow-wrap:anywhere]">
              {user.email}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild className={item}>
            <Link to="/settings">
              <Settings className="size-4 text-ink-2" aria-hidden />
              Account settings
            </Link>
          </DropdownMenu.Item>
          {user.role === "admin" && (
            <DropdownMenu.Item asChild className={item}>
              <Link to="/admin">
                <ShieldCheck className="size-4 text-ink-2" aria-hidden />
                Admin
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={onSignOut}
            className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.875rem] outline-none data-[highlighted]:bg-surface-2"
          >
            <LogOut className="size-4 text-ink-2" aria-hidden />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
