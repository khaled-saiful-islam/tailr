import { emptyExperience, formatRange, normalize, toApi } from "../types";

describe("profile document helpers", () => {
  it("fills every optional field", () => {
    const doc = normalize({ experiences: [{ title: "Engineer", company: "Selat Pay", current: true }] });
    expect(doc.basics.links).toEqual([]);
    expect(doc.experiences[0]).toMatchObject({ title: "Engineer", bullets: [], start: null, current: true });
    expect(doc.experiences[0]!.id).toHaveLength(12);
  });

  it("keeps half-filled items out of saves and trims text", () => {
    const doc = normalize(undefined);
    const draftRole = { ...emptyExperience(), title: "Engineer" }; // no company yet
    const fullRole = {
      ...emptyExperience(),
      title: "Engineer",
      company: "Selat Pay",
      location: "  ",
      bullets: [
        { id: "a", text: "Shipped search" },
        { id: "b", text: "   " },
      ],
    };
    const api = toApi({
      ...doc,
      basics: { ...doc.basics, headline: "  AI Engineer  ", summary: "" },
      experiences: [draftRole, fullRole],
    });
    expect(api.basics?.headline).toBe("AI Engineer");
    expect(api.basics?.summary).toBeNull();
    expect(api.experiences).toHaveLength(1);
    expect(api.experiences?.[0]?.location).toBeNull();
    expect(api.experiences?.[0]?.bullets).toEqual([{ id: "a", text: "Shipped search" }]);
  });

  it("formats date ranges like a resume", () => {
    expect(formatRange({ year: 2023, month: 3 }, null, true)).toBe("Mar 2023 – Present");
    expect(formatRange({ year: 2020, month: null }, { year: 2023, month: 2 }, false)).toBe("2020 – Feb 2023");
    expect(formatRange(null, null, false)).toBe("");
  });
});
