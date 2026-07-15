# 001 — Add prefers-reduced-motion support

- **Status**: TODO
- **Commit**: n/a — repository is not under git (plan written 2026-07-14)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files (src/styles.css, src/scene/orrery.ts), ~30 lines

## Problem

The app has no `prefers-reduced-motion` handling anywhere. Users who ask the OS
for reduced motion still get:

- an infinite pulsing ring on every surface hotspot marker:

```css
/* src/styles.css:284 — current */
.hot-marker::before {
  content: '';
  position: absolute;
  inset: 9px;
  border: 1px solid rgba(95, 212, 230, 0.6);
  border-radius: 50%;
  animation: hotping 2.8s cubic-bezier(0.2, 0, 0.4, 1) infinite;
}
```

- translateY movement on panel content entrances (`rise`, styles.css `@keyframes rise`),
  scale movement on hotspot cards (`cardin`), translateY on the back button reveal,
  and accordion movement (`accopen`);
- 900–1000ms JS camera flights between the orrery and detail views
  (src/scene/orrery.ts `flyTo` and `camReturn`).

## Target

Reduced motion keeps opacity feedback but drops movement:

```css
/* append at the end of src/styles.css, before the mobile media queries */
@media (prefers-reduced-motion: reduce) {
  .hot-marker::before {
    animation: none;
    opacity: 0;
  }
  .panel .rise,
  .hot-card,
  details.acc[open] .acc-body {
    animation-name: fadeonly;
  }
  #back,
  .panel {
    transition-property: opacity, visibility, color, border-color;
  }
  #app.detail #back,
  #app.detail .panel.filled {
    transform: none;
  }
}
@keyframes fadeonly {
  from {
    opacity: 0;
  }
}
```

(`animation-name: fadeonly` keeps each element's own duration/easing/stagger but
replaces the moving keyframes with a pure fade. Dropping `transform` from the
`#back`/`.panel` transition lists removes their slide-in movement while keeping
the fades.)

In `src/scene/orrery.ts`, camera flights collapse to a fast cut. Add near the top
of the file (after the existing `const` declarations around line 70):

```ts
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
```

Then in `flyTo(id, dur, dist, onDone)` and `camReturn(fromId, dur, dist)`, clamp
the duration as the first line of each method:

```ts
if (REDUCED_MOTION.matches) dur = Math.min(dur, 220);
```

220ms keeps just enough continuity to explain the spatial relationship (the app's
whole navigation model is zoom-in/zoom-out) without the second-long flight.

## Repo conventions to follow

- Plain CSS in `src/styles.css`, section comments like `/* ---------- x ---------- */`.
- Keyframes are defined adjacent to their users; the new `fadeonly` keyframe can
  live next to the new media query block.
- TS: three.js scene classes, camelCase, module-level constants above the class
  (see `HOME_POS` in src/scene/orrery.ts:70).

## Steps

1. `src/styles.css`: append the `@media (prefers-reduced-motion: reduce)` block and
   the `fadeonly` keyframes exactly as in Target, placed before the
   `/* ---------- narrow desktop ... */` section.
2. `src/scene/orrery.ts`: add the `REDUCED_MOTION` module constant; add the
   duration clamp as the first statement of `flyTo` and of `camReturn`.
3. Run the mechanical verification.

## Boundaries

- Do NOT touch `src/scene/detail.ts` — its settle animations are exponential
  smoothing tied to the interaction model; they read as instant-follow, not
  decorative motion.
- Do NOT remove the hotspot markers themselves — only the infinite ping.
- Do NOT add new dependencies.
- If a step doesn't match the code you find, STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits clean.
- **Feel check**: in DevTools → Rendering → emulate `prefers-reduced-motion: reduce`:
  - hotspot circles show no pulsing ring but still hover/click normally;
  - opening a planet still crossfades panels in (opacity), with no upward slide;
  - clicking a planet from the orrery cuts to the detail view in ~0.2s instead of
    the 1s flight — and clicking Overview cuts back equally fast;
  - with emulation off, everything behaves exactly as before.
- **Done when**: both checks pass with emulation toggled on and off.
