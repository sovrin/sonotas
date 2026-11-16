// Each settings group's keys, by inspector tab: a group's Reset puts them back to
// their defaults, and a tab shows a dot while any of its groups is off them.
import type { SettingKey } from './settings-code'

export const GROUPS = {
  frame: {
    shape: ['aspect', 'freeW', 'freeH'],
    layout: ['layout', 'barsPerLine'],
    zoom: ['fitBars', 'currentBarOnly', 'notationSize', 'spacing'],
    follow: ['playhead', 'view', 'transition', 'followAt', 'turnEarly', 'steady', 'runPast']
  },
  look: {
    theme: ['theme', 'bg', 'fg', 'barNum', 'staffLines'],
    notation: ['staves', 'tabRhythm', 'songBook'],
    show: ['showTitle', 'showTuning', 'showTrackName', 'showBarNumbers', 'showTempo', 'showChords', 'showLyrics', 'showSections', 'showDynamics', 'showFingering', 'showTimeSig', 'showAttribution']
  },
  playhead: {
    playhead: ['cursorColor', 'cursorOpacity', 'cursorWidth', 'cursorHeight', 'cursorOffset', 'cursorMatchBar'],
    highlight: ['highlightBar', 'highlightColor', 'highlightOpacity', 'highlightPadding'],
    note: ['recolorNote', 'activeNoteColor', 'activeNoteOpacity']
  },
  sound: {
    sound: ['sound', 'soundMix'],
    aids: ['metronome', 'countIn']
  },
  output: {
    format: ['resolution', 'fps', 'quality', 'fastExport'],
    timing: ['speed']
  }
} satisfies Record<string, Record<string, SettingKey[]>>
