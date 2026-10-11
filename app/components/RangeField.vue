<script setup>
// A labelled slider bound to one numeric store field. The track fill is
// aequitas' --value, kept in step with the value here instead of aequitas.js.
const props = defineProps({
  name: { type: String, required: true },
  label: { type: String, required: true },
  ariaLabel: { type: String, default: undefined },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  unit: { type: String, default: '' }
})

const { s, setNum } = useSonotas()
const id = useId()
const fill = computed(() => ((s[props.name] - props.min) / (props.max - props.min)) * 100 + '%')
</script>

<template>
  <div class="field">
    <label
      :for="id"
      class="flex justify-between"
    >
      <span>{{ label }}</span>
      <span class="tabular">{{ s[name] }}{{ unit }}</span>
    </label>
    <input
      :id="id"
      type="range"
      :name="name"
      :aria-label="ariaLabel"
      :min="min"
      :max="max"
      step="1"
      :value="s[name]"
      :style="{ '--value': fill }"
      @input="setNum"
    >
  </div>
</template>
