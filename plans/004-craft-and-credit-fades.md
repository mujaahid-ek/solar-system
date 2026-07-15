# 004 — Fade craft markers and the credit line instead of display:none pops

- **Status**: TODO
- **Commit**: n/a — repository is not under git (plan written 2026-07-14)
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 2 files (src/styles.css, src/scene/orrery.ts), ~20 lines

## Problem

Two state changes teleport while everything around them fades:

1. Toggling **Craft** pops all seven spacecraft markers in/out at once via
   `display`:

```ts
/* src/scene/orrery.ts — current (inside setCraftVisible) */
setCraftVisible(on: boolean) {
  this.craftVisible = on;
  for (const c of this.craft) {
    c.el.style.display = on ? '' : 'none';
    c.holder.visible = on;
  }
}
```

```css
/* src/styles.css:231 — current */
#app.hide-craft .craft-marker {
  display: none;
}
```

2. The **credit line** vanishes instantly on entering a planet while the brand
   beside it crossfades over 200ms:

```css
/* src/styles.css:625 — current */
#app.detail #credit {
  display: none;
}
```

## Target

Craft markers fade over 180ms `ease` (hover-family change, matches the label
transitions at styles.css:132). Keep `display` out of it; use
opacity + visibility so pointer events die when hidden. The base `.craft-marker`
rule already has `transition-property: opacity; transition-duration: 160ms` —
extend it to include visibility:

```css
/* src/styles.css — .craft-marker rule: change transition lines */
transition-property: opacity, visibility;
transition-duration: 180ms;
```

```css
/* replaces #app.hide-craft .craft-marker { display: none; } */
#app.hide-craft .craft-marker {
  opacity: 0;
  visibility: hidden;
}
```

Note: `.craft-marker.edge` sets `opacity: 0.4` and `:hover` sets `opacity: 1`;
the `#app.hide-craft` rule above must win, which it does on specificity
(0,2,0 > 0,1,0 and 0,2,0 ties `.craft-marker.edge` — order the hide-craft rule
AFTER the `.edge` rule in the file, which the current source already does).

In `src/scene/orrery.ts`, `setCraftVisible` must stop touching `el.style.display`
(inline display would defeat the CSS fade) and keep only the 3D holder toggle —
the DOM fade is driven by the `#app.hide-craft` class set in `src/ui/hud.ts`
(`setCraft`). The overlay-projection loop guards on `this.craftVisible`, and
`updateOverlay` sets `style.visibility` per-frame for on/off-screen culling —
that per-frame `visibility` write conflicts with the CSS fade only while craft
are globally hidden, in which case the class rule still wins on specificity
because inline `visibility` is set to `''` (empty) when visible, `hidden` when
culled. No JS change needed there.

```ts
/* target */
setCraftVisible(on: boolean) {
  this.craftVisible = on;
  for (const c of this.craft) c.holder.visible = on;
}
```

(3D models still pop — three.js `visible` has no fade — but they are tiny at
orrery scale; the markers are the visually dominant element.)

Credit line — fade like `.brand` (styles.css:651–658):

```css
/* replaces #app.detail #credit { display: none; } */
#app.detail #credit {
  opacity: 0;
  visibility: hidden;
}
```

and extend `#credit` (styles.css:600) with:

```css
transition-property: opacity, visibility;
transition-duration: 200ms;
```

(remove the standalone `opacity: 0.8` conflict by keeping it — the fade goes
0.8 → 0, which is fine.)

## Repo conventions to follow

- Fade-with-visibility pattern already used by `.brand` (styles.css:651) and
  `.panel` (styles.css:630) — imitate those.

## Steps

1. styles.css: extend `.craft-marker` transition to `opacity, visibility` at 180ms.
2. styles.css: replace the `#app.hide-craft .craft-marker` rule body with
   `opacity: 0; visibility: hidden;`.
3. orrery.ts: delete the `c.el.style.display` line from `setCraftVisible`.
4. styles.css: add transition lines to `#credit`; replace `#app.detail #credit`
   rule body with `opacity: 0; visibility: hidden;`.
5. Verify.

## Boundaries

- Do NOT fade the 3D holders in three.js (no material-opacity plumbing for this).
- Do NOT change marker positioning/culling logic in `updateOverlay`.
- If a step doesn't match the code you find, STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` clean; grep `style.display` in
  src/scene/orrery.ts returns only the body-label culling write (line ~298), not
  craft markers.
- **Feel check**: in the orrery, toggle Craft on/off — the seven markers fade in
  and out together instead of popping; hover an edge-pinned marker while visible —
  hover still brightens it; toggle Craft off and confirm the hidden markers are
  not hoverable/clickable. Open a planet — the credit line now fades out with the
  brand instead of vanishing a frame earlier.
- **Done when**: no display:none pops remain for craft markers or credit.
