/**
 * Interview prep for one application: the plan, practice answers and marks. Building the
 * plan and checking an answer run in the background, so the page stays usable and a
 * result left from an earlier visit shows up again.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  isActive,
  useBackgroundTask,
  useLatestTask,
} from "@/features/tasks/api";
import { ownerOf, rememberOwner } from "@/features/tasks/useResumableTask";
import { api, unwrap, type Schemas } from "@/lib/api/client";

export type Prep = Schemas["InterviewPrepOut"];
export type Plan = Schemas["InterviewPlan"];
export type PlanQuestion = Schemas["PlanQuestion"];
export type Story = Schemas["StarStory"];
export type Attempt = Schemas["PracticeAttempt"];
export type Feedback = Schemas["FeedbackDraft"];
export type Mark = "confident" | "practice";
export type Kind = PlanQuestion["kind"];

export const prepKey = (kitId: string) => ["kit", kitId, "interview"] as const;
const planLink = (kitId: string) => `/apply/${kitId}?tab=interview`;

export function useInterviewPrep(kitId: string) {
  return useQuery({
    queryKey: prepKey(kitId),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/kits/{kit_id}/interview", {
          params: { path: { kit_id: kitId } },
        }),
      ),
  });
}

/** Build the full plan; also follows a build started on an earlier visit. */
export function usePlanBuilder(kitId: string) {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const refresh = () =>
    void client.invalidateQueries({ queryKey: prepKey(kitId) });
  const own = useBackgroundTask<void>(
    () =>
      unwrap(
        api.POST("/api/v1/kits/{kit_id}/interview/plan", {
          params: { path: { kit_id: kitId } },
        }),
      ),
    { onDone: refresh, onFailed: setError },
  );
  const latest = useLatestTask("interview.plan").data ?? null;
  const earlier =
    latest && latest.link === planLink(kitId) && latest.id !== own.task?.id
      ? latest
      : null;
  const earlierRunning = isActive(earlier);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !earlierRunning)
      void client.invalidateQueries({ queryKey: prepKey(kitId) });
    was.current = earlierRunning;
  }, [earlierRunning, client, kitId]);

  const task = own.task ?? (earlierRunning ? earlier : null);
  return {
    build: () => {
      setError(null);
      own.run();
    },
    running: own.running || earlierRunning,
    stage: task?.stage ?? null,
    error,
  };
}

/** Feedback on a practice answer for one question, kept when you leave. */
export function usePractice(kitId: string, questionId: string) {
  const client = useQueryClient();
  const owner = `${kitId}:${questionId}`;
  const [error, setError] = useState<string | null>(null);
  const keep = (attempt: Attempt) =>
    client.setQueryData<Prep>(prepKey(kitId), (prep) =>
      prep
        ? { ...prep, practice: { ...prep.practice, [questionId]: attempt } }
        : prep,
    );
  const own = useBackgroundTask<string, Attempt>(
    async (answer) => {
      const task = await unwrap(
        api.POST("/api/v1/kits/{kit_id}/interview/feedback", {
          params: { path: { kit_id: kitId } },
          body: { question_id: questionId, answer },
        }),
      );
      rememberOwner(task.id, owner);
      return task;
    },
    { onDone: keep, onFailed: setError },
  );
  const latest = useLatestTask("interview.feedback").data ?? null;
  const earlier =
    latest && latest.id !== own.task?.id && ownerOf(latest.id) === owner
      ? latest
      : null;
  const earlierRunning = isActive(earlier);
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !earlierRunning)
      void client.invalidateQueries({ queryKey: prepKey(kitId) });
    was.current = earlierRunning;
  }, [earlierRunning, client, kitId]);

  return {
    send: (answer: string) => {
      setError(null);
      own.run(answer);
    },
    running: own.running || earlierRunning,
    stage: (own.task ?? earlier)?.stage ?? null,
    error,
  };
}

/** "Confident" or "needs practice" for a question; shows at once, saves behind. */
export function useMark(kitId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { question_id: string; mark: Mark | null }) =>
      unwrap(
        api.PUT("/api/v1/kits/{kit_id}/interview/marks", {
          params: { path: { kit_id: kitId } },
          body,
        }),
      ),
    onMutate: async ({ question_id, mark }) => {
      await client.cancelQueries({ queryKey: prepKey(kitId) });
      const before = client.getQueryData<Prep>(prepKey(kitId));
      client.setQueryData<Prep>(prepKey(kitId), (prep) => {
        if (!prep) return prep;
        const marks = Object.fromEntries(
          Object.entries(prep.marks ?? {}).filter(
            ([key]) => key !== question_id,
          ),
        ) as Prep["marks"];
        return {
          ...prep,
          marks: mark ? { ...marks, [question_id]: mark } : marks,
        };
      });
      return { before };
    },
    onError: (_error, _vars, context) =>
      client.setQueryData(prepKey(kitId), context?.before),
    onSuccess: (prep) => client.setQueryData(prepKey(kitId), prep),
  });
}
