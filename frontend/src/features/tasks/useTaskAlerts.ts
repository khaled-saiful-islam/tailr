import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useTasks } from "./api";
import {
  alertText,
  finishedSince,
  remember,
  shouldAlert,
  type Seen,
} from "./describe";

/** Lists that change when a kind of work finishes. */
const REFRESH: Record<string, QueryKey[] | undefined> = {
  "job.add": [["matches"], ["applications"]],
};

/**
 * When background work finishes: refresh what it changed, and say so with a toast that
 * opens the result. Work with its own notification already gets a toast from that.
 * Mounted once, in the app shell.
 */
export function useTaskAlerts(): void {
  const { data } = useTasks();
  const client = useQueryClient();
  const navigate = useNavigate();
  const seen = useRef<Seen | null>(null);

  useEffect(() => {
    if (!data) return;
    const finished = finishedSince(seen.current, data.items);
    seen.current = remember(seen.current, data.items);
    for (const task of finished) {
      for (const queryKey of REFRESH[task.kind] ?? [])
        void client.invalidateQueries({ queryKey });
      if (!shouldAlert(task, window.location.pathname)) continue;
      const { title, body } = alertText(task);
      const show = task.status === "failed" ? toast.error : toast.success;
      const link = task.link;
      show(title, {
        description: body,
        duration: 10_000,
        action: link
          ? { label: "Open", onClick: () => navigate(link) }
          : undefined,
      });
    }
  }, [data, client, navigate]);
}
