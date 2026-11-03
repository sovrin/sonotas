<script setup>
// The goal of the page, pinned under the settings: what the export will make,
// the button that makes it, its progress, and the file once it exists.
import { t } from '~/utils/i18n'

const { s, v, startRender, cancelRender, closeRender, download } = useSonotas()

const scope = computed(() => {
  if (!s.renderOnlyBars) return t('export.scope.song')
  return s.fromBar === s.toBar ? t('export.scope.bar', { bar: s.fromBar }) : t('export.scope.bars', { from: s.fromBar, to: s.toBar })
})
</script>

<template>
  <footer
    class="export-panel stack gap-3"
    :aria-label="t('export.label')"
  >
    <template v-if="v.isDone">
      <div
        class="stack gap-1"
        role="status"
      >
        <strong class="text-s">{{ t('export.done.title') }}</strong>
        <span class="text-s text-muted font-mono tabular">{{ v.outName }} · {{ v.sizeLabel }}</span>
      </div>
      <button
        class="btn w-full"
        data-variant="primary"
        @click="download"
      >
        <i
          class="icon"
          data-icon="download"
        />
        {{ t('export.download') }}
      </button>
      <button
        class="btn w-full"
        data-size="s"
        data-variant="ghost"
        @click="closeRender"
      >
        {{ s.downloaded ? t('export.back') : t('export.discard') }}
      </button>
    </template>

    <template v-else-if="v.isRendering">
      <div class="stack gap-2">
        <div class="flex justify-between text-s">
          <span role="status">{{ v.phase }}</span>
          <span class="font-mono tabular">{{ v.pct }}%</span>
        </div>
        <progress
          :value="v.pct"
          max="100"
          :aria-label="t('export.progress')"
        />
      </div>
      <button
        class="btn w-full"
        data-size="s"
        @click="cancelRender"
      >
        {{ t('export.cancel') }}
      </button>
    </template>

    <template v-else>
      <div
        v-if="!s.canExport"
        class="alert"
        data-tone="warning"
        role="alert"
      >
        <div><strong>{{ t('export.unsupported.title') }}</strong> {{ t('export.unsupported.body') }}</div>
      </div>
      <div
        v-else-if="s.exportError"
        class="alert"
        data-tone="danger"
        role="alert"
      >
        <div><strong>{{ t('export.failed.title') }}</strong> {{ s.exportError }} {{ t('export.failed.retry') }}</div>
      </div>
      <div class="stack gap-1">
        <span class="text-s">{{ scope }} · {{ v.aspectLabel }}</span>
        <span class="text-s font-mono tabular">{{ v.estLine }}</span>
      </div>
      <button
        class="btn w-full"
        data-variant="primary"
        :disabled="!s.ready || s.building || !s.canExport"
        @click="startRender"
      >
        {{ t('export.start') }}
      </button>
    </template>
  </footer>
</template>
