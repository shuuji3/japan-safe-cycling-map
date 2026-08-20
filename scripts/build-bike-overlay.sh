#!/usr/bin/env bash
# Build a Japan-wide bike-facility overlay PMTiles archive from OSM data using Planetiler.
set -euo pipefail

# Directory of this script / repo root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PLANETILER_URL="https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar"
PLANETILER_JAR=".cache/planetiler.jar"

OSM_PATH=".cache/japan.osm.pbf"
OSM_URL="https://download.geofabrik.de/asia/japan-latest.osm.pbf"
ROUTES_GEOJSON=".cache/route_networks.geojson"
OUTPUT="public/bike.pmtiles"
MINZOOM="${MINZOOM:-0}"
MAXZOOM="${MAXZOOM:-16}"

echo "Downloading Japan OSM extract ($OSM_URL) (skipped if unchanged on server) ..."
mkdir -p "$(dirname "$OSM_PATH")"
curl --user-agent "japan-safe-cycling-map (https://github.com/shuuji3/japan-safe-cycling-map)" \
  -L --fail -o "$OSM_PATH" -z "$OSM_PATH" "$OSM_URL"

echo "Resolving route=bicycle relations -> $ROUTES_GEOJSON ..."
uv run --no-sync python3 scripts/generate-route-networks.py "$OSM_PATH" "$ROUTES_GEOJSON"

mkdir -p "$(dirname "$OUTPUT")"

echo "Downloading Planetiler if missing ..."
if [ ! -f "$PLANETILER_JAR" ]; then
  mkdir -p "$(dirname "$PLANETILER_JAR")"
  curl -L --fail -o "$PLANETILER_JAR" "$PLANETILER_URL"
fi

echo "Building bike overlay (z$MINZOOM-z$MAXZOOM) ..."
java -Xmx8g -jar "$PLANETILER_JAR" generate-custom \
  --schema=scripts/planetiler-bike-schema.yml \
  --osm_path="$OSM_PATH" \
  --output="$OUTPUT" \
  --minzoom="$MINZOOM" \
  --maxzoom="$MAXZOOM" \
  "$@"

echo "Done: $OUTPUT"
