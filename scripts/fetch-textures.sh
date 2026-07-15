#!/bin/bash
# Textures from Solar System Scope (CC BY 4.0) — https://www.solarsystemscope.com/textures/
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/textures"
mkdir -p "$DIR"
BASE="https://www.solarsystemscope.com/textures/download"

fetch() {
  local name="$1"
  local out="$DIR/$name"
  if [ -s "$out" ]; then echo "skip  $name"; return; fi
  code=$(curl -sL -o "$out" -w "%{http_code}" --max-time 120 "$BASE/$name")
  size=$(stat -f%z "$out" 2>/dev/null || echo 0)
  if [ "$code" = "200" ] && [ "$size" -gt 10000 ]; then
    echo "ok    $name ($((size / 1024))KB)"
  else
    echo "FAIL  $name (http $code, ${size}b)"
    rm -f "$out"
  fi
}

for n in \
  2k_sun.jpg 2k_mercury.jpg 2k_venus_surface.jpg 2k_venus_atmosphere.jpg \
  2k_earth_daymap.jpg 2k_earth_clouds.jpg 2k_moon.jpg 2k_mars.jpg \
  2k_jupiter.jpg 2k_saturn.jpg 2k_saturn_ring_alpha.png 2k_uranus.jpg 2k_neptune.jpg \
  4k_sun.jpg 4k_mercury.jpg 4k_venus_surface.jpg 4k_venus_atmosphere.jpg \
  4k_earth_daymap.jpg 4k_earth_clouds.jpg 4k_moon.jpg 4k_mars.jpg \
  4k_jupiter.jpg 4k_saturn.jpg 4k_uranus.jpg 4k_neptune.jpg ; do
  fetch "$n"
done
echo "--- done ---"
