<script setup>
// One labelled group in the inspector. The optional #toggle slot puts a
// switch in the heading row and receives the heading's id to label it with.
defineProps({
  title: { type: String, required: true }
})

const id = useId()
</script>

<template>
  <section
    class="stack gap-3"
    :aria-labelledby="id"
  >
    <div class="flex items-center justify-between gap-3">
      <h6
        :id="id"
        class="eyebrow"
      >
        {{ title }}
      </h6>
      <slot
        name="toggle"
        :labelledby="id"
      />
    </div>
    <slot />
  </section>
</template>
