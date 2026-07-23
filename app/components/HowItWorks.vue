<script setup>
const { s, howSteps, setPage } = useSonotas()
</script>

<template>
  <section
    v-if="s.page === 'how'"
    class="page"
    style="max-width:1120px;margin:0 auto;width:100%;padding:44px 32px 64px"
  >
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--a2);margin-bottom:12px">
      How it works
    </div>
    <h2 style="font-size:33px;line-height:1.08;letter-spacing:-.02em;font-weight:600;margin:0 0 12px;color:var(--heading)">
      From tab to post in four steps.
    </h2>
    <p style="font-size:16px;color:var(--t2);max-width:560px;margin:0 0 30px;line-height:1.55">
      No timeline app, no stems, no render farm. Load a file and sonotas draws every
      frame on your own machine.
    </p>
    <div
      class="grid2"
      style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:840px"
    >
      <div
        v-for="step in howSteps"
        :key="step.n"
        style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px"
      >
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">
          <div
            style="width:28px;height:28px;border-radius:8px;background:var(--tint2);color:var(--a2);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px"
          >
            {{ step.n }}
          </div>
          <h3 style="font-size:16px;font-weight:600;margin:0;color:var(--heading)">
            {{ step.title }}
          </h3>
        </div>
        <p style="font-size:14px;color:var(--t3);margin:0;line-height:1.6">
          {{ step.body }}
        </p>
      </div>
    </div>
    <button
      style="display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 20px;margin-top:30px;border-radius:10px;border:1.5px solid var(--accent);background:var(--tint2);color:var(--a3);font-family:inherit;font-weight:600;font-size:14.5px;cursor:pointer;box-shadow:0 0 22px var(--tint3)"
      @click="setPage('app')"
    >
      Start rendering
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  </section>
</template>
