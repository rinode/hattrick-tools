import { denominate, formatSekAsEur, skillLevelName, specialtyName } from "hattrick-core";
import type { Economy, Player, PlayerAvatars, TeamPlayers, Training } from "hattrick-chpp-node";

/** Denominates a 0–20 skill as "name (n)", omitted entirely when 0. */
function skill(n: number): string | undefined {
  return n > 0 ? denominate(skillLevelName(n), n) : undefined;
}

/** Drops undefined/empty entries so results stay compact (like Go's plain()). */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "" || v === 0 || v === false) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function humanizePlayer(p: Player): Record<string, unknown> {
  const name = [p.firstName, p.nickName, p.lastName].filter(Boolean).join(" ");
  return compact({
    id: p.id,
    name,
    number: p.number,
    age: p.ageDays ? `${p.age} years ${p.ageDays} days` : p.age,
    form: skill(p.form),
    experience: skill(p.experience),
    leadership: skill(p.leadership),
    specialty: specialtyName(p.specialtyId),
    salary: p.salarySek ? formatSekAsEur(p.salarySek) : undefined,
    tsi: p.tsi,
    keeper: skill(p.keeperSkill),
    defending: skill(p.defenderSkill),
    playmaking: skill(p.playmakerSkill),
    winger: skill(p.wingerSkill),
    passing: skill(p.passingSkill),
    scoring: skill(p.scorerSkill),
    setPieces: skill(p.setPiecesSkill),
    stamina: skill(p.staminaSkill),
    transferListed: p.transferListed,
    injuryLevel: p.injuryLevel > 0 ? p.injuryLevel : undefined,
    cards: p.cards,
  });
}

export function humanizeTeamPlayers(tp: TeamPlayers): Record<string, unknown> {
  return {
    teamId: tp.teamId,
    teamName: tp.teamName,
    players: tp.players.map(humanizePlayer),
  };
}

export function humanizeEconomy(e: Economy): Record<string, unknown> {
  return {
    teamId: e.teamId,
    teamName: e.teamName,
    cash: formatSekAsEur(e.cashSek),
    expectedCash: formatSekAsEur(e.expectedCashSek),
    thisWeek: {
      income: formatSekAsEur(e.incomeSumSek),
      costs: formatSekAsEur(e.costsSumSek),
      playerWages: formatSekAsEur(e.costsPlayerSek),
      staffWages: formatSekAsEur(e.costsStaffSek),
      arena: formatSekAsEur(e.costsArenaSek),
      youth: formatSekAsEur(e.costsYouthSek),
      net: formatSekAsEur(e.expectedWeeksTotalSek),
    },
    lastWeek: {
      income: formatSekAsEur(e.lastIncomeSumSek),
      costs: formatSekAsEur(e.lastCostsSumSek),
      net: formatSekAsEur(e.lastWeeksTotalSek),
    },
  };
}

const TRAINING_TYPES: Record<number, string> = {
  1: "Set pieces",
  2: "Defending",
  3: "Scoring",
  4: "Crossing / wing",
  5: "Shooting",
  6: "Short passes",
  7: "Playmaking (through passes)",
  8: "Playmaking",
  9: "Winger",
  10: "Goalkeeping",
  11: "Set pieces",
};

export function humanizeTraining(t: Training): Record<string, unknown> {
  return compact({
    teamId: t.teamId,
    teamName: t.teamName,
    trainingType: denominate(TRAINING_TYPES[t.trainingTypeId] ?? "", t.trainingTypeId),
    intensityPercent: t.trainingLevel,
    staminaSharePercent: t.staminaTrainingPart,
    trainer: t.trainerName,
    specialTrainingPlayerIds: t.specialTrainingPlayerIds.length
      ? t.specialTrainingPlayerIds
      : undefined,
  });
}

export function humanizeAvatars(avatars: PlayerAvatars[]): Record<string, unknown>[] {
  return avatars.map((a) => ({
    playerId: a.playerId,
    backgroundImage: a.avatar.backgroundImage,
    layers: a.avatar.layers,
  }));
}
