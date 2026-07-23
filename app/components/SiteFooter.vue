<script setup>
const { setPage } = useSonotas()
</script>

<template>
  <footer style="border-top:1px solid var(--border-soft);margin-top:auto">
    <div
      class="page footwrap"
      style="max-width:1320px;margin:0 auto;width:100%;padding:34px 32px 26px;display:flex;justify-content:space-between;gap:36px;flex-wrap:wrap"
    >
      <div style="max-width:300px">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
          <div
            style="width:22px;height:22px;border-radius:6px;background:linear-gradient(140deg,var(--accent),var(--adk));display:flex;align-items:center;justify-content:center"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--logo-fg)"
              stroke-width="2.2"
              stroke-linecap="round"
            >
              <path d="M9 18V5l10-2v13" />
              <circle
                cx="6"
                cy="18"
                r="3"
              />
              <circle
                cx="16"
                cy="16"
                r="3"
              />
            </svg>
          </div>
          <span style="font-weight:600;font-size:16px">sonotas</span>
        </div>
        <p style="font-size:13px;color:var(--t3);margin:0;line-height:1.6">
          Render Guitar Pro tabs into clean, postable video — entirely in your browser.
        </p>
      </div>
      <div style="display:flex;gap:56px;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--t4);margin-bottom:13px">
            Product
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start">
            <button
              class="foot-link"
              style="background:none;border:none;padding:0;font-family:inherit;font-size:13.5px;color:var(--t2);cursor:pointer;text-align:left;transition:color .15s"
              @click="setPage('app')"
            >
              Renderer
            </button>
            <button
              class="foot-link"
              style="background:none;border:none;padding:0;font-family:inherit;font-size:13.5px;color:var(--t2);cursor:pointer;text-align:left;transition:color .15s"
              @click="setPage('how')"
            >
              How it works
            </button>
            <button
              class="foot-link"
              style="background:none;border:none;padding:0;font-family:inherit;font-size:13.5px;color:var(--t2);cursor:pointer;text-align:left;transition:color .15s"
              @click="setPage('formats')"
            >
              Formats
            </button>
            <button
              class="foot-link"
              style="background:none;border:none;padding:0;font-family:inherit;font-size:13.5px;color:var(--t2);cursor:pointer;text-align:left;transition:color .15s"
              @click="setPage('faq')"
            >
              FAQ
            </button>
          </div>
        </div>
        <div style="max-width:230px">
          <div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--t4);margin-bottom:13px">
            Private by design
          </div>
          <p style="font-size:13px;color:var(--t3);margin:0;line-height:1.6">
            No uploads, no accounts, no tracking. Your files never leave your device.
          </p>
        </div>
      </div>
    </div>
    <div
      class="page"
      style="max-width:1320px;margin:0 auto;width:100%;padding:16px 32px 32px;border-top:1px solid var(--border-soft);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12.5px;color:var(--t5)"
    >
      <span>sonotas · 2026 — render guitar tabs to video</span>
      <span>built with <span style="color:var(--a2)">&#9829;</span> by <a
        href="https://sovrin.de"
        target="_blank"
        rel="noopener"
        style="color:var(--a3);text-decoration:none"
      >sovrin.de</a></span>
    </div>
  </footer>
</template>
