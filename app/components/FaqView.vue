<script setup>
const { s, faq, setPage } = useSonotas()
</script>

<template>
  <section
    v-if="s.page === 'faq'"
    class="page"
    style="max-width:760px;margin:0 auto;width:100%;padding:44px 32px 64px"
  >
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--a2);margin-bottom:12px">
      FAQ
    </div>
    <h2 style="font-size:33px;line-height:1.08;letter-spacing:-.02em;font-weight:600;margin:0 0 30px;color:var(--heading)">
      Questions &amp; answers.
    </h2>
    <div
      v-for="(qa, i) in faq"
      :key="i"
      :style="`border-top:1px solid var(--border-soft);padding:18px 0${i === faq.length - 1 ? ';border-bottom:1px solid var(--border-soft)' : ''}`"
    >
      <h3
        style="font-size:16px;font-weight:600;margin:0 0 6px;color:var(--heading)"
      >
        {{ qa.q }}
      </h3>
      <p style="font-size:14.5px;color:var(--t3);margin:0;line-height:1.6">
        {{ qa.a }}
      </p>
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
