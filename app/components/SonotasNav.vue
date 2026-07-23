<script setup>
const { s, v, setPage, toggleTheme } = useSonotas()
</script>

<template>
  <header
    class="page"
    style="display:flex;align-items:center;gap:16px;padding:16px 32px;max-width:1320px;margin:0 auto;width:100%"
  >
    <div
      style="display:flex;align-items:center;gap:10px;margin-right:auto;cursor:pointer"
      @click="setPage('app')"
    >
      <div
        style="width:26px;height:26px;border-radius:7px;background:linear-gradient(140deg,var(--accent),var(--adk));display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px var(--tint4)"
      >
        <svg
          width="15"
          height="15"
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
      <span style="font-weight:600;font-size:18px;letter-spacing:-.01em">sonotas</span>
    </div>
    <nav style="display:flex;align-items:center;gap:26px;font-size:13.5px;color:var(--t2)">
      <span
        class="nav-mid"
        style="display:contents"
      >
        <button
          :style="v.navHow"
          :aria-current="v.curHow"
          @click="setPage('how')"
        >How it works</button>
        <button
          :style="v.navFormats"
          :aria-current="v.curFormats"
          @click="setPage('formats')"
        >Formats</button>
        <button
          :style="v.navFaq"
          :aria-current="v.curFaq"
          @click="setPage('faq')"
        >FAQ</button>
      </span>
      <div style="display:flex;align-items:center;gap:6px;color:var(--t3);font-size:12.5px">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect
            x="5"
            y="11"
            width="14"
            height="10"
            rx="2"
          />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>runs in your browser</span>
      </div>
      <button
        class="theme-btn"
        aria-label="Toggle light and dark"
        style="width:34px;height:34px;flex:none;border-radius:8px;border:1px solid var(--border2);background:var(--surface);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:color .15s,background .15s"
        @click="toggleTheme"
      >
        <svg
          v-if="s.uiTheme === 'dark'"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle
            cx="12"
            cy="12"
            r="4"
          />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg
          v-else
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </nav>
  </header>
</template>
