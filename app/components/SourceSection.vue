<script setup>
const { s, loadFile } = useSonotas()

const ACCEPT = '.gp,.gpx,.gp3,.gp4,.gp5,.xml,.musicxml,.mxl'
const fileInput = ref(null)
const dragging = ref(false)

function browse() {
  fileInput.value?.click()
}

function onPick(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
  e.target.value = '' // allow re-picking the same file
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}
</script>

<template>
  <div style="padding:16px;border-bottom:1px solid var(--border-soft)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Source
      </h3>
    </div>
    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPT"
      style="display:none"
      @change="onPick"
    >
    <div
      class="dropzone"
      role="button"
      tabindex="0"
      :style="`border:1.5px dashed ${dragging ? 'var(--accent)' : 'var(--tint4)'};background:${dragging ? 'var(--tint2)' : 'var(--drop)'};border-radius:10px;padding:18px 14px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s`"
      @click="browse"
      @keydown.enter.prevent="browse"
      @keydown.space.prevent="browse"
      @dragover.prevent="dragging = true"
      @dragenter.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="margin:0 auto 8px"
      >
        <path d="M12 3v12" />
        <path d="M8 7l4-4 4 4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <div style="font-size:13px;color:var(--heading)">
        Drop a Guitar Pro file, or <span style="color:var(--a2);text-decoration:underline">browse</span>
      </div>
      <div style="font-size:11px;color:var(--t4);margin-top:5px">
        .gp · .gpx · .xml · .mxl and more
      </div>
    </div>
    <div
      v-if="s.loadError"
      style="margin-top:10px;font-size:11.5px;color:var(--danger, #e5484d);line-height:1.4"
    >
      {{ s.loadError }}
    </div>
    <div
      style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding:9px 11px;background:var(--inset);border:1px solid var(--tint3);border-radius:9px"
    >
      <div style="display:flex;align-items:center;gap:9px;min-width:0">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex:none;box-shadow:0 0 8px var(--accent)" />
        <div style="min-width:0">
          <div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            {{ s.sourceName }}
          </div>
          <div style="font-size:11px;color:var(--t4)">
            {{ s.isDemo ? 'sample · loaded' : 'your file · loaded' }}
          </div>
        </div>
      </div>
      <span
        v-if="s.isDemo"
        style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--a2);border:1px solid var(--tint4);border-radius:99px;padding:2px 8px"
      >demo</span>
    </div>
  </div>
</template>
