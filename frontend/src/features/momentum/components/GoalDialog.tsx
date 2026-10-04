import { Minus, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";
import { useSetGoal } from "../api";

const MIN = 1;
const MAX = 50;
const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value));

/** Choose how many applications a week to aim for. */
export function GoalDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: number;
}) {
  const save = useSetGoal();
  const [value, setValue] = useState(current);
  useEffect(() => {
    if (open) setValue(current);
  }, [open, current]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(clamp(value), {
      onSuccess: () => {
        toast.success(`Goal set: ${clamp(value)} a week.`);
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Your weekly goal"
      description="How many applications a week feels steady for you? Fewer, well-tailored ones beat many rushed ones."
    >
      <form onSubmit={submit}>
        <label htmlFor="weekly-goal" className="type-label text-ink-2">
          Applications a week
        </label>
        <div className="mt-2 flex items-center gap-2">
          <IconButton
            label="One fewer"
            className="border border-line-strong"
            disabled={value <= MIN}
            onClick={() => setValue((v) => clamp(v - 1))}
          >
            <Minus className="size-4" aria-hidden />
          </IconButton>
          <input
            id="weekly-goal"
            type="number"
            inputMode="numeric"
            min={MIN}
            max={MAX}
            value={value}
            onChange={(event) => setValue(Number(event.target.value) || MIN)}
            onBlur={() => setValue((v) => clamp(v))}
            className="type-figure h-11 w-20 rounded-control border border-line-strong bg-surface text-center text-[1.375rem] focus-visible:border-ink focus-visible:outline-none"
          />
          <IconButton
            label="One more"
            className="border border-line-strong"
            disabled={value >= MAX}
            onClick={() => setValue((v) => clamp(v + 1))}
          >
            <Plus className="size-4" aria-hidden />
          </IconButton>
        </div>
        <p className="mt-2 text-[0.8125rem] text-ink-3">
          Between {MIN} and {MAX}. Most people find 3 to 7 sustainable.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save goal
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
