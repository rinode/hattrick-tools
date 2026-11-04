/** A player's special trait, affecting match events and commentary. */
export enum SpecialtyId {
  None = 0,
  Technical = 1,
  Quick = 2,
  Powerful = 3,
  Unpredictable = 4,
  HeadSpecialist = 5,
  Resilient = 6,
  Support = 8,
}

export const SPECIALTY_NAMES: Record<SpecialtyId, string> = {
  [SpecialtyId.None]: "",
  [SpecialtyId.Technical]: "Technical",
  [SpecialtyId.Quick]: "Quick",
  [SpecialtyId.Powerful]: "Powerful",
  [SpecialtyId.Unpredictable]: "Unpredictable",
  [SpecialtyId.HeadSpecialist]: "Head specialist",
  [SpecialtyId.Resilient]: "Resilient",
  [SpecialtyId.Support]: "Support",
};

/** Returns the specialty name, or "" for no specialty / unknown id. */
export function specialtyName(id: number): string {
  return SPECIALTY_NAMES[id as SpecialtyId] ?? "";
}
