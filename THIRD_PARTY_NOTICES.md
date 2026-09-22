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

SMuFL music font used for all notation glyphs. sonotas ships a subset of
Bravura (`public/fonts/Bravura.subset.woff2`) containing only the glyphs
alphaTab can emit; see the README for how it is built.

- Copyright © Steinberg Media Technologies GmbH (<http://www.steinberg.net/>)
- License: [SIL Open Font License 1.1](https://github.com/steinbergmedia/bravura/blob/master/LICENSE.txt),
  with Reserved Font Name "Bravura"
- Source: <https://github.com/steinbergmedia/bravura>

## mediabunny

Muxes the WebCodecs-encoded frames into the exported MP4.

- Copyright © Vanilagy
- License: [Mozilla Public License 2.0](https://github.com/Vanilagy/mediabunny/blob/main/LICENSE)
- Source: <https://github.com/Vanilagy/mediabunny> · <https://mediabunny.dev>

## Nuxt and Nuxt UI

Application framework and component library for the user interface. The
project was started from a Nuxt UI template, whose copyright line is kept in
[LICENSE](LICENSE).

- Copyright © Nuxt
- License: [MIT](https://github.com/nuxt/ui/blob/v4/LICENSE.md)
- Source: <https://github.com/nuxt/nuxt> · <https://github.com/nuxt/ui>
