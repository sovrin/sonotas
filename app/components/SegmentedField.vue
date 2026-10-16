<script setup>
// A labelled choice bound to one store field, every option in view: one
// click instead of opening a dropdown for two to four values.
const props = defineProps({
  name: { type: String, required: true },
  label: { type: String, required: true },
  options: { type: Array, required: true }, // [{ v, label }]
  set: { type: Function, default: null } // picks instead of writing the field, for side effects
})

const { s } = useSonotas()
const id = useId()
function pick(v) {
  if (props.set) props.set(v)
  else s[props.name] = v
}
</script>

<template>
  <div class="field">
    <label :id="id">{{ label }}</label>
    <div
      class="segmented"
      data-fill
      role="radiogroup"
      :aria-labelledby="id"
    >
      <label
        v-for="o in options"
        :key="o.v"
      >
        <input
          type="radio"
          :name="`${name}-${id}`"
          :checked="s[name] === o.v"
          @change="pick(o.v)"
        >
        <span>{{ o.label }}</span>
      </label>
    </div>
    <slot />
  </div>
</template>
