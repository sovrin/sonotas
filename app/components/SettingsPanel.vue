<script setup>
const { s, toggleAdvanced } = useSonotas()
</script>

<template>
  <aside class="panel">
    <div class="panel-scroll">
      <FileRow />
      <TrackSelect />
      <FrameSection />
      <LookSection />

      <details
        class="more"
        :open="s.advanced"
        @toggle="e => e.target.open !== s.advanced && toggleAdvanced()"
      >
        <summary>
          More options
          <UIcon
            name="i-lucide-chevron-down"
            class="chev"
            size="14"
          />
        </summary>
        <MoreOptions />
      </details>
    </div>

    <ExportPanel />
  </aside>
</template>
