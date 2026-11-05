import { denominate, formatSekAsEur, skillLevelName, specialtyName } from "hattrick-core";
import type {
  Economy,
  Ladder,
  LadderDetails,
  Player,
  PlayerAvatars,
  TeamMatches,
  TeamPlayers,
  Training,
  TransferSearchResults,
} from "hattrick-chpp-node";

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
    gender: p.gender === 2 ? "female" : p.gender === 1 ? "male" : undefined,
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

const MATCH_STATUS: Record<number, string> = { 0: "upcoming", 1: "ongoing", 2: "finished" };

export function humanizeMatches(tm: TeamMatches): Record<string, unknown> {
  return {
    teamId: tm.teamId,
    teamName: tm.teamName,
    matches: tm.matches.map((m) =>
      compact({
        matchId: m.matchId,
        home: m.homeTeamName,
        away: m.awayTeamName,
        result: m.status === 2 ? `${m.homeGoals}–${m.awayGoals}` : undefined,
        status: MATCH_STATUS[m.status] ?? String(m.status),
        date: m.matchDate,
        matchType: m.matchType,
        sourceSystem: m.sourceSystem,
        ordersGiven: m.ordersGiven,
      }),
    ),
  };
}

export function humanizeLadders(ladders: Ladder[]): Record<string, unknown>[] {
  return ladders.map((l) => ({
    id: l.id,
    name: l.name,
    position: l.position,
    record: `${l.wins}W–${l.lost}L`,
    nextMatchDate: l.nextMatchDate,
  }));
}

export function humanizeLadderDetails(d: LadderDetails): Record<string, unknown> {
  return {
    id: d.id,
    name: d.name,
    teams: d.numOfTeams,
    king: d.kingTeamName,
    page: d.pageIndex,
    ranking: d.teams.map((t) => ({
      position: t.position,
      team: t.name,
      record: `${t.wins}W–${t.lost}L`,
    })),
  };
}

export function humanizeTransfers(res: TransferSearchResults): Record<string, unknown> {
  return {
    matches: res.itemCount < 0 ? "100+" : res.itemCount,
    page: res.pageIndex,
    results: res.results.map((r) =>
      compact({
        playerId: r.playerId,
        name: [r.firstName, r.nickName, r.lastName].filter(Boolean).join(" "),
        askingPrice: formatSekAsEur(r.askingPriceSek),
        highestBid: r.highestBidSek ? formatSekAsEur(r.highestBidSek) : undefined,
        deadline: r.deadline,
        age: r.ageDays ? `${r.age} years ${r.ageDays} days` : r.age,
        salary: r.salarySek ? formatSekAsEur(r.salarySek) : undefined,
        tsi: r.tsi,
        form: skill(r.form),
        experience: skill(r.experience),
        specialty: specialtyName(r.specialtyId),
        keeper: skill(r.keeperSkill),
        defending: skill(r.defenderSkill),
        playmaking: skill(r.playmakerSkill),
        winger: skill(r.wingerSkill),
        passing: skill(r.passingSkill),
        scoring: skill(r.scorerSkill),
        setPieces: skill(r.setPiecesSkill),
      }),
    ),
  };
}

/**
 * Drops empty strings, nulls, empty arrays and empty objects (recursively) so
 * JSON results stay compact, while keeping numeric zeros and false — a 0-0
 * score or 0 points is real information. Mirrors the Go MCP's plain().
 */
export function plain(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val === "" || val === null || val === undefined) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      const pv = plain(val);
      if (pv && typeof pv === "object" && !Array.isArray(pv) && Object.keys(pv).length === 0) continue;
      out[k] = pv;
    }
    return out;
  }
  return v;
}
