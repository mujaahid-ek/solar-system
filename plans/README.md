# Animation improvement plans

Written by the `improve-animations` audit on 2026-07-14 (repo not under git —
no commit stamps). The audit found no HIGH feel-breakers: the motion
architecture (matched-frame orrery↔detail handoffs, interruptible exponential
settles, transform/opacity-only CSS) is sound. These plans are the remaining
leverage.

| Plan | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-reduced-motion.md) | Add prefers-reduced-motion support | MEDIUM | DONE |
| [002](002-ease-token-and-back-button.md) | Tokenize ease-out; split back-button reveal/hover | MEDIUM | DONE |
| [003](003-hot-card-scale.md) | Soften hotspot card entrance scale | LOW | DONE |
| [004](004-craft-and-credit-fades.md) | Fade craft markers + credit instead of display pops | LOW | DONE |

## Recommended order

002 → 001 → 003 → 004. Plan 002 introduces the `--ease-out` token that 001's
CSS block sits alongside; 003 and 004 are independent.

## Dependencies

- 001 and 002 both edit the tail region of `src/styles.css` — execute
  sequentially, not in parallel.
- 004 edits `setCraftVisible` in `src/scene/orrery.ts`; nothing else touches it.

## Explicitly not planned (deliberate designs, do not "fix")

- The 620ms neighbor-slide easing in `detail.ts` (entrance semantics, ease-out
  is correct).
- The ~1s orrery↔detail camera flights (scene transitions, not UI chrome —
  though 001 shortens them under reduced motion).
- The linear `#dip` fades (utility black dip; linear is deliberate).
- The 45ms panel `rise` stagger (within the 30–80ms band; restarting keyframes
  are semantically correct because the content is replaced).
- `hotping`'s distinct curve `cubic-bezier(0.2, 0, 0.4, 1)`.
