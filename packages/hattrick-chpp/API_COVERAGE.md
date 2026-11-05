# CHPP coverage (hattrick-chpp)

Ported from the Go `lucianoq/hattrick` lib. All 57 CHPP files have a typed
read method on `HattrickClient`, returning already-decoded models. Versions
match the Go lib's audited versions. 57 is the complete documented CHPP file
set (per the CHPP Files help page) — there is no `trainingstats` file.

## Read endpoints — 57/57

| CHPP file              | Version | Client method(s)                                                                        |
| ---------------------- | ------- | --------------------------------------------------------------------------------------- |
| achievements           | 1.2     | `getMyAchievements`, `getAchievements`                                                  |
| alliancedetails        | 1.5     | `getAllianceDetails`                                                                    |
| alliances              | 1.4     | `getMyAlliances`, `searchAlliances`                                                     |
| arenadetails           | 1.7     | `getMyArena`, `getArena`, `getArenaByTeam`, `getArenaStats`, `getMyArenaSupporterStats` |
| avatars                | 1.1     | `getMyAvatars`, `getAvatars`                                                            |
| bookmarks              | 1.0     | `getBookmarks`                                                                          |
| challenges             | 1.6     | `getChallenges`, `areChallengeable`                                                     |
| club                   | 1.5     | `getMyClub`, `getClub`                                                                  |
| cupmatches             | 1.4     | `getCupMatches` (paginated)                                                             |
| currentbids            | 1.0     | `getCurrentBids`                                                                        |
| economy                | 1.4     | `getMyEconomy`, `getEconomy`                                                            |
| fans                   | 1.3     | `getMyFans`, `getFans`                                                                  |
| hofplayers             | 1.2     | `getMyHofPlayers`, `getHofPlayers`                                                      |
| ladderdetails          | 1.0     | `getLadderDetails`                                                                      |
| ladderlist             | 1.0     | `getMyLadders`, `getLadders`                                                            |
| leaguedetails          | 1.6     | `getMySeries`, `getSeries`                                                              |
| leaguefixtures         | 1.2     | `getMySeriesFixtures`, `getSeriesFixtures`                                              |
| leaguelevels           | 1.0     | `getMyLeagueLevels`, `getLeagueLevels`                                                  |
| live                   | 2.3     | `getLiveMatches`                                                                        |
| managercompendium      | 1.7     | `getMe`, `getManager`                                                                   |
| matches                | 2.9     | `getMyMatches`, `getMatches`                                                            |
| matchesarchive         | 1.5     | `getMatchesArchive`                                                                     |
| matchdetails           | 3.1     | `getMatch`, `getMatchDetails`                                                           |
| matchlineup            | 2.1     | `getMatchLineup`                                                                        |
| matchorders            | 3.1     | `getMatchOrders` (read)                                                                 |
| nationalplayers        | 1.5     | `getNationalTeamPlayers`, `getNationalTeamPlayerStats`                                  |
| nationalteamdetails    | 1.9     | `getNationalTeamDetails`                                                                |
| nationalteammatches    | 1.4     | `getNationalTeamMatches`                                                                |
| nationalteams          | 1.6     | `getNationalTeams`                                                                      |
| players                | 2.8     | `getMyPlayers`, `getPlayers`                                                            |
| playerdetails          | 3.2     | `getPlayerDetails`                                                                      |
| playerevents           | 1.3     | `getPlayerEvents`                                                                       |
| regiondetails          | 1.2     | `getMyRegion`, `getRegion`                                                              |
| search                 | 1.2     | `search`                                                                                |
| staffavatars           | 1.1     | `getMyStaffAvatars`, `getStaffAvatars`                                                  |
| stafflist              | 1.2     | `getMyStaff`, `getStaff`                                                                |
| supporters             | 1.0     | `getMySupportedTeams`, `getSupportedTeams`, `getMySupporters`, `getSupporters`          |
| teamdetails            | 3.9     | `getMyTeamDetails`, `getTeamDetails`                                                    |
| tournamentdetails      | 1.0     | `getTournament`                                                                         |
| tournamentfixtures     | 1.1     | `getTournamentFixtures`                                                                 |
| tournamentleaguetables | 1.1     | `getTournamentLeagueTables`                                                             |
| tournamentlist         | 1.0     | `getMyTournaments`, `getTournaments`                                                    |
| training               | 2.2     | `getMyTraining`, `getTraining`                                                          |
| trainingevents         | 1.3     | `getTrainingEvents`                                                                     |
| transfersearch         | 1.2     | `searchTransfers` (priceMin/priceMax in SEK since 1.2)                                  |
| transfersplayer        | 1.1     | `getPlayerTransferHistory`                                                              |
| transfersteam          | 1.2     | `getMyTransfersTeam`, `getTransfersTeam`                                                |
| translations           | 1.2     | `getTranslations`                                                                       |
| worldcup               | 1.1     | `getWorldCupGroups`, `getWorldCupMatches`                                               |
| worlddetails           | 2.0     | `getWorld`, `getLeague`, `getCountry`                                                   |
| worldlanguages         | 1.2     | `getWorldLanguages`                                                                     |
| youthavatars           | 1.2     | `getMyYouthAvatars`, `getYouthAvatars`                                                  |
| youthleaguedetails     | 1.1     | `getMyYouthLeague`, `getYouthLeague`                                                    |
| youthleaguefixtures    | 1.0     | `getMyYouthLeagueFixtures`, `getYouthLeagueFixtures`                                    |
| youthplayerdetails     | 1.3     | `getYouthPlayer`                                                                        |
| youthplayerlist        | 1.3     | `getMyYouthPlayers`, `getYouthPlayers`                                                  |
| youthteamdetails       | 1.4     | `getMyYouthTeam`, `getYouthTeam`                                                        |

## Mutating / action calls — implemented

These change the account. `setMatchOrders`/`predictRatings` use a signed
form POST (lineup in the body); the rest are signed GETs with an `actionType`.

- matchorders: `setMatchOrders`, `predictRatings` (lineup POST)
- currentbids: `deleteAllFinishedBids`, `ignoreTransfer`
- playerdetails: `placeBid`
- youthplayerlist / youthplayerdetails: `unlockYouthTeamSkills`, `unlockYouthPlayerSkills`
- live: `addLiveMatch`, `deleteLiveMatch`, `clearLiveMatches`
- challenges: `challenge`, `acceptChallenge`, `declineChallenge`, `withdrawChallenge`

All 57 CHPP files are fully covered (read + write). Full parity with the Go lib
and with the complete documented CHPP file set.
