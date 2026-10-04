import { describe, expect, it } from "vitest";
import type { Task } from "../api";
import {
  alertText,
  finishedSince,
  inOrder,
  onPage,
  remember,
  shouldAlert,
  timeLine,
} from "../describe";

const NOW = Date.parse("2026-10-04T12:00:00Z");

function task(id: string, status: Task["status"], extra: Partial<Task> = {}) {
  return {
    id,
    kind: "profile.summary",
    status,
    title: "Writing your summary",
    stage: null,
    result: null,
    link: "/profile",
    error: null,
    created_at: "2026-10-04T11:58:00Z",
    finished_at:
      status === "done" || status === "failed" ? "2026-10-04T11:59:00Z" : null,
    ...extra,
  } as Task;
}

describe("work that just finished", () => {
  it("reports nothing on the first look", () => {
    expect(finishedSince(null, [task("a", "done")])).toEqual([]);
  });

  it("reports work that was running and is now done or failed", () => {
    const seen = remember(null, [
      task("a", "running"),
      task("b", "queued"),
      task("c", "running"),
    ]);
    const now = [task("a", "done"), task("b", "failed"), task("c", "running")];
    expect(finishedSince(seen, now).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("reports quick work that started and ended between two looks", () => {
    const seen = remember(null, []);
    expect(finishedSince(seen, [task("a", "done")]).map((t) => t.id)).toEqual([
      "a",
    ]);
  });

  it("never reports the same work twice", () => {
    let seen = remember(null, [task("a", "running")]);
    const done = [task("a", "done")];
    expect(finishedSince(seen, done)).toHaveLength(1);
    seen = remember(seen, done);
    expect(finishedSince(seen, done)).toEqual([]);
    // Dropping out of the list and coming back doesn't repeat it either.
    seen = remember(seen, []);
    expect(finishedSince(seen, done)).toEqual([]);
  });
});

describe("when to speak up", () => {
  it("stays quiet for work that sends its own notification", () => {
    expect(shouldAlert(task("a", "done", { kind: "job.add" }), "/")).toBe(
      false,
    );
    expect(shouldAlert(task("a", "done", { kind: "job.search" }), "/")).toBe(
      false,
    );
  });

  it("stays quiet on the page that shows the result", () => {
    expect(shouldAlert(task("a", "done"), "/profile")).toBe(false);
    expect(shouldAlert(task("a", "done"), "/jobs")).toBe(true);
  });

  it("compares the page, not the query", () => {
    expect(onPage("/applications?open=1", "/applications")).toBe(true);
    expect(onPage("/profile", "/profile/cv")).toBe(false);
    expect(onPage(null, "/")).toBe(false);
  });
});

describe("plain words", () => {
  it("names what's ready", () => {
    expect(alertText(task("a", "done")).title).toBe("Your summary is ready");
    expect(
      alertText(task("a", "done", { kind: "something.new", title: "Thing" })),
    ).toEqual({ title: "Done", body: "Thing" });
  });

  it("explains a failure", () => {
    expect(
      alertText(task("a", "failed", { error: "Add your experience first." })),
    ).toEqual({
      title: "Your summary didn't finish",
      body: "Add your experience first.",
    });
  });

  it("says how long work has run, or when it ended", () => {
    expect(timeLine(task("a", "queued"), NOW)).toBe("Waiting to start");
    expect(timeLine(task("a", "running"), NOW)).toBe("Running for 2 minutes");
    expect(
      timeLine(
        task("a", "running", { created_at: "2026-10-04T11:59:30Z" }),
        NOW,
      ),
    ).toBe("Running for under a minute");
    expect(timeLine(task("a", "done"), NOW)).toBe("Finished 1 minute ago");
    expect(timeLine(task("a", "failed"), NOW)).toBe("Stopped 1 minute ago");
  });

  it("never says a time in the future when clocks disagree", () => {
    const ahead = task("a", "done", { finished_at: "2026-10-04T12:03:00Z" });
    expect(timeLine(ahead, NOW)).toBe("Finished just now");
  });

  it("puts running work first, then the newest", () => {
    const items = [
      task("old", "done", { created_at: "2026-10-04T11:00:00Z" }),
      task("new", "done", { created_at: "2026-10-04T11:50:00Z" }),
      task("busy", "running", { created_at: "2026-10-04T10:00:00Z" }),
    ];
    expect(inOrder(items).map((t) => t.id)).toEqual(["busy", "new", "old"]);
  });
});
