/**
 * One lot of red wine, from the vine to the glass.
 * Mirrors spec/Wine.tla action for action. Change both together.
 * Constants match spec/Wine.cfg so TLC and these tests explore the same space.
 */

export const FermentDays = 2;
export const BottleCount = 2;

export const PLACES = [
  "vine",
  "basket",
  "must",
  "ferment",
  "pressed",
  "cellar",
  "bottled",
  "glass",
];

export const VESSELS = ["none", "oak", "steel"];

export const ACTION_NAMES = [
  "YouSnip",
  "YouCrush",
  "YouSealTheVat",
  "ADayPasses",
  "YouPress",
  "YouRackIntoOak",
  "YouRackIntoSteel",
  "YouBottle",
  "YouPour",
  "TheBottleIsFinished",
];

export const INVARIANT_NAMES = [
  "TypeOK",
  "NoBottleBeforeFerment",
  "NoServeEmpty",
  "NoCrushAfterBottle",
  "FermentBeforePress",
  "OneVessel",
];

const EARLY = new Set(["vine", "basket", "must", "ferment", "pressed"]);
const AFTER_PRESS = new Set(["pressed", "cellar", "bottled", "glass"]);
const CELLAR_ON = new Set(["cellar", "bottled", "glass"]);

export function initial() {
  return { place: "vine", vessel: "none", day: 0, left: 0, bottledOnce: false };
}

export function clone(state) {
  return {
    place: state.place,
    vessel: state.vessel,
    day: state.day,
    left: state.left,
    bottledOnce: state.bottledOnce,
  };
}

export function key(state) {
  return `${state.place}|${state.vessel}|${state.day}|${state.left}|${state.bottledOnce ? 1 : 0}`;
}

export function guard(state, action) {
  switch (action) {
    case "YouSnip":
      return state.place === "vine";
    case "YouCrush":
      return state.place === "basket";
    case "YouSealTheVat":
      return state.place === "must";
    case "ADayPasses":
      return state.place === "ferment" && state.day < FermentDays;
    case "YouPress":
      return state.place === "ferment" && state.day === FermentDays;
    case "YouRackIntoOak":
      return state.place === "pressed" && state.vessel === "none";
    case "YouRackIntoSteel":
      return state.place === "pressed" && state.vessel === "none";
    case "YouBottle":
      return (
        state.place === "cellar" &&
        (state.vessel === "oak" || state.vessel === "steel") &&
        state.day === FermentDays
      );
    case "YouPour":
      return state.place === "bottled" && state.left > 0;
    case "TheBottleIsFinished":
      return state.place === "glass";
    default:
      return false;
  }
}

/** Reader-facing refusal. `rule` names the invariant the click would violate. */
export function whyNot(state, action) {
  const place = state.place;
  switch (action) {
    case "YouSnip":
      return { rule: null, message: "The bunches are already off the vine." };
    case "YouCrush":
      if (place === "vine") return { rule: null, message: "Snip the bunches into the basket first." };
      if (state.bottledOnce || place === "bottled" || place === "glass") {
        return { rule: "crush", message: "You can't crush a lot that is already in bottle." };
      }
      return { rule: "crush", message: "You can't crush again after the must is made." };
    case "YouSealTheVat":
      if (place === "vine" || place === "basket") {
        return { rule: null, message: "Crush and destem before you seal the vat." };
      }
      return { rule: null, message: "The vat is already sealed." };
    case "ADayPasses":
      if (place !== "ferment") return { rule: null, message: "Nothing is fermenting yet." };
      return { rule: null, message: "Fermentation has already finished." };
    case "YouPress":
      if (place === "ferment" && state.day < FermentDays) {
        return { rule: "ferment", message: "Let fermentation finish before you press." };
      }
      if (place === "pressed" || CELLAR_ON.has(place)) {
        return { rule: null, message: "The skins are already pressed." };
      }
      return { rule: null, message: "There is nothing ready to press." };
    case "YouRackIntoOak":
    case "YouRackIntoSteel":
      if (CELLAR_ON.has(place)) {
        return {
          rule: null,
          message: state.vessel === "oak" ? "This lot is already in oak." : "This lot is already in steel.",
        };
      }
      return { rule: null, message: "Press the wine before you choose a vessel." };
    case "YouBottle":
      if (place === "vine" || place === "basket" || place === "must" || (place === "ferment" && state.day < FermentDays)) {
        return { rule: "ferment", message: "You can't bottle before fermentation finishes." };
      }
      if (place === "ferment") return { rule: "ferment", message: "Press the wine before you bottle it." };
      if (place === "pressed") return { rule: null, message: "Rack the wine into oak or steel first." };
      return { rule: null, message: "This lot is already bottled." };
    case "YouPour":
      if (place === "glass" || state.bottledOnce) {
        return { rule: "empty", message: "You can't serve an empty bottle." };
      }
      return { rule: null, message: "Bottle the wine before you pour a glass." };
    default:
      return { rule: null, message: "That step isn't part of this cellar." };
  }
}

function applyAction(state, action) {
  if (!guard(state, action)) return null;
  const next = clone(state);
  switch (action) {
    case "YouSnip":
      next.place = "basket";
      break;
    case "YouCrush":
      next.place = "must";
      break;
    case "YouSealTheVat":
      next.place = "ferment";
      next.day = 0;
      break;
    case "ADayPasses":
      next.day = state.day + 1;
      break;
    case "YouPress":
      next.place = "pressed";
      break;
    case "YouRackIntoOak":
      next.place = "cellar";
      next.vessel = "oak";
      break;
    case "YouRackIntoSteel":
      next.place = "cellar";
      next.vessel = "steel";
      break;
    case "YouBottle":
      next.place = "bottled";
      next.left = BottleCount;
      next.bottledOnce = true;
      break;
    case "YouPour":
      next.left = state.left - 1;
      next.place = state.left === 1 ? "glass" : "bottled";
      break;
    case "TheBottleIsFinished":
      break;
    default:
      return null;
  }
  return next;
}

export function step(state, action) {
  const next = applyAction(state, action);
  if (!next) {
    const why = whyNot(state, action);
    return { ok: false, state, reason: why.message, rule: why.rule };
  }
  return { ok: true, state: next, reason: "", rule: null };
}

export function replay(actions, start = initial()) {
  const trace = [clone(start)];
  let state = clone(start);
  for (const action of actions) {
    const result = step(state, action);
    if (!result.ok) {
      return { ok: false, action, reason: result.reason, rule: result.rule, state, trace };
    }
    state = result.state;
    trace.push(clone(state));
  }
  return { ok: true, state, trace, reason: "", rule: null };
}

export function successors(state) {
  const out = [];
  for (const action of ACTION_NAMES) {
    const result = step(state, action);
    if (result.ok) out.push({ action, state: result.state });
  }
  return out;
}

export function explore(start = initial()) {
  const seen = new Map();
  const queue = [clone(start)];
  seen.set(key(start), clone(start));
  while (queue.length) {
    const state = queue.shift();
    for (const edge of successors(state)) {
      const id = key(edge.state);
      if (seen.has(id)) continue;
      seen.set(id, clone(edge.state));
      queue.push(edge.state);
    }
  }
  return [...seen.values()];
}

/** Same sentences as spec/view.mjs `state()`. One label per reachable model state. */
export function chartState(v) {
  const place = v.place;
  const vessel = v.vessel;
  const day = v.day;
  const left = v.left;
  if (place === "vine") return "on the vine";
  if (place === "basket") return "in the basket";
  if (place === "must") return "crushed and destemmed";
  if (place === "ferment" && day === 0) return "ferment just started";
  if (place === "ferment" && day < FermentDays) return "still fermenting";
  if (place === "ferment") return "fermentation finished";
  if (place === "pressed") return "pressed, choose a vessel";
  if (place === "cellar" && vessel === "oak") return "aging in oak";
  if (place === "cellar" && vessel === "steel") return "aging in steel";
  const wood = vessel === "oak" ? "oak" : "steel";
  if (place === "bottled" && left > 1) return `${wood}, bottles left`;
  if (place === "bottled") return `${wood}, last bottle`;
  if (place === "glass") return `${wood}, in the glass`;
  return "on the vine";
}

export function chartGroup(v) {
  if (v.place === "vine" || v.place === "basket") return "Vineyard";
  if (v.place === "must") return "Crush";
  if (v.place === "ferment") return "Ferment";
  if (v.place === "pressed") return "Press";
  if (v.vessel === "oak") return "Oak";
  if (v.vessel === "steel") return "Steel";
  return "Press";
}

/** Arrow words for the statechart view. Null hides the end stutter (same label). */
export function chartStep(action, _from, to) {
  if (action === "TheBottleIsFinished") return null;
  if (action === "ADayPasses") {
    return to.day === FermentDays ? "a day passes [fermentation ends]" : "a day passes";
  }
  if (action === "YouPour") {
    return to.place === "glass" ? "you pour the last glass" : "you pour a glass";
  }
  switch (action) {
    case "YouSnip":
      return "you snip the bunches";
    case "YouCrush":
      return "you crush and destem";
    case "YouSealTheVat":
      return "you seal the vat";
    case "YouPress":
      return "you press the skins";
    case "YouRackIntoOak":
      return "you rack into oak [if you like barrel]";
    case "YouRackIntoSteel":
      return "you rack into steel [if you like tank]";
    case "YouBottle":
      return "you bottle the lot";
    default:
      return null;
  }
}

export function invariantErrors(state) {
  const errors = [];
  const typeOK =
    PLACES.includes(state.place) &&
    VESSELS.includes(state.vessel) &&
    Number.isInteger(state.day) &&
    state.day >= 0 &&
    state.day <= FermentDays &&
    Number.isInteger(state.left) &&
    state.left >= 0 &&
    state.left <= BottleCount &&
    typeof state.bottledOnce === "boolean";
  if (!typeOK) errors.push("TypeOK");

  if ((state.place === "bottled" || state.place === "glass") && state.day !== FermentDays) {
    errors.push("NoBottleBeforeFerment");
  }
  if (state.place === "bottled" && !(state.left > 0)) errors.push("NoServeEmpty");
  if (state.place === "glass" && state.left !== 0) errors.push("NoServeEmpty");
  if (state.place !== "bottled" && state.place !== "glass" && state.left !== 0) errors.push("NoServeEmpty");

  if (state.bottledOnce && state.place !== "bottled" && state.place !== "glass") {
    errors.push("NoCrushAfterBottle");
  }
  if (AFTER_PRESS.has(state.place) && state.day !== FermentDays) errors.push("FermentBeforePress");

  if (EARLY.has(state.place) && state.vessel !== "none") errors.push("OneVessel");
  if (CELLAR_ON.has(state.place) && state.vessel !== "oak" && state.vessel !== "steel") {
    errors.push("OneVessel");
  }
  return errors;
}

export const HAPPY_OAK = [
  "YouSnip",
  "YouCrush",
  "YouSealTheVat",
  "ADayPasses",
  "ADayPasses",
  "YouPress",
  "YouRackIntoOak",
  "YouBottle",
  "YouPour",
  "YouPour",
];

export const HAPPY_STEEL = [
  "YouSnip",
  "YouCrush",
  "YouSealTheVat",
  "ADayPasses",
  "ADayPasses",
  "YouPress",
  "YouRackIntoSteel",
  "YouBottle",
  "YouPour",
  "YouPour",
];
