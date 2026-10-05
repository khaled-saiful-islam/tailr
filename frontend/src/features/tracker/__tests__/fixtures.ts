import type { Application } from "../api";

/** A minimal application for tests; override what matters. */
export function app(id: string, patch: Partial<Application> = {}): Application {
  return {
    id,
    stage: "saved",
    position: 0,
    stage_changed_at: "2026-10-01T08:00:00Z",
    created_at: "2026-10-01T08:00:00Z",
    notes: null,
    applied_at: null,
    next_step: null,
    next_step_at: null,
    contact_name: null,
    contact_email: null,
    follow_up_due_at: null,
    nudged_at: null,
    followed_up_at: null,
    follow_up_draft: null,
    match_id: null,
    score: 80,
    kit_id: null,
    kit_status: null,
    job: {
      id: `job-${id}`,
      source: "linkedin",
      url: "https://example.com",
      title: "AI Engineer",
      company: "Selat Pay",
      location: null,
      work_mode: null,
      employment_type: null,
      posted_at: null,
      posted_text: null,
      salary_text: null,
      salary_min: null,
      salary_max: null,
      company_logo: null,
      applicants: null,
    },
    ...patch,
  };
}
