import { ArrowDown, ArrowUp, Sparkles, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton, TextArea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/Spinner";
import { moveById, removeById, updateById } from "@/lib/list";
import { useCoachBullet } from "../../api";
import { newId, type Bullet, type BulletIssue } from "../../types";

const ISSUE_TEXT: Record<BulletIssue, string> = {
  placeholder: "Fill in the [brackets]",
  weak_opener: "Starts weakly",
  no_metric: "No number yet",
  too_short: "Too short",
  too_long: "Long: trim it",
};

interface BulletListProps {
  bullets: Bullet[];
  onChange: (bullets: Bullet[]) => void;
  issues: Map<string, BulletIssue[]>;
  context: { title?: string | null; company?: string | null };
  addLabel?: string;
}

/** Achievement lines ("facts"): the evidence every prepared CV is built from. */
export function BulletList({
  bullets,
  onChange,
  issues,
  context,
  addLabel = "Add an achievement",
}: BulletListProps) {
  const [focusId, setFocusId] = useState<string | null>(null);

  const add = () => {
    const bullet = { id: newId(), text: "" };
    onChange([...bullets, bullet]);
    setFocusId(bullet.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="type-label text-ink">Achievements</p>
      {bullets.length === 0 && (
        <p className="text-[0.875rem] text-ink-3">
          One line per result. Start with what you did, then the outcome: "Cut
          checkout time by 30% by…".
        </p>
      )}
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {bullets.map((bullet, index) => (
            <motion.li
              key={bullet.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
            >
              <BulletRow
                bullet={bullet}
                issues={issues.get(bullet.id) ?? []}
                context={context}
                autoFocus={focusId === bullet.id}
                onText={(text) =>
                  onChange(updateById(bullets, bullet.id, { text }))
                }
                onRemove={() => onChange(removeById(bullets, bullet.id))}
                onMoveUp={
                  index > 0
                    ? () => onChange(moveById(bullets, bullet.id, -1))
                    : undefined
                }
                onMoveDown={
                  index < bullets.length - 1
                    ? () => onChange(moveById(bullets, bullet.id, 1))
                    : undefined
                }
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <button
        type="button"
        onClick={add}
        className="mt-1 w-fit rounded-[8px] px-2 py-1.5 text-[0.9375rem] font-semibold text-chalk hover:bg-chalk-soft"
      >
        + {addLabel}
      </button>
    </div>
  );
}

function BulletRow({
  bullet,
  issues,
  context,
  autoFocus,
  onText,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  bullet: Bullet;
  issues: BulletIssue[];
  context: BulletListProps["context"];
  autoFocus: boolean;
  onText: (text: string) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const coach = useCoachBullet(bullet.text);
  const [asked, setAsked] = useState(false);
  const canCoach = bullet.text.trim().length >= 3;
  // Open while asking, or when an answer from an earlier visit is waiting.
  const open = asked || coach.running || coach.task !== null;
  const answer = coach.result;
  const failed = coach.error !== null;

  const ask = () => {
    setAsked(true);
    coach.run({
      text: bullet.text,
      title: context.title,
      company: context.company,
    });
  };
  const close = () => {
    setAsked(false);
    coach.dismiss();
  };

  return (
    <div className="group rounded-[12px] border border-transparent bg-surface-2/60 p-2 transition-colors focus-within:border-line-strong focus-within:bg-surface hover:bg-surface-2">
      <div className="flex items-start gap-1.5">
        <span
          aria-hidden
          className="mt-[1.05rem] ml-1.5 size-1.5 shrink-0 rounded-full bg-ink-3"
        />
        <TextArea
          aria-label="Achievement"
          rows={1}
          value={bullet.text}
          autoFocus={autoFocus}
          onChange={(event) => onText(event.target.value)}
          placeholder="Shipped…, Cut…, Grew…, Led…"
          className="min-h-0 border-transparent bg-transparent px-2 py-2 shadow-none hover:border-transparent focus:border-transparent focus:shadow-none"
        />
        <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <IconButton
            label="Improve this point"
            onClick={ask}
            disabled={!canCoach || coach.running}
          >
            <Sparkles className="size-4" />
          </IconButton>
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
          <IconButton
            label="Remove achievement"
            tone="danger"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      {issues.length > 0 && !open && (
        <div className="ml-6 mt-1 flex flex-wrap items-center gap-1.5 pb-1">
          {issues.map((issue) => (
            <span
              key={issue}
              className="rounded-full bg-chalk-soft px-2 py-0.5 text-[0.75rem] font-medium text-chalk"
            >
              {ISSUE_TEXT[issue]}
            </span>
          ))}
          {canCoach && (
            <button
              type="button"
              onClick={ask}
              className="text-[0.8125rem] font-semibold text-chalk underline-offset-2 hover:underline"
            >
              Improve this point
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-6 mr-1 mt-2 rounded-[10px] border border-chalk/30 bg-chalk-soft/50 p-4">
              {coach.running && (
                <p
                  role="status"
                  className="flex items-center gap-2 text-[0.9375rem] text-ink-2"
                >
                  <Spinner className="size-4 shrink-0 text-chalk" />
                  <span>Writing a stronger version… You can keep editing.</span>
                </p>
              )}
              {failed && (
                <p className="text-[0.9375rem] text-pin" role="alert">
                  {coach.error}
                </p>
              )}
              {answer && (
                <>
                  <p className="type-label text-chalk">Tailr's suggestion</p>
                  <p className="chalk-mark mt-1.5 text-[0.9375rem] leading-relaxed">
                    {answer.suggestion}
                  </p>
                  <p className="mt-2 text-[0.875rem] text-ink-2">
                    {answer.reason}
                  </p>
                  {answer.questions.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.875rem] text-ink-2">
                      {answer.questions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  )}
                  {answer.suggestion.includes("[") && (
                    <p className="mt-3 text-[0.8125rem] text-ink-3">
                      Replace the [brackets] with your real numbers.
                    </p>
                  )}
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {answer && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onText(answer.suggestion);
                      close();
                    }}
                  >
                    Use this
                  </Button>
                )}
                {(answer || failed) && (
                  <Button size="sm" variant="secondary" onClick={ask}>
                    Try again
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={close}>
                  Keep mine
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
