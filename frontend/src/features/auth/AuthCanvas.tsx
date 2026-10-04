import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { FitTape } from "@/components/ui/FitTape";

interface SampleJob {
  title: string;
  company: string;
  place: string;
  score: number;
  /** Which resume lines get the tailor's chalk for this job. */
  chalk: number[];
}

// Illustrative employers only.
const SAMPLE_JOBS: SampleJob[] = [
  { title: "Senior AI Engineer", company: "Selat Pay", place: "Kuala Lumpur", score: 92, chalk: [0, 2] },
  { title: "ML Platform Engineer", company: "Hijau Energy", place: "Cyberjaya, hybrid", score: 86, chalk: [1, 2] },
  { title: "Data Scientist, GenAI", company: "Rimba Health", place: "Penang", score: 78, chalk: [0, 1] },
];

const RESUME_LINES = [
  "Shipped a RAG assistant used by 40,000 staff",
  "Cut model-serving cost 38% with request batching",
  "Led four engineers across two product squads",
];

const CYCLE_MS = 4600;

/**
 * The brand panel beside sign-in: a resume on the cutting table being measured
 * against one job after another. It shows what Tailr does before you sign up.
 */
export function AuthCanvas() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const job = SAMPLE_JOBS[index] ?? SAMPLE_JOBS[0]!;

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SAMPLE_JOBS.length), CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduce]);

  return (
    <div
      className="relative flex h-full flex-col justify-between overflow-hidden bg-[#14213d] p-10 text-white xl:p-14"
      data-theme="dark"
    >
      {/* Worsted twill: fine diagonal weave. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 7px), repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 11px)",
        }}
      />

      <div className="relative flex flex-1 items-center justify-center pb-24 pt-6">
        <div className="relative w-full max-w-[420px]" aria-hidden>
          {/* The resume on pattern paper. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -2.5 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[4px] bg-[#fbfcfd] p-7 text-[#14213d] shadow-[0_30px_70px_-20px_rgb(0_0_0/0.6)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[1.05rem] font-[760] [font-stretch:115%]">Aina Rahman</p>
                <p className="text-[0.78rem] text-[#47536d]">AI Engineer, Kuala Lumpur</p>
              </div>
              <div className="mt-1 h-2 w-16 rounded-full bg-[#e3e8f0]" />
            </div>
            <div className="mt-5 h-px bg-[#dde2eb]" />
            <p className="mt-4 text-[0.7rem] font-semibold text-[#66718a]">Experience</p>
            <ul className="mt-2 space-y-2.5">
              {RESUME_LINES.map((line, i) => (
                <li key={line} className="flex gap-2 text-[0.8rem] leading-snug">
                  <span className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-[#14213d]" />
                  <span className="relative">
                    {line}
                    <ChalkLine active={job.chalk.includes(i)} delay={0.5 + i * 0.25} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-2">
              <div className="h-1.5 w-11/12 rounded-full bg-[#e3e8f0]" />
              <div className="h-1.5 w-9/12 rounded-full bg-[#e3e8f0]" />
              <div className="h-1.5 w-10/12 rounded-full bg-[#e3e8f0]" />
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["Python", "FastAPI", "LLMs", "RAG"].map((skill) => (
                <span key={skill} className="rounded-[3px] border border-[#dde2eb] px-2 py-0.5 text-[0.7rem] font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>

          {/* The job tag, hung on a thread, measuring the resume. */}
          <div className="absolute -bottom-16 -right-4 w-[300px] xl:-right-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={job.title}
                initial={reduce ? false : { opacity: 0, x: 40, rotate: 6 }}
                animate={{ opacity: 1, x: 0, rotate: 1.5 }}
                exit={{ opacity: 0, x: -24, rotate: -4 }}
                transition={{ type: "spring", stiffness: 160, damping: 18 }}
                style={{ transformOrigin: "50% -40px" }}
                className="relative rounded-[12px] border border-white/10 bg-[#1b2741] p-4 shadow-[0_24px_50px_-18px_rgb(0_0_0/0.7)]"
              >
                <span className="absolute -top-2 left-6 size-3 rounded-full border-2 border-[#14213d] bg-[#0e1526]" />
                <p className="text-[0.95rem] font-[700] [font-stretch:110%]">{job.title}</p>
                <p className="text-[0.8rem] text-[#aeb8cd]">
                  {job.company}, {job.place}
                </p>
                <FitTape score={job.score} size="md" showLabel className="mt-3" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="relative max-w-[30rem]">
        <h2 className="text-[clamp(2rem,1.2rem+1.6vw,2.875rem)] font-[760] leading-[1.04] tracking-[-0.025em] text-white [font-stretch:125%]">
          Jobs that fit. Applications made to measure.
        </h2>
        <p className="mt-4 max-w-[26rem] text-[1rem] leading-relaxed text-[#c9d1e2]">
          Every morning, fresh jobs from LinkedIn and JobStreet, scored against your profile. Pick
          one and Tailr tailors your resume and cover letter for it.
        </p>
      </div>
    </div>
  );
}

function ChalkLine({ active, delay }: { active: boolean; delay: number }) {
  return (
    <svg
      viewBox="0 0 200 6"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -bottom-1.5 left-0 h-1.5 w-full overflow-visible"
    >
      <motion.path
        d="M0 3 Q 5 0 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3 T 70 3 T 80 3 T 90 3 T 100 3 T 110 3 T 120 3 T 130 3 T 140 3 T 150 3 T 160 3 T 170 3 T 180 3 T 190 3 T 200 3"
        fill="none"
        stroke="#3f6fe8"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        initial={false}
        animate={{ pathLength: active ? 1 : 0, opacity: active ? 0.9 : 0 }}
        transition={{ duration: active ? 0.7 : 0.25, delay: active ? delay : 0, ease: "easeOut" }}
      />
    </svg>
  );
}
