import { expect, test } from "vitest";
import { briefingChallenge } from "./briefing-challenge-state";
import type { World } from "../data/live";

const suggestion = { id: "c", kind: "challenge", status: "pending", target_kind: "theory", target_id: "t", payload_json: JSON.stringify({signal_id:"s",tripwire_version:2,why:"Actual trip reason"}) };
const data = (confidence: unknown = 4): World => ({ theories:[{id:"t",claim:"Theory",tripwire:"A measurable change",tripwire_version:2,confidence}], signals:[{id:"s",gist:"Actual signal"}], suggestions:[suggestion], themes:[], dumps:[], prototypes:[], merges:[] });

test("uses the current persisted confidence and actual referenced objects", () => {
  expect(briefingChallenge(suggestion, data())).toMatchObject({level:4,to:3,blocked:undefined,reason:"Actual trip reason",signal:{id:"s"}});
  expect(briefingChallenge(suggestion, data(3))).toMatchObject({level:3,to:2});
});
test.each([null, undefined, 0, 6, "4", 2.5])("does not lower unrated or invalid confidence %s", confidence => {
  const world = data(); world.theories[0].confidence = confidence;
  expect(briefingChallenge(suggestion, world).blocked).toMatch(/Set confidence/);
});
test("the confidence floor keeps rejection available without proposing a false decrease", () => {
  expect(briefingChallenge(suggestion, data(1))).toMatchObject({level:1,to:1,unavailable:false,blocked:expect.stringContaining("already at 1")});
});
test("guards stale versions, missing and inactive references and decided suggestions", () => {
  for (const change of [(w:World)=>w.theories[0].tripwire_version++, (w:World)=>w.signals=[], (w:World)=>w.theories=[], (w:World)=>w.signals[0].discarded_at="now", (w:World)=>w.theories[0].status="retired", (w:World)=>w.theories[0].tripwire=""]) {
    const world=data();change(world);expect(briefingChallenge(suggestion,world).unavailable).toBe(true);
  }
  expect(briefingChallenge({...suggestion,status:"accepted"},data()).unavailable).toBe(true);
});
