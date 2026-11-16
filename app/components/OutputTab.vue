<script setup>
// The file that comes out: its size, smoothness, quality and pace.
import { t } from '~/utils/i18n'
import { GROUPS } from '~/utils/settings-groups'

const { s } = useSonotas()

const RESOLUTIONS = ['1080p', '720p', '480p'].map(v => ({ v, label: v }))
const FPS = ['24 fps', '30 fps', '60 fps'].map(v => ({ v, label: v.replace(' fps', '') }))
const QUALITY = computed(() => [
  { v: 'Standard', label: t('output.quality.standard') },
  { v: 'High', label: t('output.quality.high') },
  { v: 'Max', label: t('output.quality.max') }
])
// Speed is a fixed set of steps, so a stepped slider with each step named under it.
const SPEEDS = ['0.25×', '0.5×', '0.75×', '1×', '1.25×', '1.5×', '2×']
const speedAt = computed(() => Math.max(0, SPEEDS.indexOf(s.speed)))
function setSpeed(e) {
  s.speed = SPEEDS[Number(e.target.value)]
}
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup
      :title="t('output.format.title')"
      :keys="GROUPS.output.format"
    >
      <SegmentedField
        name="resolution"
        :label="t('output.resolution.label')"
        :options="RESOLUTIONS"
      />
      <SegmentedField
        name="fps"
        :label="t('output.fps.label')"
        :options="FPS"
      />
      <SegmentedField
        name="quality"
        :label="t('output.quality.label')"
        :options="QUALITY"
      >
        <small>{{ t('output.quality.hint') }}</small>
      </SegmentedField>
      <SwitchField
        name="fastExport"
        :label="t('output.fast.label')"
      >
        <small>{{ t('output.fast.hint') }}</small>
      </SwitchField>
    </InspectorGroup>

    <InspectorGroup
      :title="t('output.timing.title')"
      :keys="GROUPS.output.timing"
    >
      <div class="field">
        <label
          for="speed"
          class="flex justify-between"
        >
          <span class="text-muted">{{ t('output.speed.label') }}</span>
          <span class="tabular">{{ s.speed }}</span>
        </label>
        <input
          id="speed"
          type="range"
          min="0"
          :max="SPEEDS.length - 1"
          step="1"
          :value="speedAt"
          :aria-valuetext="s.speed"
          :style="{ '--value': (speedAt / (SPEEDS.length - 1)) * 100 + '%' }"
          @input="setSpeed"
        >
        <div
          class="ticks"
          aria-hidden="true"
        >
          <span
            v-for="(sp, i) in SPEEDS"
            :key="sp"
            :data-on="i === speedAt || undefined"
          >{{ sp }}</span>
        </div>
        <small>{{ t('output.speed.hint') }}</small>
      </div>
    </InspectorGroup>
  </div>
</template>
