import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseChangelog } from '../app/utils/changelog.ts'

// The shape release-please writes, first release last.
const MD = `# Changelog

## [1.2.0](https://github.com/sovrin/sonotas/compare/v1.1.0...v1.2.0) (2026-11-02)


### ⚠ BREAKING CHANGES

* **settings:** drop the old theme field

### Features

* **timeline:** zoom the bar strip, with an overview ([c7b9da5](https://github.com/sovrin/sonotas/commit/c7b9da5)), closes [#12](https://github.com/sovrin/sonotas/issues/12)
* paste a [MusicXML](https://www.musicxml.com) file ([1a2b3c4](https://github.com/sovrin/sonotas/commit/1a2b3c4))

### Performance Improvements

* **export:** reuse the canvas between frames ([abcdef0](https://github.com/sovrin/sonotas/commit/abcdef0))

## [1.1.0](https://github.com/sovrin/sonotas/compare/v1.0.0...v1.1.0) (2026-10-25)


### Reverts

* undo the glide tweak ([0123456](https://github.com/sovrin/sonotas/commit/0123456))

## 1.0.0 (2026-10-20)


### Bug Fixes

* **export:** fast export no longer stalls ([fedcba9](https://github.com/sovrin/sonotas/commit/fedcba9))
`

test('keeps what a user notices, in their words', () => {
  assert.deepEqual(parseChangelog(MD), [
    {
      version: '1.2.0',
      date: '2026-11-02',
      sections: [
        { title: 'New', items: ['Zoom the bar strip, with an overview', 'Paste a MusicXML file'] },
        { title: 'Faster', items: ['Reuse the canvas between frames'] }
      ]
    },
    // 1.1.0 had nothing to show
    { version: '1.0.0', date: '2026-10-20', sections: [{ title: 'Fixed', items: ['Fast export no longer stalls'] }] }
  ])
})

test('limits to the newest releases', () => {
  assert.equal(parseChangelog(MD, 1).length, 1)
  assert.equal(parseChangelog(MD, 1)[0]!.version, '1.2.0')
})

test('no changelog yet', () => {
  assert.deepEqual(parseChangelog(''), [])
})
