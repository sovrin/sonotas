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

// View zoom: Ctrl/⌘-scroll or pinch over the preview magnifies it, a drag pans
// it and a double-click fits it again. Only the view moves, never the export.
const view = ref({ z: 1, x: 0, y: 0 })
let pan = null // { x, y, moved } while dragging the zoomed view
const panning = ref(false) // the view follows the pointer without easing

// Pan no further than the magnified canvas still covers its fitted box.
function setView(z, x, y) {
  const c = canvasRef.value
  const lim = (n, size) => Math.min(Math.max(n, -size * (z - 1) / 2), size * (z - 1) / 2)
  view.value = { z, x: lim(x, c.offsetWidth), y: lim(y, c.offsetHeight) }
}

// Zoom to nz, keeping the point at (px, py) where it is (offsets from the
// fitted centre; the buttons use the centre itself).
function zoomTo(nz, px = 0, py = 0) {
  const { z, x, y } = view.value
  // shortcut: magnifies the painted bitmap, so it softens past ~4×; repaint at zoom if sharper is wanted.
  nz = Math.min(Math.max(nz, 1), 4)
  setView(nz, px - (px - x) * nz / z, py - (py - y) * nz / z)
}

// The buttons step to the next 25% mark, wherever scrolling left the zoom.
const stepIn = () => zoomTo(Math.floor(view.value.z * 4 + 1e-6) / 4 + 0.25)
const stepOut = () => zoomTo(Math.ceil(view.value.z * 4 - 1e-6) / 4 - 0.25)

function wheel(e) {
  if (!(e.ctrlKey || e.metaKey) || !s.ready || s.videoUrl) return
  e.preventDefault() // not the browser's page zoom
  const c = canvasRef.value
  const r = stageRef.value.getBoundingClientRect()
  zoomTo(
    view.value.z * Math.exp(-e.deltaY / 200),
    e.clientX - r.left - (c.offsetLeft + c.offsetWidth / 2),
    e.clientY - r.top - (c.offsetTop + c.offsetHeight / 2)
  )
}

function panStart(e) {
  if (view.value.z === 1) return
  e.currentTarget.setPointerCapture(e.pointerId)
  pan = { x: e.clientX, y: e.clientY, moved: false }
}

function panMove(e) {
  if (!pan) return
  const dx = e.clientX - pan.x
  const dy = e.clientY - pan.y
  if (!pan.moved && Math.hypot(dx, dy) < 4) return
  pan = { x: e.clientX, y: e.clientY, moved: true }
  panning.value = true
  setView(view.value.z, view.value.x + dx, view.value.y + dy)
}

function panEnd() {
  panning.value = false
  // The click that ends a pan doesn't seek; clear it after that click has run.
  setTimeout(() => {
    pan = null
  })
}

function click(e) {
  if (!pan?.moved) seekAtCanvas(e.clientX, e.clientY)
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
    :style="{ '--frame': v.frameRatio, '--view-z': view.z, '--view-x': `${view.x}px`, '--view-y': `${view.y}px` }"
    :data-panning="panning ? '' : undefined"
    aria-label="Preview"
    @wheel="wheel"
  >
    <canvas
      v-show="s.ready && !s.videoUrl"
      ref="canvasRef"
      :data-zoomed="view.z > 1 ? '' : undefined"
      :style="{
        ...(pinned && { width: `${pinned.w}px`, height: `${pinned.h}px` }),
        ...(view.z > 1 && { transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` })
      }"
      @click="click"
      @dblclick="view = { z: 1, x: 0, y: 0 }"
      @pointerdown="panStart"
      @pointermove="panMove"
      @pointerup="panEnd"
      @pointercancel="panEnd"
    />

    <!-- Mouse and touch only: the Frame tab's width and height fields set the same.
         Hidden while zoomed in, as its handles follow the fitted frame. -->
    <div
      v-if="resizable && box && view.z === 1"
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

    <div
      v-if="!s.videoUrl"
      class="btn-group view-zoom"
    >
      <button
        class="btn"
        data-icon
        data-size="s"
        data-variant="ghost"
        aria-label="Zoom out"
        data-tip="Zoom out"
        :disabled="view.z === 1"
        @click="stepOut"
      >
        <i
          class="icon"
          data-icon="zoom-out"
        />
      </button>
      <button
        class="btn font-mono tabular"
        data-size="s"
        data-variant="ghost"
        :aria-label="`Zoom ${Math.round(view.z * 100)}%, fit the preview`"
        data-tip="Fit"
        :disabled="view.z === 1"
        @click="view = { z: 1, x: 0, y: 0 }"
      >
        {{ Math.round(view.z * 100) }}%
      </button>
      <button
        class="btn"
        data-icon
        data-size="s"
        data-variant="ghost"
        aria-label="Zoom in"
        data-tip="Zoom in"
        :disabled="!s.ready || view.z === 4"
        @click="stepIn"
      >
        <i
          class="icon"
          data-icon="zoom-in"
        />
      </button>
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
