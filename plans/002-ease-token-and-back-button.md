# 002 — Tokenize the ease-out curve; split the back-button reveal from its hover

- **Status**: TODO
- **Commit**: n/a — repository is not under git (plan written 2026-07-14)
- **Severity**: MEDIUM
- **Category**: Easing & duration / Cohesion & tokens
- **Estimated scope**: 1 file (src/styles.css), ~10 edits

## Problem

1. The repo's signature strong ease-out curve `cubic-bezier(0.2, 0, 0, 1)` is
   hand-typed in four places (src/styles.css): `.hot-card` (`cardin` animation,
   ~line 324), `.panel .rise` (~line 661), `.sec .chev` transition (~line 775),
   and `details.acc[open] .acc-body` (`accopen`, ~line 781). Any future tweak
   means hunting all four.

2. The back button's reveal and its hover colors share one weak transition:

```css
/* src/styles.css:472 — current */
#back {
  ...
  transition-property: opacity, transform, visibility, color, border-color;
  transition-duration: 220ms;
}
```

No `transition-timing-function` is declared, so everything uses the browser
default `ease` — a weak curve for an entrance — and the hover color/border
change drags over 220ms (the app's other controls answer hover in 140ms, see
`.toggle` at styles.css:444).

## Target

Add a token next to the existing custom properties in `:root` (styles.css:25):

```css
--ease-out: cubic-bezier(0.2, 0, 0, 1); /* strong ease-out — the app's one deliberate curve */
```

Replace all four hand-typed occurrences of `cubic-bezier(0.2, 0, 0, 1)` with
`var(--ease-out)`. (Do NOT change `hotping`'s `cubic-bezier(0.2, 0, 0.4, 1)` —
different curve, deliberate.)

Back button — reveal gets the strong curve, hover colors answer fast:

```css
/* target */
#back {
  /* ...existing declarations unchanged... */
  transition-property: opacity, transform, visibility;
  transition-duration: 220ms;
  transition-timing-function: var(--ease-out);
}
#back:hover {
  color: var(--ink);
  border-color: rgba(95, 212, 230, 0.5);
  transition: color 140ms ease, border-color 140ms ease;
}
```

(The hover rule already sets those two colors — only the `transition` line is
new. Putting it on `:hover` keeps the 220ms reveal transition as the resting
state; color changes both in and out of hover still read instantly at 140ms
because the hover-out begins from the hover rule's transition… no — hover-out
uses the resting rule. That asymmetry is acceptable here because the reveal
transition already covers color at 220ms; if it feels laggy on hover-out, move
`color 140ms ease, border-color 140ms ease` into the base `#back` rule as
additional comma-separated `transition` entries instead.)

Preferred simpler form (use this): declare per-property timings on the base rule —

```css
#back {
  /* ...existing declarations unchanged, minus the old transition-property/duration... */
  transition:
    opacity 220ms var(--ease-out),
    transform 220ms var(--ease-out),
    visibility 220ms var(--ease-out),
    color 140ms ease,
    border-color 140ms ease;
}
```

## Repo conventions to follow

- Tokens live in `:root` in src/styles.css:25–40 with lowercase double-dash names
  and a short comment (see `--accent: #d9a24b; /* instrument amber — data, current state */`).
- Multi-property transitions elsewhere use `transition-property` +
  `transition-duration` pairs; the comma-form shorthand is fine where per-property
  timing differs.

## Steps

1. Add `--ease-out` to `:root`.
2. Swap the four `cubic-bezier(0.2, 0, 0, 1)` occurrences for `var(--ease-out)`.
3. Replace `#back`'s `transition-property`/`transition-duration` pair with the
   comma-form `transition` from Target (preferred simpler form).
4. Run verification.

## Boundaries

- Do NOT alter any duration except as specified for `#back`'s color/border (140ms).
- Do NOT touch `hotping`'s curve.
- Do NOT change `#dip` (linear is deliberate for the black utility dip).
- If a step doesn't match the code you find, STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` clean (CSS untouched by tsc, but confirms no
  accidental TS edits); grep confirms `cubic-bezier(0.2, 0, 0, 1)` appears only
  in the `:root` token line.
- **Feel check**: open a planet — the Overview button slides in with a confident
  fast-then-settle motion; hovering it flips the stroke to cyan visibly quicker
  than before; in DevTools Animations panel at 10% speed the reveal decelerates
  smoothly (no constant-speed segment).
- **Done when**: grep check passes and the reveal/hover feel distinct.
