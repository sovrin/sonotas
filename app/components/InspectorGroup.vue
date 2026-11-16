<script setup>
// One labelled group in the inspector. The optional #toggle slot puts a
// switch in the heading row and receives the heading's id to label it with.
// Given its settings' keys, the heading offers Reset while any is off its default.
import { t } from '~/utils/i18n'

const props = defineProps({
  title: { type: String, required: true },
  keys: { type: Array, default: null }
})

const { changed, resetSettings } = useSonotas()
const id = useId()
const offDefault = computed(() => props.keys && changed(props.keys))
</script>

<template>
  <section
    class="stack gap-3"
    :aria-labelledby="id"
  >
    <div class="flex items-center justify-between gap-3">
      <h2
        :id="id"
        class="eyebrow"
      >
        {{ title }}
      </h2>
      <span class="cluster gap-3">
        <button
          v-if="offDefault"
          class="btn reset"
          data-size="s"
          data-variant="ghost"
          data-tone="neutral"
          :aria-label="t('settings.reset.label', { group: title })"
          @click="resetSettings(keys)"
        >
          {{ t('settings.reset') }}
        </button>
        <slot
          name="toggle"
          :labelledby="id"
        />
      </span>
    </div>
    <slot />
  </section>
</template>
