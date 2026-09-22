<script setup>
const { s, toggleTheme } = useSonotas()
</script>

<template>
  <header class="wrap header">
    <div class="wordmark">
      sonotas
      <small>Guitar Pro tabs to video</small>
    </div>
    <button
      class="btn icon"
      :aria-label="s.uiTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="toggleTheme"
    >
      <UIcon
        :name="s.uiTheme === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
        size="16"
      />
    </button>
  </header>
</template>
