import test from "node:test";
import assert from "node:assert/strict";
import { earned, rank, scorePrompt, isSafeUrl } from "../src/logic.js";
test("XP is awarded once per approved mission, never for pending or repeated reviews", () => {
  assert.equal(
    earned(
      [
        { mission_id: "S01", status: "passed" },
        { mission_id: "S01", status: "passed" },
        { mission_id: "S02", status: "pending" },
        { mission_id: "S03", status: "revision" },
      ],
      [
        { id: "S01", xp: 300 },
        { id: "S02", xp: 200 },
      ],
    ),
    300,
  );
});
test("rank thresholds do not unlock early", () => {
  assert.equal(rank(399), "Apprentice");
  assert.equal(rank(400), "Builder");
  assert.equal(rank(1200), "Artisan");
  assert.equal(rank(2500), "Architect");
});
test("unsafe document links are rejected", () => {
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("https://example.com"), true);
});
test("prompt checker counts developed fields rather than presence alone", () => {
  assert.equal(
    scorePrompt({
      a: "",
      b: "short",
      c: "A concrete outcome with clear acceptance.",
    }),
    1,
  );
});
import { parseRoute, missionState, nextMission } from "../src/logic.js";
test("mission links validate IDs and reject unknown routes", () => {
  assert.deepEqual(parseRoute("#/mission/S12"), {
    view: "mission",
    missionId: "S12",
  });
  assert.equal(parseRoute("#/mission/S99").view, "campus");
  assert.equal(parseRoute("#invite=private").view, "campus");
  assert.equal(parseRoute("#/library").view, "library");
});
test("resume prioritizes revisions, assignments and saved work over new paths", () => {
  const missions = [{ id: "S01" }, { id: "S02" }, { id: "S03" }];
  assert.equal(
    nextMission(missions, [{ mission_id: "S03", status: "revision" }], {}, [
      { mission_id: "S02" },
    ]).id,
    "S03",
  );
  assert.equal(
    nextMission(missions, [], {}, [{ mission_id: "S02" }]).id,
    "S02",
  );
  assert.equal(
    nextMission(missions, [], { "artifact-S03": "draft" }).id,
    "S03",
  );
  assert.equal(
    nextMission(missions, [{ mission_id: "S01", status: "pending" }], {}).id,
    "S02",
  );
});
test("mastery and pending review take precedence over local draft labels", () => {
  assert.equal(
    missionState("S01", [{ mission_id: "S01", status: "passed" }], {
      "artifact-S01": "draft",
    }),
    "Mastered",
  );
  assert.equal(
    missionState("S01", [{ mission_id: "S01", status: "pending" }], {}),
    "In review",
  );
});
