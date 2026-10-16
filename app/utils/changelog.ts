// The "What's new" list, read from the CHANGELOG.md that release-please
// writes. Only what a user notices is kept (features, fixes, speed-ups),
// without the commit scope, links and hashes meant for developers. Commit
// subjects become this copy word for word, hence the rule in AGENTS.md.

export interface Release {
  version: string
  date: string // YYYY-MM-DD
  sections: { title: string, items: string[] }[]
}

// release-please's section heading → ours. Others (breaking changes,
// reverts, …) stay in the developer changelog.
const SECTIONS: Record<string, string> = {
  'Features': 'New',
  'Bug Fixes': 'Fixed',
  'Performance Improvements': 'Faster'
}

/** The newest `limit` releases with something to show, newest first. */
export function parseChangelog(md: string, limit = 3): Release[] {
  const releases: Release[] = []
  let items: string[] | null = null // the kept section being read, or null
  for (const line of md.split('\n')) {
    // `## [1.1.0](compare-url) (2026-10-20)`, or `## 1.0.0 (…)` for the first
    const rel = line.match(/^#{1,2} \[?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))? \((\d{4}-\d{2}-\d{2})\)/)
    if (rel) {
      releases.push({ version: rel[1]!, date: rel[2]!, sections: [] })
      items = null
      continue
    }
    const sec = line.match(/^### (.+)$/)
    if (sec) {
      const title = SECTIONS[sec[1]!.trim()]
      items = title && releases.length ? [] : null
      if (items) releases.at(-1)!.sections.push({ title: title!, items })
      continue
    }
    // `* **scope:** subject ([abc1234](url)), closes [#12](url)`
    const item = line.match(/^[*-] (.+)$/)
    if (item && items) {
      const text = item[1]!
        .replace(/^\*\*[^*]+:\*\* /, '')
        .replace(/ \(\[[0-9a-f]{7,40}\]\(.*$/, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      items.push(text.charAt(0).toUpperCase() + text.slice(1))
    }
  }
  return releases.filter(r => r.sections.length).slice(0, limit)
}
