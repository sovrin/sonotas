<script setup>
const { s, v } = provideSonotas()
</script>

<template>
  <div
    class="sono"
    :data-theme="s.uiTheme"
    style="min-height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--text);transition:background .25s,color .25s"
  >
    <!-- NAV -->
    <SonotasNav />

    <!-- APP -->
    <template v-if="s.page === 'app'">
      <SonotasHero />

      <!-- WORKSPACE -->
      <main
        class="page ws"
        style="max-width:1320px;margin:0 auto;width:100%;padding:22px 32px 48px;display:grid;grid-template-columns:minmax(0,1fr) 356px;gap:24px;align-items:start"
      >
        <!-- STAGE -->
        <section style="display:flex;flex-direction:column;gap:14px;min-width:0">
          <FrameControls />

          <TabCanvas />

          <TransportBar />
        </section>

        <!-- CONTROLS -->
        <aside
          class="controls"
          style="background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 6px 18px rgba(0,0,0,.35);position:sticky;top:16px;display:flex;flex-direction:column;overflow:hidden"
        >
          <ModeToggle />

          <div
            class="ctrl-scroll"
            style="overflow-y:auto;max-height:calc(100vh - 220px)"
          >
            <SourceSection />
            <TrackSelect />
            <FormatSection />
            <!-- ADVANCED -->
            <template v-if="s.mode === 'advanced'">
              <OutputSection />
              <PlaybackSection />
              <CursorSection />
              <ColorsSection />
              <LabelsSection />
              <BarsSection />
            </template>
          </div>

          <RenderFooter />
        </aside>
      </main>
    </template>

    <HowItWorks />
    <FormatsView />
    <FaqView />
    <SiteFooter />

    <RenderModal />
  </div>
</template>
