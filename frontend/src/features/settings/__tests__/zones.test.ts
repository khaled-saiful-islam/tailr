import { describe, expect, it } from "vitest";
import {
  HOME_ZONE,
  searchZones,
  share,
  timeZones,
  tokens,
  zoneName,
  zoneOffset,
} from "../zones";

describe("time zones", () => {
  const zones = timeZones(["UTC", "Europe/London", HOME_ZONE, "Asia/Jakarta"]);

  it("puts Kuala Lumpur first, then the rest A to Z", () => {
    expect(zones).toEqual([HOME_ZONE, "Asia/Jakarta", "Europe/London", "UTC"]);
  });

  it("reads like a place", () => {
    expect(zoneName(HOME_ZONE)).toBe("Kuala Lumpur, Asia");
    expect(zoneName("America/Argentina/Buenos_Aires")).toBe(
      "Buenos Aires, America, Argentina",
    );
    expect(zoneName("UTC")).toBe("UTC");
  });

  it("finds zones by any word, best first", () => {
    expect(searchZones(zones, "london")).toEqual(["Europe/London"]);
    expect(searchZones(zones, "asia")).toEqual([HOME_ZONE, "Asia/Jakarta"]);
    expect(searchZones(zones, "jak")).toEqual(["Asia/Jakarta"]);
    expect(searchZones(zones, "")).toEqual(zones);
  });

  it("knows the offset", () => {
    expect(zoneOffset(HOME_ZONE, new Date("2026-10-04T00:00:00Z"))).toBe(
      "GMT+8",
    );
  });
});

describe("usage", () => {
  it("formats token counts", () => {
    expect(tokens(12400)).toBe("12,400");
    expect(tokens(1_500_000)).toBe("1.5M");
  });

  it("measures the allowance", () => {
    expect(share(750_000, 1_500_000)).toBe(50);
    expect(share(2_000_000, 1_500_000)).toBe(100);
    expect(share(500, 0)).toBe(0);
  });
});
