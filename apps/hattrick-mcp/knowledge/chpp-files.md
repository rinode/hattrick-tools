# CHPP files and current versions

The complete set of documented CHPP XML files and the latest version of each, as
served by Hattrick. Only documented interfaces may be accessed. This MCP requests
the latest version of every file below.

| File                   | Latest | What it holds                                                |
| ---------------------- | ------ | ------------------------------------------------------------ |
| achievements           | 1.2    | A user's achievements.                                       |
| arenadetails           | 1.7    | Arena, supporter stats, biggest arenas.                      |
| alliances              | 1.4    | Alliance / federation search.                                |
| alliancedetails        | 1.5    | Alliance / federation information.                           |
| avatars                | 1.1    | Avatars for all players of a team (layer list per player).   |
| bookmarks              | 1.0    | User bookmarks.                                              |
| challenges             | 1.6    | Friendly challenges.                                         |
| club                   | 1.5    | Specialists and youth info.                                  |
| cupmatches             | 1.4    | Cup matches.                                                 |
| currentbids            | 1.0    | A team's current transfer bids.                              |
| economy                | 1.4    | Finances.                                                    |
| fans                   | 1.3    | Fan club.                                                    |
| hofplayers             | 1.2    | Hall of Fame players.                                        |
| ladderdetails          | 1.0    | Teams and positions in a ladder.                             |
| ladderlist             | 1.0    | Ladders the user plays in.                                   |
| leaguedetails          | 1.6    | A league level unit (series).                                |
| leaguefixtures         | 1.2    | Fixtures for a series.                                       |
| leaguelevels           | 1.0    | Division levels of a country.                                |
| live                   | 2.3    | (Live) match ticker.                                         |
| managercompendium      | 1.7    | The logged-in manager compendium.                            |
| matches                | 2.9    | Recent/upcoming matches (senior or youth).                   |
| matchesarchive         | 1.5    | Match archive.                                               |
| matchdetails           | 3.1    | Detailed match information.                                  |
| matchlineup            | 2.1    | Lineup for a finished match.                                 |
| matchorders            | 3.1    | Orders for an upcoming match (POST to set).                  |
| nationalteams          | 1.6    | National teams.                                              |
| nationalteamdetails    | 1.9    | National team info.                                          |
| nationalteammatches    | 1.4    | National team matches.                                       |
| nationalplayers        | 1.5    | National team players.                                       |
| players                | 2.8    | A team's players (incl. GenderID since 2.8).                 |
| playerdetails          | 3.2    | A single player (incl. GenderID since 3.2).                  |
| playerevents           | 1.3    | A player's skill-up history.                                 |
| regiondetails          | 1.2    | A region.                                                    |
| search                 | 1.2    | Search.                                                      |
| staffavatars           | 1.0    | Staff avatars.                                               |
| stafflist              | 1.2    | Staff members.                                               |
| supporters             | 1.0    | Teams supported / supporting.                                |
| teamdetails            | 3.9    | Team info (incl. GenderID 3.8, LeagueSystemID 3.9).          |
| tournamentdetails      | 1.0    | A tournament (current season).                               |
| tournamentfixtures     | 1.1    | Tournament matches.                                          |
| tournamentleaguetables | 1.1    | Tournament league tables.                                    |
| tournamentlist         | 1.0    | Tournaments the user plays in.                               |
| training               | 2.2    | Training settings and trainer.                               |
| trainingevents         | 1.3    | A player's training events.                                  |
| transfersearch         | 1.2    | Transfer market search (priceMin/priceMax in SEK since 1.2). |
| transfersteam          | 1.2    | A team's transfer history.                                   |
| transfersplayer        | 1.1    | All transfers of a player.                                   |
| translations           | 1.2    | Denomination translations (fetch rarely, cache).             |
| worldcup               | 1.1    | World cup groups and matches.                                |
| worlddetails           | 2.0    | Countries in HT world (LeagueSystemID on leagues since 2.0). |
| worldlanguages         | 1.2    | Available languages.                                         |
| youthavatars           | 1.2    | Youth team avatars.                                          |
| youthleaguedetails     | 1.1    | Youth league (LeagueSystemID since 1.1).                     |
| youthleaguefixtures    | 1.0    | Youth league fixtures.                                       |
| youthplayerdetails     | 1.3    | A youth player (GenderID since 1.3).                         |
| youthplayerlist        | 1.3    | Youth players (GenderID since 1.3).                          |
| youthteamdetails       | 1.4    | Youth team (GenderID 1.3, LeagueSystemID 1.4).               |

There is **no** `trainingstats` file — it is not a documented CHPP interface.

Money is always SEK; divide by 10 for EUR. Skills are 0–20 levels.

## Error codes

0 not logged in · 1 access denied · 2 file not specified · 3 file not supported ·
4 POST not supported · 5 must use POST · 6 supporters only · 7 unsupported version ·
10 invalid parameter · 50 unknown TeamID · 51 unknown MatchID · 52 unknown ActionType ·
53 MatchID not subscribed · 54 unknown YouthTeamID · 55 unknown YouthPlayerID ·
56 unknown PlayerID · 57 unknown LeagueID · 58 unknown LeagueLevelUnitID ·
59 team not owned by requesting user · 60 unknown TournamentId · 61 unknown LadderId ·
62 youth player is now senior (see SeniorPlayerID) · 63 missing required parameters ·
64 player became a coach · 70 challenge failed · 71 bid failed ·
80 banned from international friendly · 81 banned from transfers ·
90/91/92/93 maintenance · 99 other.
