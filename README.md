# Solar System

An interactive technical catalogue of the solar system: the Sun, the eight
planets, the Moon, Pluto — and the spacecraft we sent among them.
Lives at [solarsystem.surf](https://solarsystem.surf).

- **Orrery view** (desktop landing): a tilted top-down system with hairline
  orbit paths and bodies moving at honest relative speeds (one Earth year ≈
  61 s). Distances are log-compressed and bodies enlarged — labelled
  *not to scale* on the masthead.
- **Craft layer**: the ISS, Hubble, JWST, Parker Solar Probe, New Horizons
  and both Voyagers fly as real 3D models (NASA VTAD glTF assets) — orbiting
  Earth, riding at L2, or hanging in deep space. Click one and the camera
  zooms in exactly like a planet, opening its mission sheet beside the
  rotatable model. Deep-space craft labels pin to the frame edge when out of
  view; a crosshair marker stands in if a model hasn't loaded.
- **Detail stage**: click any body (or use the bottom index / arrow keys) —
  the body sits centre-stage between two data panels. Drag to tumble freely,
  scroll/pinch to zoom, idle auto-rotation about the true axial tilt.
  Textures load at 2K and silently upgrade to 8K where available (hi-res is
  dropped again on leaving, so GPU memory stays flat).
- **Surface hotspots**: pulsing circles pinned to real features — the Great
  Red Spot, Olympus Mons, Sputnik Planitia, Apollo 11's landing site — that
  rotate with the globe and expand into fact cards.
- **Data sheets**: extended technical schema from the NASA planetary fact
  sheets — physical, orbital, atmospheric composition (stacked bar),
  satellites and rings. The Sun gets a stellar schema instead of orbital.
- **Sound** (off by default): a single site-wide ambient bed — the Jovian
  chorus (University of Iowa, CC BY 4.0) — plus sampled hover and select
  blips. Zoom transitions are deliberately silent.
- **Mobile** (≤ 900 px) is stage-only: no orrery; previous/next arrows under
  the info panel step between bodies.

## Run

```bash
npm install
npm run dev      # http://localhost:5199 (or vite's default port)
npm run build    # static output in dist/
```

Vite + TypeScript + Three.js, no framework. State lives in
[src/main.ts](src/main.ts); the 3D world is
[src/scene/](src/scene/) (orrery, detail stage, body factory), UI chrome in
[src/ui/](src/ui/), audio in [src/audio/sound.ts](src/audio/sound.ts), and
all body/spacecraft data in [src/data/](src/data/).

## Credits & licences

| Asset | Source | Licence |
| --- | --- | --- |
| Planet/Moon/Sun textures | [Solar System Scope](https://www.solarsystemscope.com/textures/) (from NASA imagery) | CC BY 4.0 |
| Pluto map | NASA / JHUAPL / SwRI (New Horizons), via Wikimedia Commons | Public domain |
| Spacecraft photos | NASA (ISS: STS-132 crew · Hubble: STS-125 crew · JWST: GSFC CIL · others: JPL-Caltech / JHUAPL / SwRI) | Public domain |
| Spacecraft 3D models | NASA VTAD, [science.nasa.gov/3d-resources](https://science.nasa.gov/3d-resources/) | Public domain |
| Space audio | [University of Iowa Space Audio](https://space-audio.org) | CC BY 4.0 |
| Mars audio | NASA Perseverance SuperCam, Sol 1 | Public domain |
| Fonts | TASA Orbiter (Localtype), Inter (Rasmus Andersson), Geist Mono (Vercel) | OFL 1.1 |

Distances, moon counts and spacecraft positions are approximate as of
mid-2026. Pluto's map has a blank southern band because that hemisphere was
in polar night during the 2015 flyby — it has genuinely never been imaged.
