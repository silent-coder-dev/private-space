import { describe, expect, it } from "vitest";
import {
  dayDistance,
  daysBetween,
  formatCountdownShort,
  formatDuration,
  getCountdown,
  greeting,
  nextAnniversary,
  parseDuration,
  parseLocalDate,
  toDateInput,
  yearsTogether,
} from "@/lib/time";

describe("parseLocalDate", () => {
  it("reads yyyy-mm-dd as local midnight (not UTC)", () => {
    const d = parseLocalDate("2026-02-14");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(0);
  });

  it("adds an optional time", () => {
    const d = parseLocalDate("2026-02-14", "19:30");
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
  });

  it("round-trips with toDateInput", () => {
    expect(toDateInput(parseLocalDate("2025-12-31"))).toBe("2025-12-31");
  });
});

describe("daysBetween", () => {
  it("counts whole calendar days", () => {
    expect(daysBetween(new Date(2026, 0, 1, 23, 0), new Date(2026, 0, 2, 1, 0))).toBe(1);
    expect(daysBetween(new Date(2026, 0, 10), new Date(2026, 0, 3))).toBe(-7);
  });
});

describe("getCountdown", () => {
  it("splits time into days, hours, minutes and seconds", () => {
    const now = 0;
    const target = ((2 * 24 + 3) * 60 * 60 + 4 * 60 + 5) * 1000;
    expect(getCountdown(target, now)).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
  });

  it("never goes negative", () => {
    expect(getCountdown(1000, 5000)).toMatchObject({ days: 0, seconds: 0, done: true });
  });

  it("formats a short label", () => {
    expect(formatCountdownShort(getCountdown(3 * 86_400_000 + 4 * 3_600_000, 0))).toBe("3d 4h");
    expect(formatCountdownShort(getCountdown(30_000, 0))).toBe("1m");
    expect(formatCountdownShort(getCountdown(0, 0))).toBe("now");
  });
});

describe("nextAnniversary", () => {
  it("returns this year's date if it is still ahead", () => {
    expect(toDateInput(nextAnniversary("2020-12-25", new Date(2026, 9, 16)))).toBe("2026-12-25");
  });

  it("rolls over to next year once it has passed", () => {
    expect(toDateInput(nextAnniversary("2020-03-01", new Date(2026, 9, 16)))).toBe("2027-03-01");
  });

  it("counts today as the anniversary", () => {
    expect(toDateInput(nextAnniversary("2020-10-16", new Date(2026, 9, 16, 15)))).toBe("2026-10-16");
  });

  it("doesn't call your very first day an anniversary", () => {
    expect(toDateInput(nextAnniversary("2026-10-16", new Date(2026, 9, 16, 9)))).toBe("2027-10-16");
  });

  it("keeps 29 February in February on non-leap years", () => {
    expect(toDateInput(nextAnniversary("2024-02-29", new Date(2026, 0, 1)))).toBe("2026-02-28");
  });
});

describe("yearsTogether", () => {
  it("only counts full years", () => {
    expect(yearsTogether("2024-10-17", new Date(2026, 9, 16))).toBe(1);
    expect(yearsTogether("2024-10-16", new Date(2026, 9, 16))).toBe(2);
  });
});

describe("durations", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(225)).toBe("3:45");
    expect(formatDuration(5)).toBe("0:05");
  });

  it("parses m:ss or plain seconds", () => {
    expect(parseDuration("3:45")).toBe(225);
    expect(parseDuration("200")).toBe(200);
    expect(parseDuration("3:75")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });
});

describe("friendly labels", () => {
  it("describes distance to a date", () => {
    const now = new Date(2026, 9, 16, 12);
    expect(dayDistance("2026-10-16", now)).toBe("today");
    expect(dayDistance("2026-10-17", now)).toBe("tomorrow");
    expect(dayDistance("2026-10-20", now)).toBe("in 4 days");
    expect(dayDistance("2026-10-10", now)).toBe("6 days ago");
  });

  it("greets by time of day", () => {
    expect(greeting(8).text).toBe("Good morning");
    expect(greeting(14).text).toBe("Good afternoon");
    expect(greeting(19).text).toBe("Good evening");
  });
});
