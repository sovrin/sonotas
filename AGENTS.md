# Agent notes for sonotas

## Video settings are a public format

Every video setting travels in shared links as a code (`?s=…`), and links
already out in the world must keep producing the same settings forever. The
format lives in `app/utils/settings-code.ts`; its contract is locked by
`tests/settings-code_test.ts` against `tests/settings-code.lock.json`, and CI
runs it.

**What counts as a video setting:** anything that changes how the video looks
or how it's exported (frame, look, playhead, follow, output). Song-specific
state (track, bar range, position), app preferences (the app's own theme) and
transient UI state (zoom, notices) are not settings and stay in the store.

### Adding a setting

1. Add its default to `APP_DEFAULTS` in `app/utils/settings-code.ts`. Don't add
   it to the store's `reactive({...})` directly; the store spreads
   `APP_DEFAULTS`, and a setting outside it would silently drop out of links.
2. Append one line to `FIELDS` with the next unused id (never a retired one)
   and `absent` set to **how videos looked before the setting existed**, which
   is usually "off". That is not necessarily the new default; old links read
   `absent`, new users get `APP_DEFAULTS`.
3. Wire it like any setting (paint or build options, the store's watch lists,
   `encodeParams` in `packages/renderer/index.ts` for paint options, the UI).
4. Run `pnpm settings:lock`, then `pnpm test`, and commit the lock with the
   feature. Until you do, `pnpm test` fails with "the lock is behind the code".

### Never

- Change a field's `id`, `type` or `absent`, or reorder, rename or remove an
  existing enum value. Append new enum values at the end; ranges only widen.
- Edit `tests/settings-code.lock.json` by hand, or delete samples from it. It is
  append-only and checked against git history.
- Change or add to `BASE_THEMES`. New canvas presets go in `THEMES` (and the
  theme's enum values).
- Reuse the id of a removed field. Removing a setting means deleting its field
  and adding its id to `RETIRED_IDS`.
- Change what an existing value *means* (say, `transition` from ms to
  seconds). Add a new field with a new id instead, and retire the old one.

### Changing a default

Change `APP_DEFAULTS` (or `THEMES`) only. Old links keep their meaning because
they decode against `absent`, which never changes.

If a test in `tests/settings-code_test.ts` fails, the change breaks links that
people have shared. Fix the change, not the test or the lock.
