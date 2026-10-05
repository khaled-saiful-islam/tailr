import { Check, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { NowShell, type NowProps } from "./NowShell";

const BEFORE_YES = [
  "Get it in writing: salary, start date, benefits and notice period.",
  "It's normal to ask for a few days to decide.",
  "Ask about anything unclear before you sign.",
];

/** An offer: congratulations, and three things worth doing before saying yes. */
export function OfferNow() {
  return (
    <NowShell
      tone="good"
      title="You have an offer. Well done."
      lead="Take a moment to enjoy it. Before you say yes:"
    >
      <ul className="flex flex-col gap-3">
        {BEFORE_YES.map((tip, index) => (
          <motion.li
            key={tip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + index * 0.08 }}
            className="flex items-start gap-2.5"
          >
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--fit-strong)_16%,transparent)] text-fit-strong">
              <Check className="size-3.5" aria-hidden />
            </span>
            {tip}
          </motion.li>
        ))}
      </ul>
    </NowShell>
  );
}

/** Not this time: said kindly, with a way back if they get in touch again. */
export function ClosedNow({ app, onMove }: NowProps) {
  return (
    <NowShell
      tone="closed"
      title="Not this time"
      lead="It stings, and it happens to almost everyone: most applications end this way. Your notes stay here in case you apply to them again."
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/jobs">Look at other jobs</Link>
        </Button>
        <Button
          variant="secondary"
          icon={<RotateCcw className="size-4" />}
          onClick={() => onMove(app.applied_at ? "applied" : "saved")}
        >
          Reopen it
        </Button>
      </div>
    </NowShell>
  );
}
