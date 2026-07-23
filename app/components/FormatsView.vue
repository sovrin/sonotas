<script setup>
const { s, setPage } = useSonotas()
</script>

<template>
  <section
    v-if="s.page === 'formats'"
    class="page"
    style="max-width:1120px;margin:0 auto;width:100%;padding:44px 32px 64px"
  >
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--a2);margin-bottom:12px">
      Formats
    </div>
    <h2 style="font-size:33px;line-height:1.08;letter-spacing:-.02em;font-weight:600;margin:0 0 12px;color:var(--heading)">
      Built for every platform.
    </h2>
    <p style="font-size:16px;color:var(--t2);max-width:560px;margin:0 0 30px;line-height:1.55">
      Render once for wherever you post. Every ratio is exported at true pixel
      dimensions.
    </p>
    <div
      class="grid3"
      style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:840px;margin-bottom:20px"
    >
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
        <div style="width:64px;height:36px;border:1.5px solid var(--accent);border-radius:5px;background:var(--tint);margin-bottom:14px" />
        <h3 style="font-size:16px;font-weight:600;margin:0 0 4px;color:var(--heading)">
          16:9
        </h3>
        <p style="font-size:13px;color:var(--t3);margin:0">
          Landscape — YouTube, embeds
        </p>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
        <div style="width:28px;height:50px;border:1.5px solid var(--accent);border-radius:5px;background:var(--tint);margin-bottom:14px" />
        <h3 style="font-size:16px;font-weight:600;margin:0 0 4px;color:var(--heading)">
          9:16
        </h3>
        <p style="font-size:13px;color:var(--t3);margin:0">
          Vertical — Shorts, Reels, TikTok
        </p>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px">
        <div style="width:44px;height:44px;border:1.5px solid var(--accent);border-radius:5px;background:var(--tint);margin-bottom:14px" />
        <h3 style="font-size:16px;font-weight:600;margin:0 0 4px;color:var(--heading)">
          1:1
        </h3>
        <p style="font-size:13px;color:var(--t3);margin:0">
          Square — feed posts
        </p>
      </div>
    </div>
    <div
      class="grid2"
      style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:840px"
    >
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:4px 18px 12px">
        <div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--a2);padding:16px 0 4px">
          Input
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-top:1px solid var(--border-soft);font-size:14px">
          <span style="color:var(--t2)">Guitar Pro</span><span
            style="color:var(--t4)"
          >.gp · .gpx · .gp3–5</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-top:1px solid var(--border-soft);font-size:14px">
          <span style="color:var(--t2)">MusicXML</span><span
            style="color:var(--t4)"
          >.xml · .musicxml · .mxl</span>
        </div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:4px 18px 12px">
        <div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--a2);padding:16px 0 4px">
          Output
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-top:1px solid var(--border-soft);font-size:14px">
          <span style="color:var(--t2)">Container</span><span
            style="color:var(--t4)"
          >MP4 · H.264</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-top:1px solid var(--border-soft);font-size:14px">
          <span style="color:var(--t2)">Resolution</span><span
            style="color:var(--t4)"
          >480p · 720p · 1080p</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-top:1px solid var(--border-soft);font-size:14px">
          <span style="color:var(--t2)">Frame rate</span><span
            style="color:var(--t4)"
          >24 · 30 · 60 fps</span>
        </div>
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
