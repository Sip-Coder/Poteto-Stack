/**
 * Reader-facing labels for pstack /statechart.
 * Words come from src/wine-machine.mjs so the chart, the tests, and the page match.
 *
 * TheBottleIsFinished stays in "oak, in the glass" or "steel, in the glass",
 * so chartStep returns null and the chart hides that stutter.
 */
import { chartGroup, chartState, chartStep } from "../src/wine-machine.mjs";

export const title = "One bottle";

export const colors = {
  Vineyard: "tan",
  Crush: "orange",
  Ferment: "pink",
  Press: "yellow",
  Oak: "teal",
  Steel: "blue",
};

export const state = chartState;
export const step = chartStep;
export const group = chartGroup;
