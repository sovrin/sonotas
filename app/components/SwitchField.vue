<script setup>
// A switch bound to one boolean store field: its name, the switch at the row's
// end, and an optional hint under them.
defineProps({
  name: { type: String, required: true },
  label: { type: String, required: true }
})

const { s, toggle } = useSonotas()
</script>

<template>
  <div class="field">
    <label class="switch-row">
      <span>{{ label }}</span>
      <input
        type="checkbox"
        role="switch"
        :checked="s[name]"
        @change="toggle(name)"
      >
    </label>
    <slot />
  </div>
</template>
