import { describe, expect, it } from "vitest";
import {
  denominate,
  eurToSek,
  formatEur,
  formatSekAsEur,
  sekToEur,
  SkillId,
  skillLevelName,
  specialtyName,
  SpecialtyId,
} from "../src/index.js";

describe("skill levels", () => {
  it("maps numeric levels to denominations", () => {
    expect(skillLevelName(0)).toBe("non-existent");
    expect(skillLevelName(7)).toBe("solid");
    expect(skillLevelName(8)).toBe("excellent");
    expect(skillLevelName(13)).toBe("world class");
    expect(skillLevelName(20)).toBe("divine");
  });

  it("returns empty string for out-of-range levels", () => {
    expect(skillLevelName(-1)).toBe("");
    expect(skillLevelName(21)).toBe("");
  });

  it("exposes skill ids", () => {
    expect(SkillId.Playmaking).toBe(8);
    expect(SkillId.Experience).toBe(11);
  });
});

describe("specialties", () => {
  it("names specialties", () => {
    expect(specialtyName(SpecialtyId.Technical)).toBe("Technical");
    expect(specialtyName(5)).toBe("Head specialist");
    expect(specialtyName(0)).toBe("");
    expect(specialtyName(99)).toBe("");
  });
});

describe("denominate", () => {
  it("formats name (n) like the Go plain() serializer", () => {
    expect(denominate("excellent", 8)).toBe("excellent (8)");
    expect(denominate("Technical", 1)).toBe("Technical (1)");
  });

  it("falls back to the number when unnamed", () => {
    expect(denominate("", 3)).toBe("3");
  });
});

describe("money (SEK -> EUR)", () => {
  it("converts SEK to EUR at 10:1", () => {
    expect(sekToEur(130000)).toBe(13000);
    expect(eurToSek(12000)).toBe(120000);
  });

  it("formats EUR with separators", () => {
    expect(formatEur(13000)).toBe("€13,000");
    expect(formatEur(-1500)).toBe("-€1,500");
    expect(formatEur(1512.5, { cents: true })).toBe("€1,512.50");
  });

  it("formats raw SEK amounts directly as EUR", () => {
    // 130,000 SEK from the API is €13,000 — the exact bug we keep guarding against.
    expect(formatSekAsEur(130000)).toBe("€13,000");
    expect(formatSekAsEur(15120)).toBe("€1,512");
  });
});
