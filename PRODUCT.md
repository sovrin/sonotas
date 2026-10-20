# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Guitar content creators** posting playthroughs and covers on YouTube, Shorts, Reels and TikTok. They already have a Guitar Pro tab of the song and need a synced tab video to put beside or over their own footage.
- **Teachers and students** making play-along videos of a song, a section or an exercise for lessons and practice.

Both arrive with a file in hand and leave with an MP4. Success is a video they can drop straight into their editor or upload.

## Product Purpose

sonotas turns a Guitar Pro or MusicXML tab into a scrolling play-along video with a moving playhead and exports it as an MP4. Rendering and encoding run entirely in the browser.

## Positioning

- **Private, in the browser:** the file never leaves the user's machine. Nothing is uploaded and there is no server-side rendering. Usage is counted anonymously (censitas): events and settings, never file names, contents or anything that identifies a person.
- **Export-ready video:** a clean H.264 MP4 at the right shape for each platform (16:9, 9:16, 1:1), not a screen recording of a notation app.
- **Free and open source:** MIT-licensed, no account, no watermark. The only line in the video is alphaTab's optional "rendered by alphaTab".

## Operating Context

- Input: `.gp`, `.gpx`, `.gp3`–`.gp5` and MusicXML files, usually written in Guitar Pro. Users open one with the Open button or drop it anywhere on the page. Multi-track files ask which track to render.
- The work happens in one sitting: load a file, choose the shape and look, scrub the preview, optionally limit the export to a range of bars, export, download.
- What happens next is outside sonotas: the MP4 goes into a video editor next to the user's own footage and audio, or straight to a platform.
- Export uses the browser's WebCodecs H.264 encoder, which works best in recent Chrome and Edge (README).

## Capabilities and Constraints

- **Sound is optional and off by default.** With it on, a built-in synth plays every track of the song, in the preview and as an audio track in the MP4, following tempo changes and the playback speed. Creators who add their own recording in an editor leave it off and get a silent video.
- **A single-page tool with no accounts:** no sign-in, no backend, no saved projects. Settings live in the link (`?s=…`, a short code), so sharing a look is sharing a URL; old links must keep working.
- Output: 480p, 720p or 1080p at 24, 30 or 60 fps, silent or with sound. Three quality levels, a file size estimate before export, and an optional *Fast export* that trades file size for speed.
- Layouts: a scrolling *line* or a *page* of wrapped systems. Zoom is set by notation size or by bars across the frame (1–8).
- Follow: the playhead (jumps note to note or glides) and the view (moves per bar or line, turns a screen at a time, or tracks the playhead) are set apart, with the transition (cut, quick, slow), where *now* sits in the frame, an early screen turn, a steady tracking pace, and running past the song's ends.
- Styling: staves (tab, standard or both), dark or light canvas, custom colours, playhead, bar highlight, current-note recolouring, and which elements are shown.
- Extras: export a range of bars, playback speed from 0.25× to 2×, and a live preview that scrubs the exact frames that end up in the video.
- Built on alphaTab (MPL-2.0) for parsing, engraving, timing and the synth; the Sonivox soundfont for its instruments; Bravura for the music font; mediabunny for muxing.

## Brand Commitments

- Name: **sonotas**, always lowercase.
- Logo: `public/favicon.svg`.

## Evidence on Hand

- Demo tab: `public/tabs/Catastrophic.gp` loads as the sample song.
- README screenshots: `docs/screenshot-dark.png`, `docs/screenshot-light.png`.
- Third-party credits: `THIRD_PARTY_NOTICES.md`.
- No testimonials, user counts, creator showcases or benchmark numbers exist. Do not invent any.

## Product Principles

1. **The file stays home.** Never add a step that uploads, syncs or needs an account.
2. **The export is the goal.** Every setting serves the MP4; the preview shows exactly what will be exported.
3. **The video stands next to the creator's footage.** It is one part of their edit, so it is clean and in the right shape, and silent unless they turn the sound on.
4. **One sitting, one page.** Open a file, adjust, export. No project management.
