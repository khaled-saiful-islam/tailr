/**
 * Notifications saved before Tailr dropped its jargon ("brief", "measured") still sit in
 * people's inboxes. Show them in today's words; new ones are already plain.
 */
import type { Notification } from "./api";

const OLD_TITLES: Record<string, string> = {
  "Your brief is ready": "New jobs for you",
  "Your brief didn't finish": "Your job search didn't finish",
};

export function plainTitle(note: Pick<Notification, "title">): string {
  return OLD_TITLES[note.title] ?? note.title;
}

export function plainBody(note: Pick<Notification, "body">): string | null {
  const body = note.body;
  if (!body) return null;
  if (body === "No new jobs fit this time. Tailr looks again tomorrow morning.")
    return "Nothing new since the last search. Tailr looks again tomorrow morning.";
  const old =
    /^(\d+) jobs? measured against your profile\.(?: (.+) fits best\.)?$/.exec(
      body,
    );
  if (old) {
    const count = Number(old[1]);
    const jobs = count === 1 ? "1 new job" : `${count} new jobs`;
    return old[2] ? `${jobs}; the best match is at ${old[2]}.` : `${jobs}.`;
  }
  return body;
}

/** Where an old link pointed before the pages were renamed. */
export function plainLink(link: string | null | undefined): string | null {
  if (!link) return null;
  return link
    .replace(/^\/kits\//, "/apply/")
    .replace(/^\/tracker/, "/applications")
    .replace(/^\/radar/, "/preferences")
    .replace(/^\/profile\/portfolio/, "/profile/website");
}
