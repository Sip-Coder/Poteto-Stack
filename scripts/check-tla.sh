#!/bin/sh
# Re-run TLC on spec/Wine.tla. Does not draw the chart.
# For the Mermaid chart, run pstack's statechart script. See the README.
set -eu
JAR="${TLA2TOOLS:-}"
if [ -z "$JAR" ]; then
  echo "Set TLA2TOOLS to the path of tla2tools.jar (TLC from TLA+ 1.7 or later)." >&2
  exit 1
fi
if [ ! -f "$JAR" ]; then
  echo "Cannot find TLA2TOOLS=$JAR" >&2
  exit 1
fi
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT/spec"
exec java -XX:+UseParallelGC -jar "$JAR" -workers 1 -config Wine.cfg Wine.tla
