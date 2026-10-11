<script setup>
// A row of preset colours as one radio group, then any colour at all from the
// system picker. Each swatch is named for screen readers since the square
// alone says nothing.
const props = defineProps({
  colors: { type: Array, required: true },
  selected: { type: String, required: true },
  label: { type: String, required: true }
})
defineEmits(['pick'])

const name = useId()
// A colour that isn't a preset came from the picker; it wears the selection ring.
const custom = computed(() => !props.colors.some(c => c.hex === props.selected.toLowerCase()))
</script>

<template>
  <div class="cluster gap-3">
    <div
      class="swatch-group"
      role="radiogroup"
      :aria-label="label"
    >
      <label
        v-for="c in colors"
        :key="c.hex"
        :title="c.name"
        :style="{ '--swatch': c.hex }"
      >
        <input
          type="radio"
          :name="name"
          :checked="selected.toLowerCase() === c.hex"
          @change="$emit('pick', c.hex)"
        >
        <span class="sr-only">{{ c.name }}</span>
      </label>
    </div>
    <input
      type="color"
      class="input swatch-custom"
      title="Custom colour"
      :aria-label="`${label}: custom`"
      :value="selected"
      :data-active="custom || undefined"
      @input="$emit('pick', $event.target.value)"
    >
  </div>
</template>
