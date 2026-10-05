import { AnimatePresence, motion } from "motion/react";
import type { ApplicationUpdate } from "../../api";
import { AppliedNow } from "./now/AppliedNow";
import { ClosedNow, OfferNow } from "./now/EndNow";
import { InterviewNow } from "./now/InterviewNow";
import type { NowProps } from "./now/NowShell";
import { PreparingNow } from "./now/PreparingNow";
import { SavedNow } from "./now/SavedNow";

function Body({
  app,
  onMove,
  save,
}: NowProps & { save: (patch: ApplicationUpdate, delay?: number) => void }) {
  switch (app.stage) {
    case "saved":
      return <SavedNow app={app} onMove={onMove} />;
    case "preparing":
      return <PreparingNow app={app} onMove={onMove} />;
    case "applied":
      return <AppliedNow app={app} onMove={onMove} />;
    case "interview":
      return <InterviewNow app={app} onMove={onMove} save={save} />;
    case "offer":
      return <OfferNow />;
    case "rejected":
      return <ClosedNow app={app} onMove={onMove} />;
  }
}

/** What to do now for this stage; moving on slides the next stage's card in. */
export function NowCard(
  props: NowProps & {
    save: (patch: ApplicationUpdate, delay?: number) => void;
  },
) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={props.app.stage}
        initial={{ opacity: 0, y: 14 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
      >
        <Body {...props} />
      </motion.div>
    </AnimatePresence>
  );
}
