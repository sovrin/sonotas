<script setup>
const { s, v, cancelRender, closeRender, download } = useSonotas()
</script>

<template>
  <div
    v-if="v.renderOpen"
    style="position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:24px;background:rgba(15,17,26,.72);backdrop-filter:blur(6px)"
  >
    <div
      style="width:min(560px,100%);max-height:calc(100vh - 48px);background:var(--surface);border:1px solid var(--border2);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:auto"
    >
      <!-- rendering -->
      <div
        v-if="v.isRendering"
        style="padding:28px"
      >
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
          <div style="width:40px;height:40px;flex:none;border-radius:50%;border:3px solid var(--tint3);border-top-color:var(--accent);animation:sp .8s linear infinite" />
          <div>
            <div style="font-size:17px;font-weight:600;color:var(--heading)">
              Rendering your video
            </div>
            <div style="font-size:13px;color:var(--t3)">
              {{ v.phase }}
            </div>
          </div>
          <div style="margin-left:auto;font-size:24px;font-weight:600;color:var(--a2);font-variant-numeric:tabular-nums">
            {{ v.pctLabel }}
          </div>
        </div>
        <div style="height:8px;border-radius:99px;background:var(--inset);overflow:hidden;margin-bottom:14px">
          <div
            :style="`height:100%;width:${v.pctW};border-radius:99px;background:linear-gradient(90deg,var(--adk),var(--accent));box-shadow:0 0 12px var(--tint5)`"
          />
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t4);margin-bottom:22px">
          <span>Frame {{ v.frame }} / {{ v.totalFrames }}</span>
          <span>{{ v.estLine }}</span>
        </div>
        <div style="display:flex;justify-content:flex-end">
          <button
            style="height:38px;padding:0 16px;border-radius:9px;border:1px solid var(--border2);background:transparent;color:var(--text);font:inherit;font-size:13.5px;cursor:pointer"
            @click="cancelRender"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- done -->
      <div v-if="v.isDone">
        <div style="padding:24px 28px 0;display:flex;align-items:center;gap:10px">
          <div style="width:26px;height:26px;border-radius:50%;background:var(--tint2);display:flex;align-items:center;justify-content:center">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--a2)"
              stroke-width="2.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div style="font-size:17px;font-weight:600;color:var(--heading)">
            Your video is ready
          </div>
          <button
            aria-label="Close"
            style="margin-left:auto;width:30px;height:30px;border-radius:8px;border:none;background:transparent;color:var(--t3);cursor:pointer;display:flex;align-items:center;justify-content:center"
            @click="closeRender"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style="padding:18px 28px 0;display:flex;justify-content:center">
          <div style="max-width:100%;border-radius:11px;overflow:hidden;background:var(--inset);box-shadow:0 0 0 1px var(--border)">
            <video
              v-if="s.videoUrl"
              :src="s.videoUrl"
              :poster="s.posterUrl || undefined"
              controls
              playsinline
              preload="metadata"
              style="display:block;max-width:100%;height:auto;background:var(--inset)"
            />
          </div>
        </div>
        <div style="padding:16px 28px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div>
            <div style="font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--t4)">
              Format
            </div>
            <div style="font-size:14px;color:var(--text);margin-top:2px">
              MP4
            </div>
          </div>
          <div>
            <div style="font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--t4)">
              Resolution
            </div>
            <div style="font-size:14px;color:var(--text);margin-top:2px">
              {{ v.resPx }}
            </div>
          </div>
          <div>
            <div style="font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--t4)">
              Duration
            </div>
            <div style="font-size:14px;color:var(--text);margin-top:2px">
              {{ v.durLabel }}
            </div>
          </div>
          <div>
            <div style="font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--t4)">
              Size
            </div>
            <div style="font-size:14px;color:var(--text);margin-top:2px">
              {{ v.sizeLabel }}
            </div>
          </div>
        </div>
        <div style="padding:20px 28px 24px;display:flex;gap:10px">
          <button
            style="flex:1;height:44px;border-radius:10px;border:1px solid var(--border2);background:transparent;color:var(--text);font:inherit;font-weight:500;font-size:14px;cursor:pointer"
            @click="closeRender"
          >
            Render another
          </button>
          <button
            style="flex:2;display:flex;align-items:center;justify-content:center;gap:8px;height:44px;border-radius:10px;border:1.5px solid var(--accent);background:var(--tint2);color:var(--a3);font:inherit;font-weight:600;font-size:14.5px;cursor:pointer;box-shadow:0 0 22px var(--tint4)"
            @click="download"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3v12" />
              <path d="M7 11l5 5 5-5" />
              <path d="M4 19h16" />
            </svg>
            Download MP4
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
