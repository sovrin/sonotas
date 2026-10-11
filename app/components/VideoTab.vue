<script setup>
// The file that comes out: its frame, size, smoothness and pace.
const { s, setField, setAspect } = useSonotas()

const ASPECTS = [
  { v: '16:9', w: 16, h: 9, hint: 'For YouTube' },
  { v: '9:16', w: 9, h: 16, hint: 'For Shorts, Reels, TikTok' },
  { v: '1:1', w: 1, h: 1, hint: 'For feeds' }
]
const hint = computed(() => ASPECTS.find(a => a.v === s.aspect)?.hint)

const RESOLUTIONS = ['1080p', '720p', '480p'].map(v => ({ v, label: v }))
const FPS = ['24 fps', '30 fps', '60 fps'].map(v => ({ v, label: v.replace(' fps', '') }))
const QUALITY = ['Standard', 'High', 'Max'].map(v => ({ v, label: v }))
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup title="Frame">
      <div class="field">
        <div
          class="segmented"
          data-fill
          role="radiogroup"
          aria-label="Frame"
        >
          <label
            v-for="a in ASPECTS"
            :key="a.v"
          >
            <input
              type="radio"
              name="aspect"
              :checked="s.aspect === a.v"
              @change="setAspect(a.v)"
            >
            <span>
              <i
                class="ratio-glyph"
                :style="{ aspectRatio: `${a.w} / ${a.h}` }"
                aria-hidden="true"
              />
              {{ a.v }}
            </span>
          </label>
        </div>
        <small>{{ hint }}</small>
      </div>
    </InspectorGroup>

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
