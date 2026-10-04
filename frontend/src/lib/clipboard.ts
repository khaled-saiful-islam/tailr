import { toast } from "sonner";

/** Copy text and confirm it; fails quietly with a message if the browser refuses. */
export async function copyText(text: string, what = "Text"): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(
      "Your browser blocked copying. Select the text and copy it yourself.",
    );
  }
}
