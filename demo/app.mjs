import {
  initial,
  step,
  guard,
  chartState,
  FermentDays,
  BottleCount,
  HAPPY_OAK,
  HAPPY_STEEL,
  ACTION_NAMES,
} from "../src/wine-machine.mjs";

let state = initial();
let tourTimer, noticeTimer;
let tourGeneration = 0;
const $ = (id) => document.getElementById(id);
const labels = {
  YouSnip: "snip the bunches",
  YouCrush: "crush and destem",
  YouSealTheVat: "seal the vat",
  ADayPasses: "a day passes",
  YouPress: "press the skins",
  YouRackIntoOak: "rack into oak",
  YouRackIntoSteel: "rack into steel",
  YouBottle: "bottle the lot",
  YouPour: "pour a glass",
};
const motion = {
  YouSnip: "snip",
  YouCrush: "crush",
  YouSealTheVat: "seal",
  ADayPasses: "day",
  YouPress: "press",
  YouRackIntoOak: "rack",
  YouRackIntoSteel: "rack",
  YouBottle: "bottle",
  YouPour: "pour",
};
const order = [
  "vine",
  "basket",
  "must",
  "ferment",
  "pressed",
  "cellar",
  "bottled",
  "glass",
];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function nextAction() {
  if (state.place === "pressed") return null;
  return Object.keys(labels).find((action) => guard(state, action));
}

function paint() {
  $("now").textContent = chartState(state);
  document.body.dataset.place = state.place;
  document.body.classList.toggle(
    "is-fermenting",
    state.place === "ferment" && state.day < FermentDays,
  );
  const rank = order.indexOf(state.place);
  for (const chapter of document.querySelectorAll(".chapter")) {
    const phases = chapter.dataset.phase.split(" ");
    const first = order.indexOf(phases[0]),
      last = order.indexOf(phases.at(-1));
    chapter.classList.toggle("is-current", phases.includes(state.place));
    let progress =
      rank < first
        ? 0
        : rank > last
          ? 100
          : ((rank - first + 0.5) / (last - first + 1)) * 100;
    if (chapter.id === "winery" && state.place === "ferment")
      progress = 42 + state.day * 14;
    if (state.place === "glass") progress = 100;
    chapter.style.setProperty("--thread-progress", `${progress}%`);
  }
  for (const ticket of document.querySelectorAll("[data-state]")) {
    const place = ticket.dataset.state,
      vessel = place === "oak" || place === "steel";
    ticket.classList.toggle(
      "active",
      vessel
        ? state.place === "cellar" && state.vessel === place
        : state.place === place,
    );
    ticket.classList.toggle(
      "done",
      vessel ? state.vessel === place && rank > 5 : order.indexOf(place) < rank,
    );
    ticket.classList.toggle(
      "dim",
      vessel && state.vessel !== "none" && state.vessel !== place,
    );
  }
  for (const button of document.querySelectorAll("[data-act]")) {
    const available = guard(state, button.dataset.act);
    button.classList.toggle("next", available);
    // Invalid actions stay clickable: the model explains why it refuses them.
    button.dataset.available = String(available);
  }
  for (const vessel of document.querySelectorAll("[data-vessel]")) {
    vessel.classList.toggle("selected", state.vessel === vessel.dataset.vessel);
    vessel.classList.toggle(
      "dim",
      state.vessel !== "none" && state.vessel !== vessel.dataset.vessel,
    );
  }
  $("cellar").dataset.chosen = state.vessel;
  $("ferment-detail").textContent =
    state.place === "ferment"
      ? state.day === FermentDays
        ? "Fermentation finished. Ready to press."
        : `Day ${state.day} of ${FermentDays}. Let the yeast work.`
      : rank > 3
        ? "Fermentation finished. The wine moved on."
        : "Two model days. Let the yeast work.";
  $("n-ferment").textContent =
    state.day === FermentDays ? "fermentation finished" : "fermenting";
  for (const mark of document.querySelectorAll("[data-day]"))
    mark.classList.toggle("passed", state.day >= Number(mark.dataset.day));
  $("vessel-detail").textContent =
    state.vessel === "none"
      ? "Pick a path after pressing. Once racked, this lot stays put."
      : `This lot chose ${state.vessel}. The other path stays a possibility.`;
  $("bottle-detail").textContent = state.bottledOnce
    ? state.left
      ? `${state.left} of ${BottleCount} bottles left.`
      : "Both bottles are empty."
    : "Two bottles, waiting for the lot.";
  const poured = state.bottledOnce && state.left < BottleCount;
  const vine = document.querySelector('.art-button[data-act="YouSnip"] img');
  vine.src = `./assets/${state.place === "vine" ? "vine" : "vine-harvested"}.png`;
  vine.alt =
    state.place === "vine"
      ? "A pencil grapevine with ripe bunches and an empty basket"
      : "The harvested bunches gathered in a woven basket beneath the vine";
  const vat = document.querySelector(
    '.art-button[data-act="YouSealTheVat"] img',
  );
  vat.src = `./assets/${rank >= 3 ? "vat-sealed" : "vat"}.png`;
  vat.alt =
    rank >= 3
      ? "The fermentation vat with its lid sealed"
      : "An open fermentation vat, waiting for must";
  const bottles = document.querySelector(
    '.art-button[data-act="YouBottle"] img',
  );
  const bottleSprite =
    !state.bottledOnce || state.left === 0
      ? "bottles-empty"
      : state.left === 1
        ? "bottles-one"
        : "bottles";
  bottles.src = `./assets/${bottleSprite}.png`;
  bottles.alt = state.bottledOnce
    ? `${state.left} full bottles remain from this lot`
    : "Two empty bottles, waiting to be filled";
  const glass = document.querySelector('.art-button[data-act="YouPour"] img');
  glass.src = `./assets/${poured ? "glass" : "glass-empty"}.png`;
  glass.alt = poured
    ? "A tasting glass filled with ruby red wine"
    : "An empty tasting glass";
  $("glass-detail").textContent = poured
    ? `${state.vessel === "oak" ? "Oak" : "Steel"} to glass. ${BottleCount - state.left} bottle${BottleCount - state.left === 1 ? "" : "s"} poured.`
    : "A good ending takes every step.";
  const next = nextAction(),
    button = $("next-action");
  button.disabled = state.place === "glass";
  button.dataset.next = next ?? "";
  button.textContent =
    state.place === "pressed"
      ? "choose oak or steel ↓"
      : state.place === "glass"
        ? "the lot is complete ✓"
        : `${labels[next]} ↓`;
}

function stopTour() {
  clearTimeout(tourTimer);
  tourGeneration++;
  document.body.classList.remove("tour-playing");
}

function clearNotice() {
  clearTimeout(noticeTimer);
  $("notice").classList.remove("show");
  $("notice").textContent = "";
  for (const el of document.querySelectorAll(".hit,.refused"))
    el.classList.remove("hit", "refused");
}

function refuse(result, target) {
  clearNotice();
  $("notice").textContent = result.reason;
  $("notice").classList.add("show");
  target?.classList.remove("shake");
  if (target) {
    void target.offsetWidth;
    target.classList.add("shake");
  }
  target?.closest(".chapter")?.classList.add("refused");
  if (result.rule)
    for (const note of document.querySelectorAll("[data-rule]"))
      note.classList.toggle("hit", note.dataset.rule === result.rule);
  noticeTimer = setTimeout(clearNotice, 5000);
}

function animate(action, target) {
  const elements = target?.classList.contains("art-button")
    ? [target]
    : document.querySelectorAll(`.art-button[data-act="${action}"]`);
  for (const el of elements) {
    for (const name of Object.values(motion))
      el.classList.remove(`action-${name}`);
    void el.offsetWidth;
    el.classList.add(`action-${motion[action]}`);
  }
}

function dispatch(action, target) {
  const result = step(state, action);
  if (!result.ok) {
    refuse(result, target);
    return false;
  }
  clearNotice();
  // Commit immediately. Animation never delays or rewrites a model step.
  state = result.state;
  paint();
  animate(action, target);
  return true;
}

function reset() {
  stopTour();
  clearNotice();
  state = initial();
  for (const el of document.querySelectorAll(".art-button"))
    for (const name of Object.values(motion))
      el.classList.remove(`action-${name}`);
  paint();
}

function scrollToCurrent() {
  const target =
    state.place === "pressed"
      ? $("cellar")
      : state.place === "cellar"
        ? document.querySelector(`[data-vessel="${state.vessel}"]`)
        : state.place === "ferment"
          ? document.querySelector(".vat-scene")
          : state.place === "glass"
            ? document.querySelector('.art-button[data-act="YouPour"]')
            : document.querySelector(`.art-button[data-act="${nextAction()}"]`);
  target?.scrollIntoView({
    block: "center",
    behavior: reducedMotion.matches ? "instant" : "smooth",
  });
}

function play(vessel) {
  reset();
  document.body.classList.add("tour-playing");
  const generation = tourGeneration,
    actions = vessel === "steel" ? HAPPY_STEEL : HAPPY_OAK;
  let index = 0;
  const tick = () => {
    if (generation !== tourGeneration) return;
    if (index >= actions.length) {
      document.body.classList.remove("tour-playing");
      return;
    }
    dispatch(actions[index++]);
    scrollToCurrent();
    tourTimer = setTimeout(tick, 1450);
  };
  tourTimer = setTimeout(tick, 650);
}

document.body.addEventListener("click", (event) => {
  const target = event.target.closest("[data-act]");
  if (!target) return;
  stopTour();
  dispatch(target.dataset.act, target);
});
$("reset").addEventListener("click", reset);
$("next-action").addEventListener("click", () => {
  stopTour();
  const action = nextAction();
  if (action) dispatch(action);
  scrollToCurrent();
});
$("play-oak").addEventListener("click", () => play("oak"));
$("play-steel").addEventListener("click", () => play("steel"));
document.body.addEventListener("animationend", (event) => {
  if (event.target.classList?.contains("illustration")) {
    const el = event.target.closest(".art-button");
    for (const name of Object.values(motion))
      el.classList.remove(`action-${name}`);
  }
});

fetch("../spec/chart.mmd")
  .then((response) => {
    if (!response.ok) throw new Error("chart");
    return response.text();
  })
  .then((text) => {
    $("chart-src").textContent = text.trim();
  })
  .catch(() => {
    $("chart-src").textContent =
      "The formal chart is available in spec/chart.mmd in the repository.";
  });
paint();
const params = new URLSearchParams(location.search),
  trial = params.get("try");
if (trial && ACTION_NAMES.includes(trial))
  dispatch(trial, document.querySelector(`[data-act="${trial}"]`));
const tour = params.get("play");
if ((tour === "oak" || tour === "steel") && !reducedMotion.matches) play(tour);
