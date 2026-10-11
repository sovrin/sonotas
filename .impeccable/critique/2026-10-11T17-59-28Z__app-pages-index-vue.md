---
target: site
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/sovrin/Projects/sovrin/sonotas/app/pages/index.vue"
target_fingerprint: "sha256:19e86a0c2c1ccb0cbb89343b067ff0fd5fc9f92f0bdcb0ad48ea6039bef21a0a"
target_path: /Users/sovrin/Projects/sovrin/sonotas/app/pages/index.vue
timestamp: 2026-10-11T17-59-28Z
slug: app-pages-index-vue
closed: true
---
Method: dual-agent (A: design review, B: detector + browser)

## Design Health Score: 24/40 (Acceptable)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Export progress excellent; size estimate silently drops while playing or after range change; no time remaining |
| 2 | Match System / Real World | 3 | Musician vocabulary fits; play-order strip numbers (13 then 10) unexplained; Quality options have no hint |
| 3 | User Control and Freedom | 2 | "Back to preview" discards the finished MP4 without confirmation; no warning on leaving mid-export |
| 4 | Consistency and Standards | 3 | Amber also on links, badge, theme icon, on-switches; Output controls lack the one-line hints other tabs have |
| 5 | Error Prevention | 2 | No WebCodecs check before Export; settings, Open and track stay live during export |
| 6 | Recognition Rather Than Recall | 3 | Drag-and-drop only in a tooltip; swatches unnamed visually |
| 7 | Flexibility and Efficiency | 1 | No global shortcuts (Space, export, set in/out); settings not persisted |
| 8 | Aesthetic and Minimalist Design | 3 | Disciplined; off-switch white knobs and rainbow custom swatch are the loudest marks |
| 9 | Error Recovery | 2 | Encoder failures shown as "Couldn't render the score." with no next step |
| 10 | Help and Documentation | 2 | Strong inline hints; nothing says the MP4 is silent or that Chrome/Edge is needed |

## Priority Issues
- [P1] Export-day safety: destructive Back to preview, no beforeunload, live controls during export, no WebCodecs check, wrong error copy (useSonotas.ts:516, :532). /impeccable harden
- [P1] Key reassurance text at 10.4px muted (9.5px on mobile): estimate line, file facts, range caption, readout subtitles, strip numbers. Detector: undersized-ui-text x34 desktop, x20 mobile. /impeccable typeset
- [P2] Amber leaks (links, Sample badge, sun icon, theme-card wash, on-switches) and inverted switch salience. /impeccable quieter
- [P2] Range mode: tiny brackets, caption far from switch, clip vs song readouts disagree, zoom jumps, no aria-valuetext on brackets. /impeccable clarify
- [P3] Mobile: unreadable 16:9 preview, readout touching edge, credits between transport and settings. /impeccable adapt

## Detector
CLI: 0 findings. Browser: undersized-ui-text (34/33/20), skipped-heading x1 (h1 to h6 in InspectorGroup), monotonous-spacing x1 (intentional phi gap), radial-halo x1 (false positive: stage dot grid), text-occlusion x1 light (false positive: detector overlay).

## Personas
Alex: no shortcuts, no persistence, no presets. Sam: h6 headings, export status announces every frame, strip bar numbers read as a stream. Guitar YouTuber (9:16 Short): no 60 s guard, fiddly range, drag-and-drop hidden, export deletable, silence not explained.

## Minor
"frames" twice in export subline; Song title switch on with "none in this file"; Playhead group lacks a switch; light Export button reads mustard; "(demo)" plus Sample badge redundant; 0:06.0 vs 0:05 rounding.
