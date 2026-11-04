/** One positioned layer of an avatar: an image at an (x, y) offset. */
export interface AvatarLayer {
  image: string;
  x: number;
  y: number;
}

/** A layered avatar recipe (card background + positioned bodypart layers). */
export interface Avatar {
  backgroundImage: string;
  layers: AvatarLayer[];
}

/** An avatar paired with the player it belongs to. */
export interface PlayerAvatars {
  playerId: number;
  avatar: Avatar;
}

/** The kind of avatar set to fetch. */
export type AvatarKind = "players" | "hof";

/** A single squad member, as listed by the players file. */
export interface Player {
  id: number;
  firstName: string;
  nickName: string;
  lastName: string;
  number: number;
  age: number;
  ageDays: number;
  tsi: number;
  /** Form skill level 0–20. */
  form: number;
  experience: number;
  loyalty: number;
  motherClubBonus: boolean;
  leadership: number;
  /** Raw salary in SEK (divide by 10 for EUR). */
  salarySek: number;
  isAbroad: boolean;
  specialtyId: number;
  transferListed: boolean;
  countryId: number;
  cards: number;
  injuryLevel: number;
  staminaSkill: number;
  keeperSkill: number;
  playmakerSkill: number;
  scorerSkill: number;
  passingSkill: number;
  wingerSkill: number;
  defenderSkill: number;
  setPiecesSkill: number;
  categoryId: number;
}

/** A team's player list. */
export interface TeamPlayers {
  teamId: number;
  teamName: string;
  players: Player[];
}

/** A single senior team's headline details. */
export interface TeamSummary {
  id: number;
  name: string;
  shortName: string;
  isPrimaryClub: boolean;
}

/** teamdetails: the owning user plus their team(s). */
export interface TeamDetails {
  userId: number;
  loginName: string;
  teams: TeamSummary[];
}

/**
 * A team's finances. All amounts are raw SEK from the API — divide by 10
 * (or use hattrick-core's EUR helpers) for EUR.
 */
export interface Economy {
  teamId: number;
  teamName: string;
  cashSek: number;
  expectedCashSek: number;
  incomeSumSek: number;
  costsSumSek: number;
  costsPlayerSek: number;
  costsStaffSek: number;
  costsArenaSek: number;
  costsYouthSek: number;
  expectedWeeksTotalSek: number;
  lastIncomeSumSek: number;
  lastCostsSumSek: number;
  lastWeeksTotalSek: number;
}

/** A team's current training settings. */
export interface Training {
  teamId: number;
  teamName: string;
  /** Training intensity, percent. */
  trainingLevel: number;
  /** Share of training spent on stamina, percent. */
  staminaTrainingPart: number;
  /** Training type id (see Hattrick training types; 8 = Playmaking). */
  trainingTypeId: number;
  trainerId: number;
  trainerName: string;
  /** Player ids receiving special (stamina) training. */
  specialTrainingPlayerIds: number[];
}
