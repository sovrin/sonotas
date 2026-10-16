---
target: the layout
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/sovrin/Projects/sovrin/sonotas/app/pages/index.vue"
target_fingerprint: "sha256:afe1879bd27f9110068222d2abfd36e73daa69deccb2295f1b757e4c27840fbf"
target_path: /Users/sovrin/Projects/sovrin/sonotas/app/pages/index.vue
timestamp: 2026-10-16T17-25-23Z
slug: app-pages-index-vue
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score — 27/40 (Acceptable)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Scope/estimate line good but small, far from range |
| 2 | Match System / Real World | 3 | "+" on chips reads "add" |
| 3 | User Control | 3 | Range toggle silently rewinds to 0 |
| 4 | Consistency | 2 | Switch, checkbox and chips for on/off |
| 5 | Error Prevention | 3 | Missing elements disabled; size estimate |
| 6 | Recognition vs Recall | 2 | Shortcuts far from transport; shared tab scroll hides SHAPE |
| 7 | Flexibility | 3 | No Export/tab keys |
| 8 | Aesthetic/Minimalist | 2 | Two-button rail, shadowed window + card, counter |
| 9 | Error Recovery | 3 | Errors say what to try |
| 10 | Help | 3 | Help unreachable on phone |

## Design Specificity
Core (play-order bar strip, readouts, Frame→Export order) is product-specific; new chrome (floating window on dot grid, icon rail, shadowed transport card) is category-generic. Detector: CLI 0 findings, aequitas-check clean; in-page 7 minor (5 undersized-ui-text eyebrows/badge 10.4px, 9.45px mobile; nested-cards on .transport.card; skipped-heading h1→h3 in dialogs).

## Priority Issues
- [P1] .shell margin collapses through #__nuxt/body → 16px page scroll (main.css:42). Fix: pad #__nuxt instead.
- [P1] Shell --ae-shadow-l and .transport.card shadow/surface break One Lit Thing (main.css:47, SongTimeline.vue:70). Fix: hairline ring only; transport tone + inset hairline.
- [P2] Dot grid lost from the stage, only in 16px gutter; shows behind inspector on mobile. Fix: grid back on stage/main, html plain bg, shell bg outside media query.
- [P2] 68px rail for two buttons; help gone on phone. Fix: narrower or give it real destinations; phone fallback in header.
- [P3] Inspector tabs share scrollTop; Frame opens with SHAPE scrolled off. Fix: reset scrollTop on tab change.

## Persona Red Flags
- Alex: shortcuts two clicks away; no Export/tab keys; focus returns to rail button so Space reopens dialog.
- Sam: nav landmark with no navigation (AppSidebar.vue:14); rail before main in tab order; "+" on disabled chip.
- 9:16 creator: preview 275×488 at 1280×800; phone help missing, Export far below fold.

## Minor
Chips wrap raggedly; #toggle slot overloaded by count; wide dt column in shortcuts dialog; light-UI window barely separates; ~9 amber marks with range on Look; DESIGN.md still says switches.

## Questions
Why lift the window if only the video may be lit? Is an empty rail a promise of future panels? Should 9:16 rearrange stage/transport?
