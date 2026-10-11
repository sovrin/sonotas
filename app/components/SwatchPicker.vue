<script setup>
// A row of preset colours as one radio group; each swatch is named for
// screen readers since the square alone says nothing.
defineProps({
  colors: { type: Array, required: true },
  selected: { type: String, required: true },
  label: { type: String, required: true }
})
defineEmits(['pick'])

const name = useId()
</script>

<template>
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
        :checked="selected === c.hex"
        @change="$emit('pick', c.hex)"
      >
      <span class="sr-only">{{ c.name }}</span>
    </label>
  </div>
</template>
