import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { passwordStrength } from "./passwordStrength";

const words = ["Too short", "Weak", "Fair", "Strong", "Very strong"];

/** Four tape segments that fill as the password gets stronger. */
export function PasswordMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              className={cn("h-full", strength >= 3 ? "bg-fit-strong" : "bg-tape")}
              initial={false}
              animate={{ width: strength >= step ? "100%" : "0%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        ))}
      </div>
      <span className="w-24 text-right text-[0.8125rem] text-ink-2">{words[strength]}</span>
    </div>
  );
}
