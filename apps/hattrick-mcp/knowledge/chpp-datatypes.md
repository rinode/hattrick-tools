# CHPP data types and enums

Reference for the coded integer values returned by CHPP, so tool output can be
interpreted without guessing. Money is SEK (÷10 = EUR). Skill levels are 0–20.

## SkillID

1 Goaltending · 2 Stamina · 3 Set pieces · 4 Defending · 5 Scoring · 6 Winger ·
7 Passing · 8 Playmaking · 9 Trainer · 10 Leadership · 11 Experience.

## SkillLevel (0–20)

0 non-existent · 1 disastrous · 2 wretched · 3 poor · 4 weak · 5 inadequate ·
6 passable · 7 solid · 8 excellent · 9 formidable · 10 outstanding · 11 brilliant ·
12 magnificent · 13 world class · 14 supernatural · 15 titanic · 16 extra-terrestrial ·
17 mythical · 18 magical · 19 utopian · 20 divine. (+ "(very) high/low" sub-levels.)

## SpecialtyID

0 none · 1 Technical · 2 Quick · 3 Powerful · 4 Unpredictable · 5 Head · 6 Resilient ·
8 Support.

## trainingType

0 General (deprecated) · 1 Stamina (deprecated) · 2 Set Pieces · 3 Defending ·
4 Scoring · 5 Winger · 6 Scoring + Set Pieces · 7 Passing · 8 Playmaking · 9 Keeper ·
10 Passing (def+mid) · 11 Defending (def+mid) · 12 Winger (wing+att).

## MatchTypeID

1 League · 2 Qualification · 3 Cup · 4 Friendly (normal) · 5 Friendly (cup) ·
7 Hattrick Masters · 8 Int. friendly (normal) · 9 Int. friendly (cup) ·
10/11 NT competition · 12 NT friendly · 50 Tournament League · 51 Tournament Playoff ·
61 Duel · 62 Ladder · 80 Preparation · 100 Youth league · 101/103 Youth friendly ·
105/106 Youth int. friendly.

## MatchRoleID (lineup positions)

100 Keeper · 101 RB · 102 R central def · 103 Mid central def · 104 L central def ·
105 LB · 106 RW · 107 R inner mid · 108 Mid inner mid · 109 L inner mid · 110 LW ·
111 RF · 112 Mid forward · 113 LF. Subs 200–206 (keeper, central def, wing back,
inner mid, forward, winger, extra); backups 207–213. 17 set pieces · 18 captain ·
22–32 penalty takers 1–11.

## MatchBehaviourID

-1 no change · 0 Normal · 1 Offensive · 2 Defensive · 3 Towards middle ·
4 Towards wing · 5 Extra forward · 6 Extra inner mid · 7 Extra defender.

## MatchTacticType

0 Normal · 1 Pressing · 2 Counter-attacks · 3 Attack in middle · 4 Attack in wings ·
7 Play creatively · 8 Long shots.

## MatchTeamAttitude

-1 Play it cool · 0 Normal · 1 Match of the season.

## coachModifier

-10..+10 in 10% steps: negative = defensive, 0 neutral, positive = offensive.

## matchOrderTypeID

1 Normal substitution / behaviour change · 3 Player swap.

## GenderID / LeagueSystemID

GenderID: 1 Male · 2 Female. LeagueSystemID: 1 Male · 2 Female.

## Set-lineup JSON (matchorders POST)

A single `positions` array of 32 slots in order: 0–13 field (GK, RB, RCD, CD, LCD,
LB, RW, RIM, CIM, LIM, LW, RF, CF, LF); 14–18 substitutes (keeper, defender,
midfielder, forward, winger); 19 captain; 20 set-pieces taker; 21–31 penalty takers.
Each slot `{id, behaviour}` — send `id:0` for empty slots, order matters. Plus
`settings{tactic, speechLevel, newLineup:""}` and `substitutions[]` of up to 5
`{playerin, playerout, orderType, min, pos, beh, card, standing}`.
