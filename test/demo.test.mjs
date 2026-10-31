import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Window } from "happy-dom";
import {
  HAPPY_OAK,
  HAPPY_STEEL,
  chartState,
  initial,
  step,
} from "../src/wine-machine.mjs";

let fixtureNumber = 0;

// Run the real browser module against the real page markup. The clock lets us
// check cancellation without waiting for a tour or coupling rules to animation.
async function page({ query = "", reducedMotion = false } = {}) {
  const window = new Window({
    url: `http://localhost:8080/demo/${query}`,
    width: 390,
    height: 844,
    settings: {
      disableJavaScriptFileLoading: true,
      enableJavaScriptEvaluation: false,
    },
  });
  window.document.write(
    readFileSync(new URL("../demo/index.html", import.meta.url), "utf8"),
  );
  const original = new Map();
  const pending = new Map();
  let time = 0;
  let timerID = 0;
  const schedule = (callback, delay = 0, ...args) => {
    const id = ++timerID;
    pending.set(id, {
      at: time + Number(delay),
      callback: () => callback(...args),
    });
    return id;
  };
  const cancel = (id) => pending.delete(id);
  const media = {
    matches: reducedMotion,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener() {},
    removeEventListener() {},
  };
  window.matchMedia = () => media;
  window.setTimeout = schedule;
  window.clearTimeout = cancel;
  window.requestAnimationFrame = (callback) =>
    schedule(() => callback(time), 16);
  window.cancelAnimationFrame = cancel;
  const globals = {
    window,
    document: window.document,
    location: window.location,
    matchMedia: window.matchMedia,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    setTimeout: schedule,
    clearTimeout: cancel,
    getComputedStyle: window.getComputedStyle.bind(window),
    ResizeObserver: window.ResizeObserver,
    IntersectionObserver: window.IntersectionObserver,
    HTMLElement: window.HTMLElement,
    fetch: async () => ({
      ok: true,
      text: async () =>
        readFileSync(new URL("../spec/chart.mmd", import.meta.url), "utf8"),
    }),
  };
  for (const [name, value] of Object.entries(globals)) {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const cleanup = async () => {
    pending.clear();
    for (const [name, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    await window.happyDOM.close();
  };
  try {
    await import(`../demo/app.mjs?fixture=${++fixtureNumber}`);
  } catch (error) {
    await cleanup();
    throw error;
  }
  return {
    document: window.document,
    text: (selector) =>
      window.document.querySelector(selector)?.textContent.trim(),
    click(selector) {
      const button = window.document.querySelector(selector);
      assert.ok(button, `Missing control: ${selector}`);
      assert.equal(
        button.tagName,
        "BUTTON",
        `Control must have native keyboard semantics: ${selector}`,
      );
      button.click();
    },
    action(action) {
      this.click(`[data-act="${action}"]`);
    },
    walk(actions) {
      for (const action of actions) this.action(action);
    },
    advance(milliseconds) {
      const end = time + milliseconds;
      let iterations = 0;
      while (true) {
        const next = [...pending.entries()].sort(
          (a, b) => a[1].at - b[1].at,
        )[0];
        if (!next || next[1].at > end) break;
        assert.ok(++iterations < 10000, "Timer loop did not settle");
        time = next[1].at;
        pending.delete(next[0]);
        next[1].callback();
      }
      time = end;
    },
    cleanup,
  };
}

test("the clickable page follows both complete wine paths without animation delays", async () => {
  for (const actions of [HAPPY_OAK, HAPPY_STEEL]) {
    const ui = await page();
    try {
      let state = initial();
      assert.equal(ui.text("#now"), chartState(state));
      for (const action of actions) {
        ui.action(action);
        state = step(state, action).state;
        assert.equal(ui.text("#now"), chartState(state), action);
      }
    } finally {
      await ui.cleanup();
    }
  }
});

test("explicit bottle and pour controls keep their advertised action", async () => {
  const ui = await page();
  try {
    // Exercise every copy, including secondary controls and illustration
    // hotspots. The old page silently turned these into contextual actions.
    for (const button of ui.document.querySelectorAll('[data-act="YouPour"]')) {
      ui.click("#reset");
      ui.walk(HAPPY_OAK.slice(0, 7));
      assert.equal(ui.text("#now"), "aging in oak");
      button.click();
      assert.equal(ui.text("#now"), "aging in oak");
      assert.match(ui.text("#notice"), /[Bb]ottle.*before.*pour/);
    }
    for (const button of ui.document.querySelectorAll(
      '[data-act="YouBottle"]',
    )) {
      ui.click("#reset");
      ui.walk(HAPPY_OAK.slice(0, 8));
      assert.equal(ui.text("#now"), "oak, bottles left");
      button.click();
      assert.equal(ui.text("#now"), "oak, bottles left");
      assert.match(ui.text("#notice"), /already bottled/);
    }
  } finally {
    await ui.cleanup();
  }
});

test("early bottle, early press, vessel switching, late crush and empty pour visibly refuse", async () => {
  const ui = await page();
  try {
    ui.action("YouBottle");
    assert.equal(ui.text("#now"), "on the vine");
    assert.match(
      ui.text("#notice"),
      /can't bottle before fermentation finishes/,
    );
    ui.walk(HAPPY_OAK.slice(0, 4));
    ui.action("YouPress");
    assert.equal(ui.text("#now"), "still fermenting");
    assert.match(ui.text("#notice"), /fermentation finish/);
    ui.walk(HAPPY_OAK.slice(4, 7));
    ui.action("YouRackIntoSteel");
    assert.equal(ui.text("#now"), "aging in oak");
    assert.match(ui.text("#notice"), /already in oak/);
    ui.action("YouBottle");
    ui.action("YouCrush");
    assert.equal(ui.text("#now"), "oak, bottles left");
    assert.match(ui.text("#notice"), /already in bottle/);
    ui.walk(["YouPour", "YouPour", "YouPour"]);
    assert.equal(ui.text("#now"), "oak, in the glass");
    assert.match(ui.text("#notice"), /can't serve an empty bottle/);
  } finally {
    await ui.cleanup();
  }
});

test("rapid repeated clicks preserve the rules, and reset wins over pending animation", async () => {
  const ui = await page();
  try {
    ui.walk(["YouSnip", "YouSnip"]);
    assert.equal(ui.text("#now"), "in the basket");
    ui.click("#reset");
    assert.equal(ui.text("#now"), "on the vine");
    ui.advance(10000);
    assert.equal(ui.text("#now"), "on the vine");
    ui.walk(HAPPY_STEEL.slice(0, 3));
    ui.walk(["ADayPasses", "ADayPasses", "ADayPasses"]);
    assert.equal(ui.text("#now"), "fermentation finished");
  } finally {
    await ui.cleanup();
  }
});

test("the phone action control pauses for an explicit vessel choice", async () => {
  const ui = await page();
  try {
    for (let i = 0; i < 6; i++) ui.click("#next-action");
    assert.equal(ui.text("#now"), "pressed, choose a vessel");
    assert.match(ui.text("#next-action"), /choose oak or steel/);
    ui.click("#next-action");
    assert.equal(ui.text("#now"), "pressed, choose a vessel");
    ui.action("YouRackIntoSteel");
    for (let i = 0; i < 3; i++) ui.click("#next-action");
    assert.equal(ui.text("#now"), "steel, in the glass");
    assert.equal(ui.document.querySelector("#next-action").disabled, true);
  } finally {
    await ui.cleanup();
  }
});

test("reset and manual actions cancel a running tour", async () => {
  const ui = await page();
  try {
    ui.click("#play-oak");
    ui.advance(1500);
    ui.click("#reset");
    ui.advance(20000);
    assert.equal(ui.text("#now"), "on the vine");
    ui.click("#play-steel");
    ui.action("YouBottle");
    const stopped = ui.text("#now");
    ui.advance(20000);
    assert.equal(ui.text("#now"), stopped);
  } finally {
    await ui.cleanup();
  }
});

test("reduced motion preserves immediate interaction and does not auto-play from the URL", async () => {
  const ui = await page({ query: "?play=oak", reducedMotion: true });
  try {
    ui.advance(20000);
    assert.equal(ui.text("#now"), "on the vine");
    ui.walk(HAPPY_OAK);
    assert.equal(ui.text("#now"), "oak, in the glass");
  } finally {
    await ui.cleanup();
  }
});
