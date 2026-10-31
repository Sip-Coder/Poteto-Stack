# Vendored drawing tools

Subset of [Kevin T. Ngo's statechart-art](https://github.com/kevintngo/statechart-art),
revision `292f54c51bf0b728c49f97670f813f77d2422693` (MIT).

The original `tools/kit/`, `tools/lib/{classic,draw,mask,letter}.js`, and four
Kevin Serif / Kevin Sans TrueType fonts are included without modification.
`package.json` is a local CommonJS boundary for this repository's ES modules.
The MIT copyright and permission notice is preserved in `LICENSE`.

`../../render-wine.cjs` contains new wine-specific drawing coordinates. It uses
the vendored kit's paper tooth heightfield, seeded pencil deposits, technical
pen contours, text masks and transparent sprite cutouts. The two Kevin Sans
WOFF2 webfonts are also copied to `demo/assets/` for the interactive page.

Fonts: Hershey's 1967 public-domain single-stroke lettering, traced and packaged
by Kevin T. Ngo. Reuse of Kevin's implementation and drawings is licensed MIT.
