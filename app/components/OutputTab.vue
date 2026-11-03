<script setup>
// The file that comes out: its size, smoothness, quality and pace.
import { t } from '~/utils/i18n'

const { s, setField, toggle } = useSonotas()

const RESOLUTIONS = ['1080p', '720p', '480p'].map(v => ({ v, label: v }))
const FPS = ['24 fps', '30 fps', '60 fps'].map(v => ({ v, label: v.replace(' fps', '') }))
const QUALITY = computed(() => [
  { v: 'Standard', label: t('output.quality.standard') },
  { v: 'High', label: t('output.quality.high') },
  { v: 'Max', label: t('output.quality.max') }
])
</script>

<template>
  <div
    class="stack"
    data-divided
  >
    <InspectorGroup :title="t('output.format.title')">
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
      <div class="field">
        <label>
          <input
            type="checkbox"
            role="switch"
            :checked="s.fastExport"
            @change="toggle('fastExport')"
          >
          {{ t('output.fast.label') }}
        </label>
        <small>{{ t('output.fast.hint') }}</small>
      </div>
    </InspectorGroup>

    <InspectorGroup :title="t('output.timing.title')">
      <div class="field">
        <label for="speed">{{ t('output.speed.label') }}</label>
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
        <small>{{ t('output.speed.hint') }}</small>
      </div>
    </InspectorGroup>
  </div>
</template>
