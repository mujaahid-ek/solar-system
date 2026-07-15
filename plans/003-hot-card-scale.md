# 003 — Soften the hotspot card entrance scale

- **Status**: TODO
- **Commit**: n/a — repository is not under git (plan written 2026-07-14)
- **Severity**: LOW
- **Category**: Physicality & origin
- **Estimated scope**: 1 file (src/styles.css), 1 line

## Problem

The hotspot fact card grows from 72% of its size, which reads cartoon-zoomy for
a technical instrument UI. (Its `transform-origin` is correctly anchored at the
marker via `--ox`/`--oy` — keep that.)

```css
/* src/styles.css:327 — current */
@keyframes cardin {
  from {
    opacity: 0;
    transform: scale(0.72);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## Target

```css
@keyframes cardin {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

Entrances should start at scale 0.9–0.97 with an opacity fade; 0.9 keeps a clear
"grows out of the marker" read (the origin does the spatial explaining) without
the balloon effect.

## Repo conventions to follow

- Keyframes live beside their users in src/styles.css; edit in place.

## Steps

1. Change `scale(0.72)` to `scale(0.9)` in `@keyframes cardin`.

## Boundaries

- Do NOT touch the `--ox`/`--oy` transform-origin mechanism or the 240ms duration.
- If the keyframe doesn't match the excerpt above, STOP and report.

## Verification

- **Mechanical**: grep `scale(0.72)` returns nothing.
- **Feel check**: open a planet with hotspots (Earth/Mars), click a circle — the
  card still visibly emerges *from the marker* (not from center), but no longer
  balloons; at DevTools 10% animation speed the growth is subtle.
- **Done when**: the card entrance reads as a fade-with-weight from the marker.
