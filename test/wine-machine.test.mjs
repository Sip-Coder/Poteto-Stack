import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ACTION_NAMES,
  BottleCount,
  FermentDays,
  HAPPY_OAK,
  HAPPY_STEEL,
  INVARIANT_NAMES,
  chartState,
  chartStep,
  explore,
  guard,
  initial,
  invariantErrors,
  key,
  replay,
  step,
} from "../src/wine-machine.mjs";

const tla = readFileSync(new URL("../spec/Wine.tla", import.meta.url), "utf8");
const cfg = readFileSync(new URL("../spec/Wine.cfg", import.meta.url), "utf8");

test("the spec names the same actions and invariants as the machine", () => {
  for (const name of ACTION_NAMES) {
    assert.match(tla, new RegExp(`^${name} ==`, "m"), name);
  }
  assert.match(tla, /^Next ==/m);
  for (const name of INVARIANT_NAMES) {
    assert.match(tla, new RegExp(`^${name} ==`, "m"), name);
    assert.match(cfg, new RegExp(`INVARIANT ${name}\\b`));
  }
  assert.match(cfg, new RegExp(`FermentDays = ${FermentDays}`));
  assert.match(cfg, new RegExp(`BottleCount = ${BottleCount}`));
});

test("the oak path ends in a poured glass and the steel path does too", () => {
  const oak = replay(HAPPY_OAK);
  assert.equal(oak.ok, true, oak.reason);
  assert.deepEqual(oak.state, {
    place: "glass",
    vessel: "oak",
    day: FermentDays,
    left: 0,
    bottledOnce: true,
  });
  assert.equal(chartState(oak.state), "oak, in the glass");

  const steel = replay(HAPPY_STEEL);
  assert.equal(steel.ok, true, steel.reason);
  assert.equal(steel.state.vessel, "steel");
  assert.equal(steel.state.place, "glass");
  assert.equal(chartState(steel.state), "steel, in the glass");
});

test("a pour while bottles remain stays bottled, and the last pour empties it", () => {
  const mid = replay(HAPPY_OAK.slice(0, -1));
  assert.equal(mid.ok, true);
  assert.equal(mid.state.place, "bottled");
  assert.equal(mid.state.left, 1);
  assert.equal(chartState(mid.state), "oak, last bottle");
  const last = step(mid.state, "YouPour");
  assert.equal(last.ok, true);
  assert.equal(last.state.place, "glass");
  assert.equal(last.state.left, 0);
});

test("illegal transitions are refused and the state stays put", () => {
  const start = initial();
  const earlyBottle = step(start, "YouBottle");
  assert.equal(earlyBottle.ok, false);
  assert.equal(earlyBottle.rule, "ferment");
  assert.match(earlyBottle.reason, /can't bottle before fermentation finishes/);
  assert.equal(key(earlyBottle.state), key(start));

  const earlyCrush = step(start, "YouCrush");
  assert.equal(earlyCrush.ok, false);
  assert.match(earlyCrush.reason, /Snip the bunches/);

  const fermenting = replay(["YouSnip", "YouCrush", "YouSealTheVat", "ADayPasses"]);
  assert.equal(fermenting.state.day, 1);
  const pressEarly = step(fermenting.state, "YouPress");
  assert.equal(pressEarly.ok, false);
  assert.equal(pressEarly.rule, "ferment");
  assert.match(pressEarly.reason, /Let fermentation finish/);
  assert.equal(pressEarly.state.day, 1);

  const finished = step(fermenting.state, "ADayPasses");
  assert.equal(finished.ok, true);
  const extraDay = step(finished.state, "ADayPasses");
  assert.equal(extraDay.ok, false);
  assert.match(extraDay.reason, /already finished/);

  const bottled = replay(HAPPY_OAK.slice(0, -2));
  assert.equal(bottled.state.place, "bottled");
  assert.equal(bottled.state.left, BottleCount);
  const crushLate = step(bottled.state, "YouCrush");
  assert.equal(crushLate.ok, false);
  assert.equal(crushLate.rule, "crush");
  assert.match(crushLate.reason, /can't crush a lot that is already in bottle/);
  assert.equal(crushLate.state.place, "bottled");

  const poured = replay(HAPPY_OAK);
  const serveEmpty = step(poured.state, "YouPour");
  assert.equal(serveEmpty.ok, false);
  assert.equal(serveEmpty.rule, "empty");
  assert.match(serveEmpty.reason, /can't serve an empty bottle/);
  assert.equal(serveEmpty.state.left, 0);

  const pressed = replay(HAPPY_OAK.slice(0, 6));
  assert.equal(pressed.state.place, "pressed");
  const oak = step(pressed.state, "YouRackIntoOak");
  assert.equal(oak.ok, true);
  const switchWood = step(oak.state, "YouRackIntoSteel");
  assert.equal(switchWood.ok, false);
  assert.match(switchWood.reason, /already in oak/);
  assert.equal(switchWood.state.vessel, "oak");
});

test("every reachable state satisfies the invariants, and the guards match the rules", () => {
  const states = explore();
  assert.equal(states.length, 15);
  const labels = new Set();
  for (const state of states) {
    assert.deepEqual(invariantErrors(state), [], key(state));
    labels.add(chartState(state));
    assert.equal(guard(state, "YouCrush"), state.place === "basket");
    assert.equal(
      guard(state, "YouBottle"),
      state.place === "cellar" && state.day === FermentDays && (state.vessel === "oak" || state.vessel === "steel"),
    );
    assert.equal(guard(state, "YouPour"), state.place === "bottled" && state.left > 0);
    assert.equal(guard(state, "YouPress"), state.place === "ferment" && state.day === FermentDays);
    for (const action of ACTION_NAMES) {
      const result = step(state, action);
      if (!result.ok) {
        assert.equal(key(result.state), key(state));
        continue;
      }
      assert.deepEqual(invariantErrors(result.state), []);
      const from = chartState(state);
      const to = chartState(result.state);
      if (action === "TheBottleIsFinished") {
        assert.equal(from, to);
        assert.equal(chartStep(action, state, result.state), null);
      } else {
        assert.notEqual(from, to, `${action} ${key(state)}`);
        assert.equal(typeof chartStep(action, state, result.state), "string");
      }
    }
  }
  assert.equal(labels.size, states.length);
});

test("the view module re-exports the same words", async () => {
  const view = await import("../spec/view.mjs");
  assert.equal(view.title, "One bottle");
  assert.equal(view.state(initial()), "on the vine");
  assert.equal(view.group(initial()), "Vineyard");
  assert.equal(view.step("YouSnip", initial(), { place: "basket" }), "you snip the bunches");
  assert.equal(view.colors.Oak, "teal");
  assert.equal(view.colors.Steel, "blue");
});
