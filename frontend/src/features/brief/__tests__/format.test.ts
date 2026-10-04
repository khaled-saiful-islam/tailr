import type { Match } from "../api";
import { payLabel, placeLabel, sentence, sourceLabel } from "../format";

const job = (overrides: Partial<Match["job"]>): Match["job"] =>
  ({ salary_min: null, salary_max: null, salary_text: null, ...overrides }) as Match["job"];

describe("brief formatting", () => {
  it("shortens locations to the place people say", () => {
    expect(placeLabel("Petaling Jaya, Selangor, Malaysia")).toBe("Petaling Jaya");
    expect(placeLabel("Federal Territory of Kuala Lumpur, Malaysia")).toBe("Kuala Lumpur");
    expect(placeLabel("WP. Kuala Lumpur, Federal Territory of Kuala Lumpur")).toBe("Kuala Lumpur");
    expect(placeLabel(null)).toBeNull();
  });

  it("writes pay in ringgit a month", () => {
    expect(payLabel(job({ salary_min: 9000, salary_max: 12000 }))).toBe("RM 9,000 to 12,000 a month");
    expect(payLabel(job({ salary_min: 5000, salary_max: 5000 }))).toBe("RM 5,000 a month");
    expect(payLabel(job({ salary_text: "Competitive" }))).toBe("Competitive");
    expect(payLabel(job({}))).toBeNull();
  });

  it("drops trailing punctuation so we can add our own", () => {
    expect(sentence("No Rust experience.. ")).toBe("No Rust experience");
  });

  it("names sources", () => {
    expect(sourceLabel("jobstreet")).toBe("JobStreet");
  });
});
