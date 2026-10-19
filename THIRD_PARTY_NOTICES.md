# Third-party notices

sonotas is released under the [MIT License](LICENSE). It is built on, and
ships, the following open-source work. Each project remains under its own
license, reproduced or linked below; the notices here travel with every copy of
sonotas, including the prerendered site and the Docker image.

## alphaTab

Music notation and guitar tablature engine: parses Guitar Pro and MusicXML
files, engraves the notation and provides the MIDI timing that drives the
playhead. sonotas would not exist without it.

- Copyright © Daniel Kuschny and Contributors
- License: [Mozilla Public License 2.0](https://github.com/CoderLine/alphaTab/blob/develop/LICENSE)
- Source: <https://github.com/CoderLine/alphaTab> · <https://www.alphatab.net>

sonotas uses alphaTab unmodified as an npm dependency (`@coderline/alphatab`).
Under MPL-2.0 the library's source stays available at the repository above.

## Bravura

SMuFL music font used for all notation glyphs. sonotas ships a Modified
Version of Bravura (`public/fonts/sonotas-music.woff2`): a subset containing
only the glyphs alphaTab can emit, renamed to "Sonotas Music" because the OFL
reserves the name Bravura for the original. Bravura's copyright, license and
trademark records are kept inside the file. See the README for how it is built.

- Copyright © Steinberg Media Technologies GmbH (<http://www.steinberg.net/>)
- License: [SIL Open Font License 1.1](https://github.com/steinbergmedia/bravura/blob/master/LICENSE.txt),
  with Reserved Font Name "Bravura"
- Source: <https://github.com/steinbergmedia/bravura>

## mediabunny

Muxes the WebCodecs-encoded frames and soundtrack into the exported MP4.

- Copyright © Vanilagy
- License: [Mozilla Public License 2.0](https://github.com/Vanilagy/mediabunny/blob/main/LICENSE)
- Source: <https://github.com/Vanilagy/mediabunny> · <https://mediabunny.dev>

## Sonivox soundfont

The General MIDI instruments alphaTab's synthesizer plays when sound is on.
sonotas ships the copy bundled with alphaTab unmodified
(`public/soundfont/sonivox.sf3`, its license beside it). It is based on the
Sonivox EAS synthesizer of the Android Open Source Project.

- Copyright © 2004-2006 Sonic Network Inc.
- License: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- Source: <https://musical-artifacts.com/artifacts/1517> · <https://android.googlesource.com/platform/external/sonivox/>

## Nuxt

Application framework for the user interface. The project was started from a
Nuxt UI template, whose copyright line is kept in [LICENSE](LICENSE); Nuxt UI
itself is no longer used.

- Copyright © Nuxt
- License: [MIT](https://github.com/nuxt/nuxt/blob/main/LICENSE)
- Source: <https://github.com/nuxt/nuxt>

## aequitas

CSS design language the interface is built on, including its icon set. Vendored
from its build output into `app/assets/aequitas/`.

- Copyright © Oleg Kamlowski
- License: [MIT](https://github.com/sovrin/aequitas/blob/main/LICENSE)
- Source: <https://github.com/sovrin/aequitas>

## Geist

Sans and mono typefaces shipped with aequitas (`app/assets/aequitas/fonts/`),
used where the system UI font is unavailable.

- Copyright © 2023 Vercel, in collaboration with basement.studio
- License: [SIL Open Font License 1.1](https://github.com/vercel/geist-font/blob/main/LICENSE.txt)
- Source: <https://github.com/vercel/geist-font>
