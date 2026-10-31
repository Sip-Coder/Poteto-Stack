"use strict";
/**
 * Original wine equipment, drawn as seeded dry-media marks on paper.
 * Kevin T. Ngo's MIT kit supplies paper tooth, pencil, pen and Hershey lettering.
 * No image generator, stock illustration, SVG filter or external font request.
 * Rebuild: npm ci && npm run art (or node art/render-wine.cjs oak).
 */
const fs = require("node:fs");
const path = require("node:path");
const { createCanvas, ImageData } = require("@napi-rs/canvas");
const { plate } = require("./vendor/statechart-art/lib/classic");
const D = require("./vendor/statechart-art/lib/draw");
const M = require("./vendor/statechart-art/lib/mask");
const OUT = path.join(__dirname, "../demo/assets");
const C = {
  ink: "#342f2c",
  pencil: "#62584e",
  soft: "#aa9982",
  cream: "#f5eedc",
  wood: "#c7a273",
  woodLight: "#ddc19a",
  woodDark: "#997049",
  metal: "#a8bfc0",
  metalLight: "#d3dddd",
  metalDark: "#779496",
  grape: "#795066",
  grapeDark: "#543648",
  grapeLight: "#bc8597",
  leaf: "#9aa36c",
  leafDark: "#697b53",
  leafLight: "#c2cb95",
  wine: "#a15061",
  wineDark: "#713a4c",
  rose: "#d5a3a8",
  glass: "#c3d4ce",
  gold: "#c99b39",
  paper: "#f1eadc",
};
const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];
const curve = (p, closed = true) => D.curve(p, closed, 0.45);
function scene(id) {
  const P = plate({
    id: "wine-" + id,
    w: 90,
    h: 75,
    ppm: 8,
    paper: "hotpress",
    seed: "poteto-wine-" + id + "-v2",
  });
  const sil = new Uint8Array(P.S.W * P.S.H);
  const add = (p) => {
    M.addPoly(P.S, sil, p);
    return p;
  };
  const part = (p, color = C.cream, o = {}) => {
    add(p);
    const polys = [p];
    P.paper(polys);
    if (color)
      P.colour(polys, color, {
        pressure: o.pressure ?? 0.73,
        passes: o.passes ?? 2,
        angle: o.angle ?? 28,
      });
    if (o.shade)
      P.hatch(polys, {
        clip: [o.shade],
        angle: o.hatch ?? 65,
        pitch: o.pitch ?? 0.65,
        nib: 0.105,
        color: C.pencil,
      });
    if (o.outline !== false)
      P.outline(polys, { nib: o.nib ?? 0.27, color: C.ink });
    return p;
  };
  const line = (pts, o = {}) =>
    P.ink(pts, { nib: o.nib ?? 0.21, color: o.color ?? C.ink, ...o });
  const arc = (pts, o = {}) => line(curve(pts, false), o);
  const dot = (x, y, r, color) =>
    part(D.ell(x, y, r, r), color, { nib: 0.13, passes: 2 });
  const label = (s, x, y, o = {}) =>
    P.text(s, x, y, {
      face: "sans",
      align: "center",
      size: 2.6,
      color: C.ink,
      ...o,
    });
  const shadow = (x, y, rx, ry = 1.7) =>
    P.hatch([D.ell(x, y, rx, ry)], {
      angle: 8,
      pitch: 0.7,
      nib: 0.1,
      color: C.soft,
    });
  const shade = (p, color, clip) =>
    P.colour([p], color, {
      clip: [clip],
      pressure: 0.55,
      passes: 1,
      angle: 76,
    });
  const scratch = (p, color = C.woodDark, angle = 76, pitch = 0.85) =>
    P.hatch([p], {
      color,
      angle,
      pitch,
      nib: 0.09,
      pencil: true,
      pressure: 0.4,
    });
  return { P, sil, part, line, arc, dot, label, shadow, shade, scratch, add };
}
function leaf(S, x, y, s = 1, rot = 0, col = C.leaf) {
  const T = (p) => D.tf(p, { x, y, s, rot });
  const p = T([
    [0, 0],
    [-4, -3],
    [-6, -1],
    [-6, -5],
    [-9, -6],
    [-6, -8],
    [-7, -11],
    [-3, -10],
    [0, -14],
    [2, -10],
    [7, -10],
    [6, -7],
    [10, -5],
    [6, -3],
    [6, 1],
    [2, -1],
  ]);
  S.part(p, col, { nib: 0.18, pressure: 0.72 });
  S.line(
    T([
      [0, 0],
      [0, -11],
    ]),
    { nib: 0.15, color: C.leafDark },
  );
  for (const p of [
    [-6, -7],
    [-4, -3],
    [5, -6],
    [5, -9],
  ])
    S.line(T([[0, -4], p]), { nib: 0.11, color: C.leafDark });
  return p;
}
function bunch(S, x, y, s = 1) {
  for (const [dx, dy, r] of [
    [-3, 0, 2.9],
    [2, 0, 3.1],
    [-5, 4, 3],
    [0, 4, 3.2],
    [4, 4, 2.8],
    [-3, 8, 2.8],
    [2, 8, 3],
    [-1, 12, 2.7],
    [1, 15, 2.3],
  ]) {
    const p = D.ell(x + dx * s, y + dy * s, r * s, r * 0.97 * s);
    S.part(p, C.grape, { nib: 0.16, pressure: 0.9 });
    S.shade(
      p,
      C.grapeDark,
      rect(x + (dx - 0.7) * s, y + (dy - 3) * s, 5 * s, 6 * s),
    );
    S.arc(
      [
        [x + (dx - 1.5) * s, y + (dy - 0.2) * s],
        [x + (dx - 1.2) * s, y + (dy - 1.5) * s],
        [x + (dx + 0.1) * s, y + (dy - 1.8) * s],
      ],
      { nib: 0.18, color: C.grapeLight },
    );
  }
  S.arc(
    [
      [x, y - 5 * s],
      [x - 1 * s, y - 2 * s],
      [x, y + 1 * s],
    ],
    { nib: 0.4, color: C.woodDark },
  );
}
function basket(S, x, y, s = 1, full = true) {
  const T = (p) => D.tf(p, { x, y, s });
  S.arc(
    T([
      [-12, -7],
      [-10, -19],
      [0, -22],
      [10, -19],
      [12, -7],
    ]),
    { nib: 0.6, color: C.woodDark },
  );
  S.arc(
    T([
      [-11, -7],
      [-9, -18],
      [0, -20],
      [9, -18],
      [11, -7],
    ]),
    { nib: 0.2 },
  );
  const body = T([
    [-15, -11],
    [15, -11],
    [11, 8],
    [-11, 8],
  ]);
  S.part(body, C.woodLight, {
    nib: 0.25,
    shade: T([
      [4, -12],
      [16, -12],
      [12, 9],
      [4, 9],
    ]),
    hatch: 75,
  });
  for (let dy = -9; dy < 7; dy += 2.4)
    S.line(
      T([
        [-13 + (dy + 9) * 0.15, dy],
        [13 - (dy + 9) * 0.15, dy],
      ]),
      { nib: 0.14, color: C.woodDark },
    );
  for (let dx = -10; dx < 12; dx += 2.8)
    S.arc(
      T([
        [dx, -10],
        [dx * 0.84, -2],
        [dx * 0.76, 7],
      ]),
      { nib: 0.12, color: C.woodDark },
    );
  S.part(T(D.ell(0, -11, 15, 2.5)), C.wood, { nib: 0.2, pressure: 0.6 });
  if (full) {
    bunch(S, x - 4 * s, y - 14 * s, 0.55 * s);
    bunch(S, x + 5 * s, y - 14 * s, 0.5 * s);
    leaf(S, x + 3 * s, y - 12 * s, 0.55 * s, 0.6);
  }
}
function vine(S, harvested = false) {
  S.shadow(46, 66, 31);
  // trellis and old cordon: irregular woody lines instead of a geometric icon.
  S.part(
    curve([
      [20, 63],
      [19, 34],
      [18, 15],
      [21, 12],
      [23, 15],
      [24, 61],
    ]),
    C.woodLight,
    { nib: 0.25, pressure: 0.55 },
  );
  S.line(
    [
      [14, 25],
      [76, 25],
    ],
    { nib: 0.16, color: C.soft },
  );
  S.line(
    [
      [14, 43],
      [77, 43],
    ],
    { nib: 0.13, color: C.soft },
  );
  const stem = curve([
    [27, 64],
    [29, 45],
    [28, 31],
    [31, 20],
    [40, 15],
    [52, 16],
    [64, 11],
    [67, 12],
    [56, 20],
    [43, 20],
    [35, 25],
    [34, 43],
    [32, 65],
  ]);
  S.part(stem, C.woodDark, { nib: 0.24, pressure: 0.9 });
  S.arc(
    [
      [29, 61],
      [32, 45],
      [31, 31],
      [36, 22],
      [48, 18],
      [57, 18],
    ],
    { nib: 0.21, color: C.cream },
  );
  for (const [x, y, a, s] of [
    [39, 20, -0.6, 1.0],
    [54, 21, 0.7, 0.9],
    [68, 16, 0.4, 0.9],
    [37, 35, -0.8, 0.8],
    [52, 34, 0.6, 0.8],
  ])
    leaf(S, x, y, s, a);
  S.arc(
    [
      [39, 20],
      [45, 24],
      [48, 31],
    ],
    { nib: 0.35, color: C.leafDark },
  );
  S.arc(
    [
      [57, 18],
      [61, 25],
      [60, 30],
    ],
    { nib: 0.35, color: C.leafDark },
  );
  if (!harvested) {
    bunch(S, 46, 32, 0.9);
    bunch(S, 61, 29, 0.83);
  }
  S.arc(
    [
      [70, 13],
      [74, 10],
      [78, 11],
      [79, 14],
      [76, 16],
      [73, 14],
      [75, 13],
    ],
    { nib: 0.15, color: C.leafDark },
  );
  basket(S, 61, 57, 0.72, harvested);
  S.line(
    [
      [16, 66],
      [36, 66],
    ],
    { nib: 0.15, color: C.soft },
  );
}
function crusher(S) {
  S.shadow(45, 66, 29);
  // enamel frame, a visible pair of fluted rollers, and an honest hand crank.
  for (const x of [25, 60]) S.part(rect(x, 37, 3, 26), C.metal, { nib: 0.24 });
  S.line(
    [
      [23, 64],
      [30, 64],
    ],
    { nib: 0.35 },
  );
  S.line(
    [
      [58, 64],
      [65, 64],
    ],
    { nib: 0.35 },
  );
  S.part(rect(21, 38, 47, 4), C.metalDark, { nib: 0.25 });
  S.part(
    [
      [22, 23],
      [66, 23],
      [58, 40],
      [30, 40],
    ],
    C.metal,
    {
      nib: 0.29,
      shade: [
        [53, 23],
        [67, 23],
        [58, 41],
        [50, 41],
      ],
    },
  );
  S.part(D.ell(44, 23, 23, 4), C.metalLight, { nib: 0.25 });
  S.part(D.ell(44, 23, 18, 2.4), C.wineDark, { nib: 0.16 });
  bunch(S, 41, 14, 0.62);
  bunch(S, 50, 15, 0.55);
  leaf(S, 37, 14, 0.6, -0.5);
  S.part(rect(29, 36, 30, 8), C.cream, { nib: 0.2 });
  for (let x = 30; x <= 58; x += 2)
    S.line(
      [
        [x, 37],
        [x + 1, 43],
      ],
      { nib: 0.25, color: C.metalDark },
    );
  S.part(D.ell(68, 37, 7, 7), C.woodLight, { nib: 0.29 });
  S.part(D.ell(68, 37, 5.3, 5.3), C.metal, { nib: 0.2 });
  S.line(
    [
      [68, 37],
      [78, 38],
      [78, 32],
    ],
    { nib: 0.65 },
  );
  S.part(D.rrect(75.8, 28, 80.2, 34, 1.5), C.woodDark, { nib: 0.19 });
  const bucket = [
    [34, 49],
    [54, 49],
    [52, 63],
    [37, 63],
  ];
  S.part(bucket, C.woodLight, { nib: 0.25 });
  for (let x = 38; x < 53; x += 3)
    S.line(
      [
        [x, 50],
        [x + 0.4, 62],
      ],
      { nib: 0.14, color: C.woodDark },
    );
  S.part(D.ell(44, 49, 10, 2.3), C.wine, { nib: 0.23 });
  S.line(
    [
      [35, 53],
      [53, 53],
    ],
    { nib: 0.5, color: C.metalDark },
  );
  S.line(
    [
      [36, 60],
      [52, 60],
    ],
    { nib: 0.5, color: C.metalDark },
  );
  for (const [x, y] of [
    [40, 45],
    [46, 46],
    [49, 44],
  ])
    S.dot(x, y, 0.7, C.wine);
  S.label("DESTEM", 44, 32, { size: 2.2, color: C.cream });
}
function vat(S, sealed = false) {
  S.shadow(45, 66, 26);
  S.part(rect(26, 54, 4, 10), C.woodDark, { nib: 0.22 });
  S.part(rect(60, 54, 4, 10), C.woodDark, { nib: 0.22 });
  const body = curve([
    [24, 24],
    [66, 24],
    [63, 59],
    [59, 62],
    [31, 62],
    [27, 59],
  ]);
  S.part(body, C.woodLight, {
    nib: 0.29,
    shade: [
      [54, 22],
      [69, 22],
      [64, 63],
      [54, 63],
    ],
    hatch: 85,
  });
  for (let x = 29; x < 64; x += 5.8)
    S.arc(
      [
        [x, 25],
        [x + (45 - x) * 0.03, 44],
        [x + (45 - x) * 0.13, 60],
      ],
      { nib: 0.14, color: C.woodDark },
    );
  for (const y of [31, 53])
    S.part(
      [
        [25 + (y - 25) * 0.08, y],
        [65 - (y - 25) * 0.08, y],
        [65 - (y - 25) * 0.08, y + 3.3],
        [25 + (y - 25) * 0.08, y + 3.3],
      ],
      C.metalDark,
      { nib: 0.22, pressure: 0.75 },
    );
  S.part(D.ell(45, 24, 21, 4.5), C.wood, { nib: 0.29 });
  S.part(D.ell(45, 23.5, 18.2, 2.7), C.wineDark, { nib: 0.19 });
  for (const [x, y, r] of [
    [32, 23, 1.4],
    [39, 22, 1.9],
    [47, 24, 1.4],
    [54, 22, 1.7],
    [59, 24, 0.9],
  ])
    S.dot(x, y, r, C.rose);
  if (sealed) {
    S.part(D.ell(45, 22, 22, 4.5), C.woodLight, { nib: 0.26 });
    for (let x = 29; x < 65; x += 6)
      S.line(
        [
          [x, 20.5],
          [x + 0.7, 23.8],
        ],
        { nib: 0.13, color: C.woodDark },
      );
    S.part(D.rrect(41, 17, 49, 21, 0.7), C.woodDark, { nib: 0.2 });
  } else {
    S.part(
      [
        [22, 17],
        [64, 17],
        [69, 20],
        [27, 21],
      ],
      C.woodLight,
      { nib: 0.25 },
    );
    for (let x = 29; x < 65; x += 7)
      S.line(
        [
          [x, 17.5],
          [x + 2, 20],
        ],
        { nib: 0.13, color: C.woodDark },
      );
    S.part(D.rrect(43, 13.7, 51, 17.5, 0.7), C.woodDark, { nib: 0.2 });
  }
  S.part(D.rrect(33, 37, 57, 48, 0.7), C.cream, { nib: 0.18 });
  S.label("LOT 01", 45, 41.5, { size: 2.7 });
  S.label("RED / 2 DAYS", 45, 45.5, { size: 1.7, color: C.wineDark });
  for (const [x, y, r] of [
    [35, 15, 1.7],
    [52, 9, 1.2],
    [44, 7, 2],
    [38, 4, 0.8],
  ]) {
    S.P.outline([D.ell(x, y, r, r)], { nib: 0.18, color: C.wine });
    S.arc(
      [
        [x - 0.6, y],
        [x - 0.5, y - 0.7],
        [x + 0.2, y - 0.8],
      ],
      { nib: 0.12, color: C.rose },
    );
  }
}
function press(S) {
  S.shadow(45, 67, 27);
  // Timber basket press in flat elevation, central screw and juice collecting pan.
  S.part(rect(22, 16, 5, 49), C.woodDark, { nib: 0.28 });
  S.part(rect(63, 16, 5, 49), C.woodDark, { nib: 0.28 });
  S.part(rect(19, 14, 52, 6), C.woodLight, { nib: 0.3 });
  S.scratch(rect(20, 15, 49, 3), C.woodDark, 4, 0.8);
  S.part(rect(42, 9, 5, 31), C.metal, { nib: 0.23 });
  for (let y = 10; y < 39; y += 1.6)
    S.line(
      [
        [42, y],
        [47, y + 1.1],
      ],
      { nib: 0.15, color: C.metalDark },
    );
  S.part(rect(33, 6, 24, 3), C.woodDark, { nib: 0.25 });
  S.dot(35, 7.5, 1.8, C.woodLight);
  S.dot(55, 7.5, 1.8, C.woodLight);
  const body = [
    [28, 36],
    [61, 36],
    [59, 57],
    [31, 57],
  ];
  S.part(body, C.woodLight, {
    nib: 0.28,
    shade: [
      [51, 35],
      [62, 35],
      [60, 59],
      [51, 59],
    ],
    hatch: 87,
  });
  for (let x = 31; x < 60; x += 3.4)
    S.line(
      [
        [x, 37],
        [x + (45 - x) * 0.1, 56],
      ],
      { nib: 0.19, color: C.woodDark },
    );
  S.part(D.ell(44.5, 36, 16.5, 3), C.wood, { nib: 0.25 });
  S.part(D.ell(44.5, 33.8, 14, 2.3), C.woodLight, { nib: 0.22 });
  for (const y of [42, 52])
    S.part(
      rect(29 + (y - 40) * 0.12, y, 31 - (y - 40) * 0.24, 2),
      C.metalDark,
      { nib: 0.19 },
    );
  S.part(
    [
      [26, 57],
      [64, 57],
      [67, 61],
      [23, 61],
    ],
    C.metalLight,
    { nib: 0.25 },
  );
  S.part(rect(41, 60, 6, 4), C.metal, { nib: 0.21 });
  S.part(D.ell(44, 67, 10, 2.2), C.wine, { nib: 0.22 });
  S.line(
    [
      [44, 63],
      [44, 66],
    ],
    { nib: 0.45, color: C.wineDark },
  );
  S.line(
    [
      [20, 65],
      [29, 65],
    ],
    { nib: 0.3 },
  );
  S.line(
    [
      [61, 65],
      [71, 65],
    ],
    { nib: 0.3 },
  );
  for (const [x, y] of [
    [24.5, 18],
    [65.5, 18],
    [24.5, 59],
    [65.5, 59],
  ])
    S.dot(x, y, 0.65, C.metalDark);
}
function oak(S) {
  S.shadow(45, 66, 27);
  S.part(
    [
      [23, 62],
      [27, 56],
      [63, 56],
      [67, 62],
    ],
    C.woodDark,
    { nib: 0.25 },
  );
  const body = curve([
    [27, 19],
    [45, 15],
    [63, 19],
    [67, 31],
    [68, 43],
    [64, 57],
    [46, 61],
    [27, 57],
    [23, 43],
    [23, 31],
  ]);
  S.part(body, C.woodLight, {
    nib: 0.29,
    shade: [
      [54, 15],
      [71, 15],
      [71, 62],
      [54, 62],
    ],
    hatch: 84,
  });
  for (let dx = -14; dx <= 15; dx += 4.8) {
    S.arc(
      [
        [45 + dx * 0.83, 18],
        [45 + dx * 1.3, 31],
        [45 + dx * 1.35, 43],
        [45 + dx * 0.95, 58],
      ],
      { nib: 0.18, color: C.woodDark },
    );
    S.arc(
      [
        [45 + dx * 0.83 + 1, 21],
        [45 + dx * 1.3 + 1, 34],
        [45 + dx * 1.2 + 1, 48],
        [45 + dx * 0.92 + 1, 55],
      ],
      { nib: 0.08, color: C.woodDark },
    );
  }
  for (const y of [25, 49]) {
    const x = y === 25 ? 24 : 24.5;
    S.part(
      curve([
        [x, y],
        [45, y + 2],
        [66, y],
        [66.6, y + 4],
        [45, y + 6],
        [x - 0.3, y + 4],
      ]),
      C.metalDark,
      { nib: 0.22, pressure: 0.65 },
    );
    S.arc(
      [
        [x + 1, y + 1],
        [45, y + 3],
        [65, y + 1],
      ],
      { nib: 0.12, color: C.metalLight },
    );
    for (const xx of [30, 60]) S.dot(xx, y + 3.7, 0.4, C.ink);
  }
  S.part(D.ell(45, 18.5, 18, 4.4), C.wood, { nib: 0.26 });
  S.P.outline([D.ell(45, 18.5, 15.6, 2.8)], { nib: 0.13, color: C.woodDark });
  for (let x = 34; x < 60; x += 5)
    S.line(
      [
        [x, 16.7],
        [x - 0.3, 20.5],
      ],
      { nib: 0.13, color: C.woodDark },
    );
  S.part(D.ell(45, 18.5, 2, 1.1), C.woodDark, { nib: 0.14 });
  S.label("OAK", 45, 39, { face: "serif-bold", size: 5, color: C.woodDark });
  S.label("LOT 01", 45, 44, { size: 2.1, color: C.woodDark });
  S.arc(
    [
      [39, 54],
      [40, 52],
      [42, 54],
      [40, 56],
      [39, 54],
    ],
    { nib: 0.14, color: C.woodDark },
  );
  S.arc(
    [
      [28, 35],
      [31, 36],
      [30, 40],
      [28, 39],
    ],
    { nib: 0.12, color: C.woodDark },
  );
}
function steel(S) {
  S.shadow(45, 67, 25);
  for (const x of [29, 58])
    S.part(rect(x, 53, 4, 12), C.metalDark, { nib: 0.23 });
  S.part(
    [
      [27, 48],
      [63, 48],
      [55, 58],
      [35, 58],
    ],
    C.metal,
    { nib: 0.25 },
  );
  const body = curve([
    [25, 22],
    [27, 15],
    [45, 11],
    [63, 15],
    [65, 22],
    [65, 49],
    [45, 53],
    [25, 49],
  ]);
  S.part(body, C.metalLight, {
    nib: 0.29,
    shade: [
      [55, 12],
      [67, 12],
      [67, 53],
      [55, 53],
    ],
    hatch: 84,
    pitch: 0.55,
  });
  S.shade(body, C.metal, rect(27, 14, 9, 40));
  S.part(rect(38, 9, 14, 4), C.metalDark, { nib: 0.22 });
  S.part(D.ell(45, 9, 7, 1.7), C.metalLight, { nib: 0.2 });
  S.arc(
    [
      [26, 22],
      [45, 25],
      [64, 22],
    ],
    { nib: 0.16, color: C.metalDark },
  );
  S.arc(
    [
      [26, 47],
      [45, 50],
      [64, 47],
    ],
    { nib: 0.18, color: C.metalDark },
  );
  S.line(
    [
      [33, 23],
      [33, 47],
    ],
    { nib: 0.3, color: C.cream },
  );
  S.line(
    [
      [34, 23],
      [34, 47],
    ],
    { nib: 0.12, color: C.cream },
  );
  S.part(D.ell(45, 36, 7, 9), C.metal, { nib: 0.2 });
  S.part(D.ell(45, 36, 5.2, 7.3), C.metalLight, { nib: 0.18 });
  for (const y of [29.5, 42.5])
    S.line(
      [
        [44, y],
        [46, y],
      ],
      { nib: 0.45, color: C.metalDark },
    );
  S.part(D.ell(60, 30, 3, 3), C.cream, { nib: 0.19 });
  S.line(
    [
      [60, 30],
      [61, 28.5],
    ],
    { nib: 0.17 },
  );
  S.dot(60, 30, 0.35, C.wineDark);
  S.part(rect(43.5, 57, 3, 6), C.metalDark, { nib: 0.2 });
  S.line(
    [
      [45, 61],
      [53, 61],
      [53, 64],
    ],
    { nib: 0.75, color: C.metalDark },
  );
  S.part(rect(40, 56, 10, 1.7), C.wineDark, { nib: 0.17 });
  S.label("STEEL", 45, 20, { size: 2.7, color: C.metalDark });
  for (const y of [26, 32, 38, 44])
    S.line(
      [
        [52, y],
        [54, y],
      ],
      { nib: 0.13, color: C.metalDark },
    );
}
function bottle(S, x, y, s = 1, empty = false) {
  const T = (p) => D.tf(p, { x, y, s });
  const shape = T(
    curve([
      [-3, -45],
      [3, -45],
      [3, -32],
      [6, -28],
      [7, -25],
      [7, -2],
      [5.5, 0],
      [-5.5, 0],
      [-7, -2],
      [-7, -25],
      [-6, -28],
      [-3, -32],
    ]),
  );
  S.part(shape, empty ? "#c6d0b0" : "#72816a", { nib: 0.25, pressure: 0.8 });
  if (!empty) {
    S.shade(shape, C.wineDark, T(rect(0, -31, 7, 31)));
  }
  S.line(
    T([
      [-4.5, -23],
      [-4.5, -4],
    ]),
    { nib: 0.5, color: "#d7d8b3" },
  );
  S.part(T(rect(-3.4, -45.5, 6.8, 8)), C.wineDark, { nib: 0.17 });
  S.part(T(D.rrect(-5.6, -21, 5.6, -9, 0.5)), C.cream, {
    nib: 0.15,
    pressure: 0.45,
  });
  S.label("SIP", x, y - 15.2 * s, { face: "serif-bold", size: 3.2 * s });
  S.label("RED 01", x, y - 11.3 * s, { size: 1.6 * s, color: C.wineDark });
  S.arc(
    T([
      [-4.5, -3],
      [0, -2],
      [4.5, -3],
    ]),
    { nib: 0.15, color: C.ink },
  );
}
function bottles(S, count = 2) {
  S.shadow(45, 66, 28);
  bottle(S, 34, 62, 0.95, count < 1);
  bottle(S, 56, 63, 1.12, count < 2);
  S.part(rect(21, 65, 48, 2), C.woodLight, { nib: 0.17, pressure: 0.4 });
  S.part(D.ell(67, 57, 2.2, 5.2, -0.35), C.woodLight, { nib: 0.18 });
  S.P.stipple([D.ell(67, 57, 2.2, 5.2, -0.35)], {
    nib: 0.11,
    color: C.woodDark,
    density: 2.2,
  });
}
function glass(S, full = true) {
  S.shadow(45, 66, 23);
  const bowl = curve([
    [28, 16],
    [62, 16],
    [63, 24],
    [61, 34],
    [55, 41],
    [46, 44],
    [37, 41],
    [30, 34],
    [27, 24],
  ]);
  S.part(bowl, C.glass, { nib: 0.25, pressure: 0.25, passes: 1 });
  if (full) {
    const wine = curve([
      [29, 28],
      [62, 28],
      [60, 35],
      [54, 41],
      [46, 43],
      [38, 40],
      [32, 35],
    ]);
    S.part(wine, C.wine, { nib: 0.16, pressure: 0.8 });
    S.part(D.ell(45.5, 28, 16.2, 2.7), C.wineDark, {
      nib: 0.15,
      pressure: 0.65,
    });
    S.arc(
      [
        [33, 30],
        [34, 34],
        [38, 37],
      ],
      { nib: 0.65, color: C.rose },
    );
  }
  S.arc(
    [
      [30, 18],
      [30, 23],
      [31, 26],
    ],
    { nib: 0.5, color: C.cream },
  );
  S.arc(
    [
      [59, 20],
      [59, 23],
      [58, 25],
    ],
    { nib: 0.35, color: C.cream },
  );
  S.P.outline([bowl], { nib: 0.26, color: C.ink });
  S.part(D.ell(45, 63, 13, 2.6), C.glass, {
    nib: 0.23,
    pressure: 0.25,
    passes: 1,
  });
  S.part(
    curve([
      [43.7, 44],
      [46.2, 44],
      [46.1, 58],
      [49, 62],
      [41, 62],
      [43.5, 58],
    ]),
    C.glass,
    { nib: 0.21, pressure: 0.25, passes: 1 },
  );
  S.arc(
    [
      [34, 62],
      [44, 64],
      [54, 62],
    ],
    { nib: 0.2, color: C.cream },
  );
  S.P.outline([D.ell(45, 16, 17.3, 2.5)], { nib: 0.23, color: C.ink });
  S.arc(
    [
      [21, 21],
      [19, 18],
      [19, 14],
    ],
    { nib: 0.15, color: C.gold },
  );
  S.arc(
    [
      [68, 20],
      [71, 18],
      [72, 14],
    ],
    { nib: 0.15, color: C.gold },
  );
}
const DRAW = {
  vine,
  crusher,
  vat,
  press,
  oak,
  steel,
  bottles,
  glass,
  basket: (S) => {
    S.shadow(45, 65, 25);
    basket(S, 45, 51, 1.25, true);
  },
  "vine-harvested": (S) => vine(S, true),
  "vat-sealed": (S) => vat(S, true),
  "bottles-one": (S) => bottles(S, 1),
  "bottles-empty": (S) => bottles(S, 0),
  "glass-empty": (S) => glass(S, false),
};
async function draw(id) {
  const S = scene(id);
  DRAW[id](S);
  const result = M.cutout(S.P.S, S.sil, { crop: false, grow: 0.22 });
  const file = path.join(OUT, id + ".png");
  fs.writeFileSync(file, await result.canvas.encode("png"));
  console.log(id + ": " + result.canvas.width + "x" + result.canvas.height);
}
async function paper() {
  const S = plate({
    id: "wine-paper",
    w: 64,
    h: 64,
    ppm: 8,
    paper: "hotpress",
    seed: "wine-paper-v2",
  }).S;
  // Neutral multiplicative grain permits cream, sage and rose chapters to share the tooth.
  const b = new Uint8ClampedArray(S.W * S.H * 4);
  for (let i = 0; i < S.W * S.H; i++) {
    const n = Math.max(247, Math.min(255, 252 + (S.tooth[i] - 0.5) * 8));
    b[4 * i] = b[4 * i + 1] = b[4 * i + 2] = n;
    b[4 * i + 3] = 255;
  }
  const c = createCanvas(S.W, S.H);
  c.getContext("2d").putImageData(new ImageData(b, S.W, S.H), 0, 0);
  fs.writeFileSync(path.join(OUT, "paper-grain.png"), await c.encode("png"));
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ids = process.argv.slice(2);
  for (const id of ids.length ? ids : Object.keys(DRAW)) {
    if (!DRAW[id]) throw Error("Unknown illustration: " + id);
    await draw(id);
  }
  await paper();
})();
