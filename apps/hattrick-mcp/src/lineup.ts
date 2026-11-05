// Builds the CHPP matchorders lineup JSON from structured per-position player
// IDs, ported from the Go lib's chpp.NewLineup. 14 field positions (GK..LF),
// 14 bench slots (7 primary + 7 backup), 11 kicker slots, settings and up to
// 5 substitution orders.

export interface SubstitutionOrder {
  player_in: number;
  player_out?: number;
  order_type?: number; // 1 sub/behaviour change (default), 3 swap
  minute?: number; // -1 anytime, 46 half-time, 91 pre-extra-time, or a minute
  position?: number; // 0-13 new position, -1 no change
  behaviour?: number; // -1 no change, 0 normal, 1 off, 2 def, ...
  card?: number;
  standing?: number;
}

export interface SetLineupInput {
  goalkeeper?: number;
  right_back?: number;
  right_central_defender?: number;
  central_defender?: number;
  left_central_defender?: number;
  left_back?: number;
  right_winger?: number;
  right_inner_mid?: number;
  central_inner_mid?: number;
  left_inner_mid?: number;
  left_winger?: number;
  right_forward?: number;
  central_forward?: number;
  left_forward?: number;
  behaviours?: Record<string, number>;

  bench_goalkeeper?: number;
  bench_central_defender?: number;
  bench_wing_back?: number;
  bench_inner_mid?: number;
  bench_forward?: number;
  bench_winger?: number;
  bench_extra?: number;

  backup_goalkeeper?: number;
  backup_central_defender?: number;
  backup_wing_back?: number;
  backup_inner_mid?: number;
  backup_forward?: number;
  backup_winger?: number;
  backup_extra?: number;

  captain?: number;
  set_pieces_taker?: number;
  penalty_takers?: number[];
  tactic?: number;
  attitude?: number;
  coach_modifier?: number;
  man_marker?: number;
  man_marking?: number;
  substitutions?: SubstitutionOrder[];
}

interface Slot {
  id: number;
  behaviour: number;
}

const FIELD_ORDER: Array<keyof SetLineupInput> = [
  "goalkeeper",
  "right_back",
  "right_central_defender",
  "central_defender",
  "left_central_defender",
  "left_back",
  "right_winger",
  "right_inner_mid",
  "central_inner_mid",
  "left_inner_mid",
  "left_winger",
  "right_forward",
  "central_forward",
  "left_forward",
];

const BENCH_ORDER: Array<keyof SetLineupInput> = [
  "bench_goalkeeper",
  "bench_central_defender",
  "bench_wing_back",
  "bench_inner_mid",
  "bench_forward",
  "bench_winger",
  "bench_extra",
  "backup_goalkeeper",
  "backup_central_defender",
  "backup_wing_back",
  "backup_inner_mid",
  "backup_forward",
  "backup_winger",
  "backup_extra",
];

export function buildLineup(a: SetLineupInput): string {
  const beh = a.behaviours ?? {};
  const positions: Slot[] = FIELD_ORDER.map((key) => ({
    id: (a[key] as number) ?? 0,
    behaviour: beh[key as string] ?? 0,
  }));

  const bench: Slot[] = BENCH_ORDER.map((key) => ({ id: (a[key] as number) ?? 0, behaviour: 0 }));

  const kickers: Slot[] = Array.from({ length: 11 }, (_, i) => ({
    id: a.penalty_takers?.[i] ?? 0,
    behaviour: 0,
  }));

  const subs = (a.substitutions ?? []).slice(0, 5).map((s) => ({
    playerin: s.player_in,
    playerout: s.player_out ?? 0,
    orderType: String(s.order_type && s.order_type !== 0 ? s.order_type : 1),
    min: s.minute ?? 0,
    pos: s.position ?? 0,
    beh: s.behaviour ?? 0,
    card: s.card ?? 0,
    standing: s.standing ?? 0,
  }));
  if ((a.substitutions ?? []).length > 5) throw new Error("too many substitution orders (max 5)");

  return JSON.stringify({
    positions,
    bench,
    kickers,
    captain: a.captain ?? 0,
    setPieces: a.set_pieces_taker ?? 0,
    settings: {
      tactic: a.tactic ?? 0,
      speechLevel: a.attitude ?? 0,
      newLineup: "",
      coachModifier: a.coach_modifier ?? 0,
      manMarkerPlayerId: a.man_marker ?? 0,
      manMarkingPlayerId: a.man_marking ?? 0,
    },
    substitutions: subs,
  });
}
