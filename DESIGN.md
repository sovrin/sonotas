---
name: sonotas
description: Guitar Pro tabs to play-along video, in a dim studio where one amber bar means now.
colors:
  stage-light-amber: "#e0a94c"
  stage-light-amber-ui-dark: "oklch(0.769 0.127 78)"
  stage-light-amber-ui-light: "oklch(0.56 0.12 75)"
  amber-on-dark: "oklch(0.18 0.04 75)"
  amber-on-light: "oklch(0.99 0 0)"
  ink-surface-dark: "oklch(0.14 0.008 260)"
  ink-surface-light: "oklch(0.975 0.003 260)"
  ink-sunken-dark: "oklch(0.115 0.006 260)"
  ink-sunken-light: "oklch(0.96 0.005 260)"
  ink-text-dark: "oklch(0.96 0.005 260)"
  ink-text-light: "oklch(0.21 0.02 260)"
  ink-muted-dark: "oklch(0.72 0.015 260)"
  ink-muted-light: "oklch(0.48 0.02 260)"
  hairline-dark: "oklch(1 0 0 / 0.08)"
  hairline-strong-dark: "oklch(1 0 0 / 0.16)"
  hairline-light: "oklch(0.2 0.02 260 / 0.08)"
  hairline-strong-light: "oklch(0.2 0.02 260 / 0.16)"
  canvas-night: "#121316"
  canvas-night-notation: "#e8e9eb"
  canvas-paper: "#f5f7f9"
  canvas-paper-notation: "#13161c"
  playhead-grey: "#737b87"
  note-red: "#e5484d"
typography:
  display:
    fontFamily: "ui-monospace, SF Mono, Geist Mono Variable, Menlo, Consolas, monospace"
    fontSize: "calc(var(--ae-text-base) * 4.236)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  readout:
    fontFamily: "ui-monospace, SF Mono, Geist Mono Variable, Menlo, Consolas, monospace"
    fontSize: "calc(var(--ae-text-base) * 1.618)"
    fontWeight: 500
    lineHeight: 1.128
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "ui-sans-serif, -apple-system, SF Pro Text, system-ui, Geist Variable, Segoe UI, sans-serif"
    fontSize: "clamp(0.95rem, 0.92rem + 0.15vw, 1.0625rem)"
    fontWeight: 560
    lineHeight: 1.128
    letterSpacing: "-0.01em"
  body:
    fontFamily: "ui-sans-serif, -apple-system, SF Pro Text, system-ui, Geist Variable, Segoe UI, sans-serif"
    fontSize: "calc(var(--ae-text-base) / 1.272)"
    fontWeight: 400
    lineHeight: 1.618
  label:
    fontFamily: "ui-sans-serif, -apple-system, SF Pro Text, system-ui, Geist Variable, Segoe UI, sans-serif"
    fontSize: "calc(var(--ae-text-base) / 1.618)"
    fontWeight: 540
    letterSpacing: "0.12em"
  data:
    fontFamily: "ui-monospace, SF Mono, Geist Mono Variable, Menlo, Consolas, monospace"
    fontSize: "calc(var(--ae-text-base) / 1.272)"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  none: "0px"
spacing:
  space-0: "2px"
  space-1: "4px"
  space-2: "6px"
  space-3: "10px"
  space-4: "16px"
  space-5: "26px"
  space-6: "42px"
  space-7: "68px"
components:
  button-export:
    backgroundColor: "{colors.stage-light-amber-ui-dark}"
    textColor: "{colors.amber-on-dark}"
    rounded: "{rounded.none}"
    width: "100%"
  button-export-light:
    backgroundColor: "{colors.stage-light-amber-ui-light}"
    textColor: "{colors.amber-on-light}"
    rounded: "{rounded.none}"
    width: "100%"
  button-default:
    backgroundColor: "{colors.hairline-dark}"
    textColor: "{colors.ink-text-dark}"
    rounded: "{rounded.none}"
  segmented:
    backgroundColor: "{colors.hairline-dark}"
    textColor: "{colors.ink-muted-dark}"
    rounded: "{rounded.none}"
  segmented-selected:
    backgroundColor: "{colors.ink-surface-dark}"
    textColor: "{colors.ink-text-dark}"
    rounded: "{rounded.none}"
  bar-strip:
    backgroundColor: "{colors.ink-sunken-dark}"
    textColor: "{colors.ink-muted-dark}"
    rounded: "{rounded.none}"
    height: "68px"
  inspector:
    backgroundColor: "{colors.ink-surface-dark}"
    textColor: "{colors.ink-text-dark}"
    rounded: "{rounded.none}"
---

# Design System: sonotas

## Overview

**Creative North Star: "The Dim Studio"**

sonotas is a quiet editing room at night. The surfaces are cool ink, the stage is a dark bench marked with a faint dot grid, and the video is the only lit thing in the room. A single warm light, Stage-Light Amber, falls on whatever is playing now: the bar lit in the video, the current cell in the bar strip, the logo's one lit bar, the Export button. Everything else steps back so the creator's eye stays on the picture they are about to export.

The system is built on the user's own framework, aequitas (vendored in `app/assets/aequitas/`), and stays inside its language. Proportions come from φ (1.618): the spacing, type scale and leading are powers of it. Corners are square, lines are hairlines, and every musical or time number is set in tabular mono. Density sits in the middle: an editor with a preview, a transport and a four-tab inspector, where each setting explains in one line what its current value does.

Two visual worlds were explicitly rejected along the way: plain default aequitas (twice, as "not a real redesign") and aequitas' default three-field aurora, which turns muddy brown over this ink.

**Key Characteristics:**
- One warm accent on cool ink; amber always means "now" or "the action".
- The preview is the brightest, most elevated thing on the page.
- Square corners everywhere (0px), hairline borders, a strong 2px edge for emphasis.
- Tabular mono for every timecode, bar number, resolution and file size.
- Settings ordered the way a video is made: Frame, Look, Playhead, Output, then Export.

## Colors

A cool ink scale (hue 260) carrying one warm amber; the same amber lights the UI, the video and the logo.

### Primary
- **Stage-Light Amber** (#e0a94c): the colour of "now". It is the video's default bar highlight, the logo's lit bar and the source of the UI accent. In the interface it appears as **Stage-Light Amber, dark UI** (oklch 0.769 0.127 78) with ink text on it, and as **Stage-Light Amber, light UI** (oklch 0.56 0.12 75), darkened so white text still holds 4.6:1. The UI uses it for the selected tab underline, segmented selections, checked switches, focus rings, range brackets, export progress and the Export button.

### Neutral
- **Studio Ink** (surface oklch 0.14 0.008 260 dark / 0.975 0.003 260 light): page and inspector background.
- **Sunken Ink** (oklch 0.115 0.006 260 dark / 0.96 0.005 260 light): the stage bench and the bar strip, one step below the surface.
- **Ink Text** and **Muted Ink**: primary text and secondary text (hints, facts, captions, eyebrow labels).
- **Hairline** (8% white on dark, 8% ink on light) and **Hairline Strong** (16%): dividers, barlines, staff lines and the stage's dot grid.

### Video canvas
The video has its own two themes, chosen in the Look tab and independent of the UI theme:
- **Night canvas** (#121316) with notation in #e8e9eb.
- **Paper canvas** (#f5f7f9) with notation in #13161c. This is a cool, brand-ink paper, not cream.
- **Playhead Grey** (#737b87): the default playhead, chosen because it holds 3:1 on both canvases. The **Ink** preset follows the canvas (#e9eaec on night, #13161c on paper).
- **Note Red** (#e5484d): the default colour of the current note when note recolouring is on.

### Named Rules
**The One Amber Rule.** There is exactly one amber/orange in the system, #e0a94c and its two UI renderings. Never introduce a second warm hue, gradient or tint.

**The Amber Means Now Rule.** Amber marks what is playing, what is switched on or selected, and the action that makes the video (Export). Links, badges, icons and secondary actions read in ink. Amber is never decoration, never a section colour, never a background wash beyond the single faint spill over the stage.

**The Both Canvases Rule.** Any colour that can end up in the video (playhead, highlight and note presets) must hold at least 3:1 against both the night (#121316) and paper (#f5f7f9) canvases.

## Typography

**Body Font:** the system UI sans (SF Pro on macOS), with Geist Variable vendored as the fallback.
**Data Font:** the system mono (SF Mono), with Geist Mono Variable vendored as the fallback.

**Character:** a native, unbranded sans for the interface, so the tool feels like part of the operating system, and a tabular mono for anything that counts time or music.

### Hierarchy
The scale is φ-based on a fluid base of about 15–17px (`clamp(0.95rem, 0.92rem + 0.15vw, 1.0625rem)`).
- **Display** (mono 300, base × φ³ ≈ 72px, line-height 1, −0.04em): only the export percentage over the preview while a video renders.
- **Readout** (mono 500, base × φ ≈ 27px, −0.02em): the transport's timecode (0:04.2) and current bar number.
- **Title** (sans 560, base, −0.01em): the song title in the toolbar.
- **Body** (sans 400, base ÷ φ^½ ≈ 13px, line-height φ): the whole inspector, toggles, field labels, hints and captions.
- **Label** (sans 540, base ÷ φ ≈ 10.5px, 0.12em, uppercase, muted): inspector group headings (SHAPE, LAYOUT, ZOOM). This is the only uppercase in the system.
- **Data** (mono, base ÷ φ^½ ≈ 13px, tabular): bar numbers in the strip, file facts, readout subtitles, the export estimate line, hex values. The estimate line is in ink, since it is the reassurance before Export.

### Named Rules
**The Tabular Time Rule.** Every timecode, bar number, resolution, fps, file size and percentage is set in mono with tabular figures, so numbers never jitter while they change.

**The Smallest Step Rule.** The smallest size (base ÷ φ ≈ 10.5px) is only for the uppercase group labels. Anything a person needs to read, such as facts, captions and numbers, sits one step up.

**The One Display Moment Rule.** The display size appears once, for export progress. Nothing else on the page is set large.

## Layout

The page is aequitas' editor shell. A single toolbar runs across the top: the brand, a hairline, then the song (title and badge above a line of facts) and, at the far end, track select, Open and the theme toggle. Below it, the working column holds the stage, which grows to fill the height, then the transport. A floating inspector sits on the right, a little wider than aequitas' default (φ⁶ rem plus space-4, about 300px).

The inspector stacks four tabs (Frame, Look, Playhead, Output) over a scrolling panel. Export is pinned at its foot behind a hairline, so the goal of the page is always in view. Groups inside a tab are separated by dividers, and each group follows the pattern label heading, control, one-line hint.

Spacing follows φ steps from a 16px unit: 2, 4, 6, 10, 16, 26, 42 and 68px. Inspector groups use 10px internal gaps; the export panel pads 16/26px.

Below 48rem (768px) everything stacks in one column: the stage takes the video's own aspect ratio (capped at 70svh), the bar strip moves to its own full-width row under the readouts, and the toolbar drops the wordmark, "Track" label and Open label so the actions stay on one row while the song title truncates.

## Elevation & Depth

The system is flat tonal ink with exactly one lifted object. Surfaces separate by tone (surface vs. sunken) and hairlines, not shadows. The live preview canvas (or the finished video) carries aequitas' large shadow and sits on the sunken dot-grid stage, so it reads as the one lit thing on the bench.

Atmosphere comes from a custom aurora replacing aequitas' default: one faint amber radial spill over the stage (55% × 45% at 38% 0%) and one cool ink field behind the inspector (45% × 60% at the bottom-right corner).

### Shadow Vocabulary
- **Stage lift** (`var(--ae-shadow-l)`, three ink-tinted layers): only on the preview canvas and the finished video.

### Named Rules
**The One Lit Thing Rule.** Only the video gets a shadow. Panels, cards and controls stay flat; depth elsewhere comes from tone.

## Shapes

Every corner is square (`--ae-radius-m: 0`, `--ae-radius-full: 0`), including buttons, switches, swatches, segmented controls and the logo. Lines carry the form language: 1px hairlines for dividers and barlines, a 1.5px stroke for glyphs such as the ratio icons, and a 2px "edge" for emphasis (repeat barlines, the strip's final barline, range brackets, the export progress line).

Recurring geometry is drawn from tab notation: six-line staves, barlines, a thick double barline where the music jumps back, and the playhead with a square cap.

## Components

### Buttons
Square and exact; only Export speaks up.
- **Shape:** square (0px).
- **Export (primary):** full-width Stage-Light Amber with ink text on dark, white text on the light UI. It is the one primary button and lives only at the foot of the inspector. After an export it becomes "Download MP4".
- **Default:** a tinted hairline fill with ink text. Used for Open, Cancel export and the play/pause button (large, icon-only).
- **Ghost:** no fill. Used for the theme toggle and "Back to preview".
- **Focus:** aequitas' ring, a 2px surface gap then a 2px amber ring.

### Segmented choices
The default control for two to four options, with every option visible and one click to choose. The track is a hairline fill; the selected option lifts to the surface tone with an amber underline. In the inspector they always fill the width with equal segments. Shape options carry a small outline glyph at the option's own aspect ratio.

### Switches
Square switches for on/off settings. On is amber with an ink knob; off has a muted knob, so off never outshines on. A setting the file can't use (no title, no chords) shows its switch off and disabled. A group heading can carry its switch in the heading row (Bar highlight, Current note); while off, the group shows a one-line caption saying what the switch does.

### Swatch picker
A row of square preset colours (a radio group with each colour named for screen readers), followed by one custom swatch. The custom swatch shows a colour wheel until it holds its own colour; then it shows that colour, ringed like a selected preset.

### Theme cards
The video's canvas theme is chosen with two full-width choice cards: a label, a one-line note, and a 16:9 thumbnail drawn in that theme's paper and ink with four strings and one bar lit in the current highlight colour.

### Navigation
The inspector tabs are a text tablist (Frame, Look, Playhead, Output) in body size. The selected tab is in ink with an amber underline; the others are muted. Arrow keys, Home and End move between tabs.

### Bar strip (signature)
The song as a strip of tab staff, in **play order**: repeats play again, so their bars appear again, and each cell is as wide as that play lasts. Six hairline strings run across a sunken track; each cell has a barline, a thick 2px line where the play jumps back, and a final thick barline at the end. Bar numbers in mono are spaced by where they land (at least 32px apart, never on the final barline), and jump-backs always keep their number. The current bar is tinted with the video's own highlight colour and the playhead uses the video's own cursor colour with a square cap and a thin halo. Dragging scrubs. With a bar range on, two amber brackets `[` `]` set the export range, bars outside it sit behind a veil, and during export an amber fill runs across the range.

### Transport
Play/pause, the timecode readout ("0:04.2 of 2:23.6"), the bar strip, and the current-bar readout ("12 of 61 bars", or "in bars 12–28" while a range is rendered), with the "Export only some bars" switch beneath and its caption right beside it. Space plays and pauses; I and O set the first and last exported bar at the playhead.

### Export panel
Pinned at the inspector's foot. Errors appear here, above the button: an unsupported browser disables Export and says why, and a failed export says what failed and what to try. At rest: the scope ("Whole song · 16:9"), a mono line of facts (resolution, fps, length and the estimated size once known) and the Export button. While rendering: phase, percentage, a progress bar and Cancel. When done: "Your video is ready", the file name and size, Download, and a muted secondary action that reads "Discard video" until the file has been downloaded, then "Back to preview". While an export runs, the inspector, transport, track select and Open hold still at 45% opacity, and leaving the page asks first. Progress is announced once per phase, not per frame.

## Do's and Don'ts

### Do:
- **Do** keep Stage-Light Amber (#e0a94c) as the only warm colour, and use it only for what is playing now or for Export.
- **Do** check any new colour that can reach the video against both canvases (#121316 and #f5f7f9) for at least 3:1.
- **Do** set every time, bar, size and percentage value in tabular mono, at body size or larger.
- **Do** keep corners square (0px) and use the 2px edge for emphasis instead of extra fills.
- **Do** give every inspector control a one-line hint that says what its current value does.
- **Do** put new time- or range-related features on the bar strip rather than in a separate control.
- **Do** validate markup with aequitas' checker after UI edits: `node ../aequitas/dist/aequitas-check.mjs --css app/assets/css/main.css app/pages/index.vue app/components/*.vue`.

### Don't:
- **Don't** introduce a second amber, orange or warm gradient, or use amber as a decorative wash.
- **Don't** use aequitas' default three-field aurora; it mixes to brown over this ink.
- **Don't** add shadows to panels, cards or controls; only the video is lifted.
- **Don't** add rounded corners or pill shapes anywhere.
- **Don't** use a cream or warm paper for the light canvas; paper is the cool #f5f7f9.
- **Don't** add a second primary button or move Export out of the inspector's foot.
