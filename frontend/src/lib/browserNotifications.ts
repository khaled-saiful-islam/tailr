/**
 * System notifications for when Tailr's tab is in the background.
 * Permission is only ever asked for right after the person starts something
 * worth waiting for (a click), never on page load.
 */

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function askToNotify(): void {
  if (canNotify() && Notification.permission === "default") {
    void Notification.requestPermission().catch(() => undefined);
  }
}

export function notifySystem(
  title: string,
  options: { body?: string | null; tag: string; onClick: () => void },
): boolean {
  if (!canNotify() || Notification.permission !== "granted") return false;
  try {
    const note = new Notification(title, {
      body: options.body ?? undefined,
      tag: options.tag,
      icon: "/favicon.svg",
    });
    note.onclick = () => {
      window.focus();
      options.onClick();
      note.close();
    };
    return true;
  } catch {
    return false; // some browsers only allow notifications from a service worker
  }
}
