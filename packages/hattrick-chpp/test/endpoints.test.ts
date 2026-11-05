import { describe, expect, it } from "vitest";
import { formatSekAsEur } from "hattrick-core";
import { decodeXml } from "../src/xml.js";
import { mapEconomy, mapTeamDetails, mapTraining } from "../src/client.js";

const TEAMDETAILS_XML = `<HattrickData>
  <FileName>teamdetails.xml</FileName>
  <User><UserID>42</UserID><Loginname>marino</Loginname></User>
  <Teams>
    <Team><TeamID>3486754</TeamID><TeamName>Op Buuren</TeamName><ShortTeamName>OB</ShortTeamName><IsPrimaryClub>True</IsPrimaryClub><LeagueSystemID>1</LeagueSystemID></Team>
  </Teams>
</HattrickData>`;

const ECONOMY_XML = `<HattrickData>
  <FileName>economy.xml</FileName>
  <Team>
    <TeamID>3486754</TeamID><TeamName>Op Buuren</TeamName>
    <Cash>500000</Cash><CostsStaff>40800</CostsStaff><CostsSum>80000</CostsSum>
    <IncomeSum>120000</IncomeSum><ExpectedWeeksTotal>40000</ExpectedWeeksTotal>
  </Team>
</HattrickData>`;

const TRAINING_XML = `<HattrickData>
  <FileName>training.xml</FileName>
  <Team>
    <TeamID>3486754</TeamID><TeamName>Op Buuren</TeamName>
    <TrainingLevel>100</TrainingLevel><TrainingType>8</TrainingType><StaminaTrainingPart>10</StaminaTrainingPart>
    <Trainer><TrainerID>99</TrainerID><TrainerName>Claus Toren</TrainerName></Trainer>
    <SpecialTraining><Player><PlayerID>111</PlayerID></Player><Player><PlayerID>222</PlayerID></Player></SpecialTraining>
  </Team>
</HattrickData>`;

describe("mapTeamDetails", () => {
  it("maps the owner and team summaries", () => {
    const td = mapTeamDetails(decodeXml(TEAMDETAILS_XML, "teamdetails"));
    expect(td.loginName).toBe("marino");
    expect(td.teams[0]).toEqual({
      id: 3486754,
      name: "Op Buuren",
      shortName: "OB",
      isPrimaryClub: true,
      leagueSystemId: 1,
    });
  });
});

describe("mapEconomy", () => {
  it("keeps raw SEK and formats EUR via hattrick-core", () => {
    const eco = mapEconomy(decodeXml(ECONOMY_XML, "economy"));
    expect(eco.cashSek).toBe(500000);
    expect(eco.costsStaffSek).toBe(40800);
    // €4,080/wk staff — the figure we verified in-game.
    expect(formatSekAsEur(eco.costsStaffSek)).toBe("€4,080");
    expect(formatSekAsEur(eco.cashSek)).toBe("€50,000");
  });
});

describe("mapTraining", () => {
  it("maps training type, trainer and special-training players", () => {
    const tr = mapTraining(decodeXml(TRAINING_XML, "training"));
    expect(tr.trainingTypeId).toBe(8); // Playmaking
    expect(tr.trainingLevel).toBe(100);
    expect(tr.trainerName).toBe("Claus Toren");
    expect(tr.specialTrainingPlayerIds).toEqual([111, 222]);
  });
});
