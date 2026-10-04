import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tasksKey } from "@/features/tasks/api";
import { useRunBrief } from "./api";

/** "Find new jobs now": starts a search in the background and says so; nothing waits on it. */
export function useFindNow() {
  const run = useRunBrief();
  const client = useQueryClient();
  const find = () =>
    run.mutate(undefined, {
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: tasksKey });
        toast("Searching in the background…", {
          description:
            "This takes a minute or two. Keep using Tailr; we'll tell you when the new jobs are ready.",
        });
      },
      onError: (error) => toast.error(error.message),
    });
  return { find, starting: run.isPending };
}
