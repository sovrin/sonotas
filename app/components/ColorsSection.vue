<script setup>
const { s, setField } = useSonotas()

const rows = [
  { name: 'bg', label: 'Background' },
  { name: 'fg', label: 'Notation' },
  { name: 'barNum', label: 'Bar numbers' }
]
</script>

<template>
  <div style="padding:16px;border-bottom:1px solid var(--border-soft)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle
          cx="13.5"
          cy="6.5"
          r="2.5"
        />
        <circle
          cx="17.5"
          cy="10.5"
          r="2.5"
        />
        <circle
          cx="8.5"
          cy="7.5"
          r="2.5"
        />
        <circle
          cx="6.5"
          cy="12.5"
          r="2.5"
        />
        <path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2 10 10 0 0 0-9-11z" />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Colours
      </h3>
    </div>
    <div
      v-for="row in rows"
      :key="row.name"
      style="display:flex;align-items:center;justify-content:space-between;padding:5px 0"
    >
      <span style="font-size:13.5px;color:var(--text)">{{ row.label }}</span>
      <div style="display:flex;align-items:center;gap:9px">
        <span style="font-size:11px;color:var(--t4);font-variant-numeric:tabular-nums;text-transform:uppercase">{{ s[row.name] }}</span>
        <input
          type="color"
          :name="row.name"
          :value="s[row.name]"
          :aria-label="row.label"
          style="width:36px;height:26px;padding:2px;border:1px solid var(--border2);border-radius:6px;background:var(--inset);cursor:pointer"
          @input="setField"
        >
      </div>
    </div>
    <p style="font-size:11.5px;color:var(--t4);margin:8px 0 0;line-height:1.5">
      Overrides the Dark/Light canvas preset. Notation &amp; bar numbers re-render.
    </p>
  </div>
</template>
