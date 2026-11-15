import { test } from 'node:test'
import assert from 'node:assert/strict'
import { APP_DEFAULTS } from '../app/utils/settings-code.ts'
import { GROUPS } from '../app/utils/settings-groups.ts'

// A setting outside every group gets no Reset and never marks its tab; one in two groups resets twice.
test('every setting is in exactly one inspector group', () => {
  const grouped = Object.values(GROUPS).flatMap(tab => Object.values(tab).flat())
  assert.deepEqual([...grouped].sort(), Object.keys(APP_DEFAULTS).sort())
})
