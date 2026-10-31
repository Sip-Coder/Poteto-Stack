# One lot, from vine to glass

A small wine-production example for [Sip Studies](https://github.com/Sip-Coder): the same cellar, drawn two ways.

- A **TLA+ model** of one lot of red wine, checked with TLC and drawn as a Mermaid statechart in the style of Lauren Tan’s [pstack `/statechart`](https://github.com/cursor/plugins/tree/main/pstack/skills/statechart).
- A **drawn wine journal** you can click: harvest, crush, ferment, the oak-or-steel fork, bottle, taste. Original flat illustrations use Kevin Ngo's dry-media drawing kit, with pencil and pastel on textured paper. Illegal clicks are refused.

This is a test example, not a cellar-management product.

## Open the demo

**Live:** [sip-coder.github.io/Poteto-Stack/demo/](https://sip-coder.github.io/Poteto-Stack/demo/)

The page is a module, so open it from a local server (a `file://` URL will not load the state machine).

```sh
python3 -m http.server 8080
```

Then visit [http://localhost:8080/demo/](http://localhost:8080/demo/).

Follow the lot through four paper chapters: vineyard, fermentation, cellar, and table. Click the illustrated equipment or its labelled action. The golden thread follows the lot's completed steps. Oak and steel are a fork: once you rack the wine, the other vessel dims and will not take the lot. A refused action leaves the wine where it is and draws a red refusal note.

Each labelled action always performs exactly the action it names. Bottling again cannot silently pour a glass. State changes happen immediately; illustration motion never delays or substitutes a wine action. Reset starts a new lot and cancels an autoplay tour. The animation respects `prefers-reduced-motion`.

`?play=oak` and `?play=steel` walk the happy path on their own. With reduced motion enabled, a tour starts only from its explicit button.

GitHub Pages publishes `/demo/` from the root of `main`. A normal push to `main` updates the phone preview after Pages finishes building.

## How this was drawn

The model and drawing remain separate. `spec/Wine.tla`, its configuration, the shared reader-facing view, and the JavaScript machine supply the wine rules. The existing TLC report and Mermaid chart are preserved. The responsive journal has an authored layout; this redraw does not claim a new pele layout or TLC run.

[`art/render-wine.cjs`](art/render-wine.cjs) draws original vineyard and winery equipment from deterministic coordinates. Kevin Ngo's vendored kit simulates hot-press paper tooth, coloured-pencil deposits, fine pen strokes, and Hershey lettering at eight pixels per millimetre. Masks cut the drawings out as transparent 720 × 600 PNGs, so they sit naturally on the journal's paper. A shared 512 × 512 paper-grain texture supplies the background tooth.

Rebuild the nine illustrations, five state variants, and paper grain with Node 24:

```sh
npm ci
npm run art
```

To redraw one illustration, use `node art/render-wine.cjs oak` (or `vine`, `basket`, `crusher`, `vat`, `press`, `steel`, `bottles`, `glass`). State variants include a harvested vine, sealed vat, one or no full bottles, and an empty glass. Outputs are committed under [`demo/assets/`](demo/assets/), so Pages needs no build-time image renderer. Kevin Sans regular and bold are served locally as WOFF2 files.

The reused kit, drawing helpers, and font sources are in [`art/vendor/statechart-art/`](art/vendor/statechart-art/), taken from Kevin's [`292f54c`](https://github.com/kevintngo/statechart-art/commit/292f54c51bf0b728c49f97670f813f77d2422693). Its [MIT license](art/vendor/statechart-art/LICENSE) is preserved. The coloured paper, gold active threads, red refusal threads, and illustration motion live in the browser layer; they never change the model's guards.

## What a click does

The page and the spec share one story. `src/wine-machine.mjs` is the JavaScript copy of `spec/Wine.tla`. Reader-facing words live in `chartState` / `chartStep` and are what `spec/view.mjs` gives the statechart tool.

| You click | TLA+ action | Where the lot goes |
| --- | --- | --- |
| snip the bunches | `YouSnip` | on the vine → in the basket |
| crush and destem | `YouCrush` | basket → crushed and destemmed |
| seal the vat | `YouSealTheVat` | must → ferment just started |
| a day passes | `ADayPasses` | one day in the vat, then fermentation finished |
| press the skins | `YouPress` | only after fermentation finishes |
| rack into oak / steel | `YouRackIntoOak` or `YouRackIntoSteel` | one vessel, never both |
| bottle the lot | `YouBottle` | two bottles, only from the cellar |
| pour a glass | `YouPour` | one bottle, then the last glass |
| (end) | `TheBottleIsFinished` | changes nothing, so the glass is not a deadlock |

`FermentDays = 2` and `BottleCount = 2` in `spec/Wine.cfg`. Two days is enough to see “a day passes” and “fermentation ends” as different arrows. Two bottles is enough to pour once and still have wine, then refuse a third pour.

## The rules

TLC checked every reachable state. There are **15 states** and **16 steps**. The chart draws 15 states and 14 arrows. No rule breaks, so there is no bug path.

| Rule | In the reader's words |
| --- | --- |
| `NoBottleBeforeFerment` | You can't bottle before fermentation finishes. |
| `NoServeEmpty` | You can't serve an empty bottle. A bottled lot still has wine left. The glass means the last pour emptied it. |
| `NoCrushAfterBottle` | You can't crush a lot that is already in bottle. |
| `FermentBeforePress` | The press, the cellar, and the bottle come only after fermentation finishes. |
| `OneVessel` | Oak and steel are a fork. One vessel, chosen at racking. |
| `TypeOK` | Place, vessel, day, and bottles stay inside the small sets above. |
| `NoDeadlock` | The poured glass can stutter. That step does not change the label, so the chart hides it (two hidden steps, one per vessel). |

The report the tool wrote is [`spec/report.md`](spec/report.md). The chart is [`spec/chart.mmd`](spec/chart.mmd).

The page refuses the same clicks. Try “bottle the lot” while the grapes are still on the vine: the notice says you can't bottle yet, and the ferment rule lights up. Pour again after the glass is full and it refuses an empty bottle. Crush after bottling and it refuses.

## Tests

```sh
npm test
```

`test/wine-machine.test.mjs` checks that:

- the oak path and the steel path both end in a poured glass
- a pour with wine left stays bottled, and the last pour empties the bottle
- bottling early, pressing early, crushing after the bottle, pouring an empty bottle, and switching vessels are refused and do not change the state
- all 15 reachable states satisfy the same invariants, and every legal step changes the reader-facing label (the end stutter does not)

The test also checks that `spec/Wine.tla` and `spec/Wine.cfg` name the same actions, invariants, and constants.

`test/demo.test.mjs` runs the page in Happy DOM and checks both UI paths, exact bottle/pour button semantics, refused moves, rapid repeat clicks, reset, autoplay cancellation, and reduced-motion behavior. These interaction checks supplement visual checks on the rendered page; they do not simulate a phone's graphics engine.

The `Wine checks` GitHub Actions workflow runs `npm ci` and `npm test` on pushes to `main` and pull requests targeting it, using Node 24.

## Run TLC again

[TLA+ tools](https://github.com/tlaplus/tlaplus/releases) `tla2tools.jar` from 1.7 or later, and Java 11 or later:

```sh
TLA2TOOLS=/path/to/tla2tools.jar npm run check:tla
```

To redraw the chart, use pstack’s statechart script (Node 22 or later, so it can run the TypeScript). Work in a new output folder. The view module imports the shared labels, so the words stay tied to the JavaScript machine.

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  node --experimental-strip-types \
  /path/to/pstack/skills/statechart/scripts/statechart.ts \
  spec/Wine.tla --view spec/view.mjs --out /tmp/wine-chart-next
```

Copy `chart.mmd` and `report.md` from that folder back into `spec/` if you want the repo to match the new run.

This repo was checked with TLC 2.19 (`tla2tools.jar` 1.7.4) and the statechart script from [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack/skills/statechart) `main`. TLC reported 17 states generated, 15 distinct, depth 11, no error.

## What this leaves out

One lot of red wine only. No white-wine press-before-ferment, no malolactic fermentation, no topping, no blend, no second lot in parallel. Separate crush and press illustrations show two actions in the same model; no new equipment states have been added. Aging does not tick: choosing oak or steel is the whole cellar step.

## Credits

- Statechart method, TLC, and the reader-facing view: Lauren Tan ([@poteto](https://github.com/poteto)), [pstack `/statechart`](https://github.com/cursor/plugins/tree/main/pstack/skills/statechart).
- The original field-notes flow and clickable equipment: April Zhu ([@Aprilzz423](https://x.com/Aprilzz423)), [Colorfigures](https://april-zhu.com/colorfigures) and the "One cup" / metro demos. The page does not ship the Colorfigures engine.
- Dry-media drawing method, kit, and Kevin Sans lettering: Kevin T. Ngo, [statechart-art](https://github.com/kevintngo/statechart-art), especially [One becomes two](https://kevintngo.github.io/statechart-art/one-becomes-two/). Reused code and fonts retain Kevin's MIT license. Wine scenes are original drawings made for this project.
- Wine example and interactive journal: [Sip Studies / Sip-Coder](https://github.com/Sip-Coder).
