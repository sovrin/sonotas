<script setup>
// The file that comes out: its size, smoothness, quality and pace.
const { s, setField, toggle } = useSonotas()

const RESOLUTIONS = ['1080p', '720p', '480p'].map(v => ({ v, label: v }))
const FPS = ['24 fps', '30 fps', '60 fps'].map(v => ({ v, label: v.replace(' fps', '') }))
const QUALITY = ['Standard', 'High', 'Max'].map(v => ({ v, label: v }))
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup title="Format">
      <SegmentedField
        name="resolution"
        label="Resolution"
        :options="RESOLUTIONS"
      />
      <SegmentedField
        name="fps"
        label="Frames per second"
        :options="FPS"
      />
      <SegmentedField
        name="quality"
        label="Quality"
        :options="QUALITY"
      />
      <div class="field">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.fastExport"
            @change="toggle('fastExport')"
          >
          Fast export
        </label>
        <small>Several encoders at once: about 3× faster on multi-core machines, with 2–3× larger files and slightly softer motion.</small>
      </div>
    </InspectorGroup>

    <InspectorGroup title="Timing">
      <div class="field">
        <label for="speed">Speed</label>
        <div class="select">
          <select
            id="speed"
            name="speed"
            class="input"
            data-size="s"
            :value="s.speed"
            @change="setField"
          >
            <option>0.25×</option>
            <option>0.5×</option>
            <option>0.75×</option>
            <option>1×</option>
            <option>1.25×</option>
            <option>1.5×</option>
            <option>2×</option>
          </select>
        </div>
        <small>Also scales the length of the video.</small>
      </div>
    </InspectorGroup>
  </div>
</template>
