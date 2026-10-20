<script setup>
// The stage shows the live preview canvas, and the finished MP4 in its place
// once an export completes. The canvas stays mounted (v-show) because the
// store paints straight into it. Clicking the notation seeks to that beat.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FREE_MIN, fitEdge } from '~/utils/frame'

const { s, v, registerCanvas, seekAtCanvas } = useSonotas()
const stageRef = ref(null)
const canvasRef = ref(null)

// A free frame is resized by dragging its right edge (width only), bottom edge
// (height only) or corner (both). The frame stays centred, so the far side
// mirrors the drag. While dragging, an outline shows the new size; letting go
// sets it. From then on the preview keeps that scale, so the notation keeps
// its size on screen as the frame changes (drawn smaller only past the stage).
const resizable = computed(() => s.aspect === 'Custom' && s.ready && !s.videoUrl && !v.value.isRendering)
const box = ref(null) // the frame in stage px: { x, y, w, h }
const drag = ref(null) // { edge, from, k, stage, size } while dragging
const pinned = ref(null) // the canvas's CSS size while a scale is kept
let scale = null // screen px per 1080p px, kept since the last drag
let scaleIn = '' // the stage size it was kept in
let awaiting = false // a dragged size waits for the rebuilt canvas

// Narrow screens size the stage from the frame, so there the frame re-fits.
const narrow = () => matchMedia('(width < 48rem)').matches

function content(el) {
  const cs = getComputedStyle(el)
  return {
    w: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    h: el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  }
}

// The free frame's 1080p size (its height held as the renderer gets it).
const freeSize = () => [s.freeW, fitEdge(s.freeH, s.freeW)]

function measure() {
  const st = stageRef.value
  const c = canvasRef.value
  if (drag.value || !st || !c) return
  const { w: aw, h: ah } = content(st)
  if (scale && scaleIn !== `${aw}x${ah}`) scale = pinned.value = null // the stage changed: fit again
  if (scale) {
    const [fw, fh] = freeSize()
    // Size the canvas only once it has the frame's shape, or it would stretch.
    if (c.height && Math.abs(c.width / c.height - fw / fh) < 0.02) {
      const f = Math.min(1, aw / (fw * scale), ah / (fh * scale))
      const w = fw * scale * f
      const h = fh * scale * f
      if (!pinned.value || Math.abs(pinned.value.w - w) > 0.5 || Math.abs(pinned.value.h - h) > 0.5) pinned.value = { w, h }
      awaiting = false
    }
  }
  if (awaiting) return // keep the drag's outline until then
  const a = st.getBoundingClientRect()
  const b = c.getBoundingClientRect()
  box.value = { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height }
}

function start(edge, e) {
  e.currentTarget.setPointerCapture(e.pointerId)
  const r = stageRef.value.getBoundingClientRect()
  drag.value = {
    edge,
    from: { ...box.value },
    k: box.value.w / s.freeW,
    stage: { left: r.left, top: r.top, ...content(stageRef.value) },
    size: null
  }
}

function move(e) {
  const d = drag.value
  if (!d) return
  const cx = d.from.x + d.from.w / 2
  const cy = d.from.y + d.from.h / 2
  // The dragged side follows the pointer, in 1080p px on an 8 px grid; the
  // other keeps its size. Both stay within what a link and the encoder take.
  let fw = d.edge === 'y' ? s.freeW : Math.round((2 * Math.abs(e.clientX - d.stage.left - cx)) / d.k / 8) * 8
  let fh = d.edge === 'x' ? freeSize()[1] : Math.round((2 * Math.abs(e.clientY - d.stage.top - cy)) / d.k / 8) * 8
  if (d.edge === 'y') {
    fh = fitEdge(fh, fw)
  } else {
    fw = fitEdge(fw, Math.max(fh, FREE_MIN))
    fh = fitEdge(fh, fw)
  }
  d.size = [fw, fh]
  // Past the stage, the frame is drawn smaller; its size is kept.
  const f = Math.min(1, d.stage.w / (fw * d.k), d.stage.h / (fh * d.k))
  const w = fw * d.k * f
  const h = fh * d.k * f
  box.value = { x: cx - w / 2, y: cy - h / 2, w, h }
}

function end() {
  const d = drag.value
  drag.value = null
  if (!d?.size) return
  if (!narrow()) {
    scale = d.k
    const { w, h } = content(stageRef.value)
    scaleIn = `${w}x${h}`
    awaiting = true
  }
  ;[s.freeW, s.freeH] = d.size
  measure()
}

// A canvas with a set CSS size keeps it when rebuilt, so the observer stays
// quiet: look again once the new sheet is painted.
watch(() => [s.sheetW, s.sheetH], () => requestAnimationFrame(measure))

// A preset fits the frame to the stage again.
watch(() => s.aspect, (a) => {
  if (a !== 'Custom') scale = pinned.value = null
})

let observer
onMounted(() => {
  if (canvasRef.value) registerCanvas(canvasRef.value)
  observer = new ResizeObserver(measure)
  observer.observe(stageRef.value)
  observer.observe(canvasRef.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section
    ref="stageRef"
    class="stage"
    data-grow
    :style="{ '--frame': v.frameRatio }"
    aria-label="Preview"
  >
    <canvas
      v-show="s.ready && !s.videoUrl"
      ref="canvasRef"
      :style="pinned ? { width: `${pinned.w}px`, height: `${pinned.h}px` } : undefined"
      @click="seekAtCanvas($event.clientX, $event.clientY)"
    />

    <!-- Mouse and touch only: the Frame tab's width and height fields set the same. -->
    <div
      v-if="resizable && box"
      class="frame-resize"
      :data-dragging="drag ? '' : undefined"
      :style="{ left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` }"
      aria-hidden="true"
    >
      <span
        v-if="drag?.size"
        class="frame-resize-label font-mono tabular"
      >{{ drag.size.join(' × ') }}</span>
      <span
        v-for="edge in ['x', 'y', 'xy']"
        :key="edge"
        :data-edge="edge"
        @pointerdown.prevent="start(edge, $event)"
        @pointermove="move"
        @pointerup="end"
        @pointercancel="end"
      />
    </div>

    <video
      v-if="s.videoUrl"
      :src="s.videoUrl"
      :poster="s.posterUrl || undefined"
      controls
      playsinline
      preload="metadata"
    />

    <div
      v-if="!s.ready && !s.engineError"
      class="cluster gap-2 text-s text-muted"
    >
      <span
        class="spinner"
        aria-hidden="true"
      ><span /></span>
      Reading the score…
    </div>

    <div
      v-if="s.engineError"
      class="alert"
      data-tone="danger"
      role="alert"
    >
      <div><strong>Couldn’t render the score.</strong> {{ s.engineError }}</div>
    </div>

    <div
      v-if="v.isRendering"
      class="overlay"
    >
      <!-- The export panel announces progress; this is its picture. -->
      <div
        class="stack gap-2 items-center text-center"
        aria-hidden="true"
      >
        <span class="render-pct">{{ v.pct }}%</span>
        <span class="text-s text-muted">{{ v.phase }} <span class="font-mono tabular">{{ v.frame }} / {{ v.totalFrames }}</span></span>
      </div>
    </div>
  </section>
</template>
