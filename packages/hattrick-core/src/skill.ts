/**
 * A player's rating in a given skill, from non-existent (0) to divine (20).
 */
export const SKILL_LEVEL_NAMES = [
  "non-existent",
  "disastrous",
  "wretched",
  "poor",
  "weak",
  "inadequate",
  "passable",
  "solid",
  "excellent",
  "formidable",
  "outstanding",
  "brilliant",
  "magnificent",
  "world class",
  "supernatural",
  "titanic",
  "extra-terrestrial",
  "mythical",
  "magical",
  "utopian",
  "divine",
] as const;

export type SkillLevel = number;

/** Returns the denomination for a skill level, or "" if out of range. */
export function skillLevelName(level: number): string {
  return SKILL_LEVEL_NAMES[level] ?? "";
}

/** The trainable skills and attributes a player has. */
export enum SkillId {
  Goaltending = 1,
  Stamina = 2,
  SetPieces = 3,
  Defending = 4,
  Scoring = 5,
  Winger = 6,
  Passing = 7,
  Playmaking = 8,
  Trainer = 9,
  Leadership = 10,
  Experience = 11,
}

export const SKILL_ID_NAMES: Record<SkillId, string> = {
  [SkillId.Goaltending]: "Goaltending",
  [SkillId.Stamina]: "Stamina",
  [SkillId.SetPieces]: "Set pieces",
  [SkillId.Defending]: "Defending",
  [SkillId.Scoring]: "Scoring",
  [SkillId.Winger]: "Winger",
  [SkillId.Passing]: "Passing",
  [SkillId.Playmaking]: "Playmaking",
  [SkillId.Trainer]: "Trainer",
  [SkillId.Leadership]: "Leadership",
  [SkillId.Experience]: "Experience",
};
