<script setup>
const { s, v, setField, setNum, toggle, setHighlightColor } = useSonotas()
</script>

<template>
  <div style="padding:16px;border-bottom:1px solid var(--border-soft)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M8 3h8l2.5 18h-13z" />
        <path d="M12 8l4.5 9" />
        <circle
          cx="12"
          cy="12"
          r="1.4"
          fill="var(--accent)"
          stroke="none"
        />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Playback
      </h3>
    </div>
    <label style="position:relative;display:block;margin-bottom:14px">
      <div style="font-size:11px;color:var(--t3);margin-bottom:5px">Playback speed</div>
      <select
        name="speed"
        :value="s.speed"
        style="width:100%;appearance:none;-webkit-appearance:none;background:var(--inset);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:9px 30px 9px 11px;font:inherit;font-size:13.5px;cursor:pointer"
        @change="setField"
      >
        <option>0.25×</option>
        <option>0.5×</option>
        <option>0.75×</option>
        <option>1×</option>
        <option>1.25×</option>
        <option>1.5×</option>
        <option>2×</option>
      </select>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--t4)"
        stroke-width="2"
        style="position:absolute;right:10px;top:34px;pointer-events:none"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
    <button
      role="checkbox"
      :aria-checked="s.highlightNotes"
      style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:6px 0;cursor:pointer;text-align:left"
      @click="toggle('highlightNotes')"
    >
      <span :style="v.boxHighlight"><svg
        v-if="s.highlightNotes"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--inset)"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg></span>
      <span style="font-size:13.5px;color:var(--text)">Highlight played bar</span>
    </button>
    <div
      v-if="s.highlightNotes"
      style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-soft)"
    >
      <div style="font-size:11px;color:var(--t3);margin-bottom:7px">
        Highlight colour
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button
          title="Amber"
          :style="v.swHlAmber"
          @click="setHighlightColor('#e0a94c')"
        />
        <button
          title="Accent"
          :style="v.swHlAccent"
          @click="setHighlightColor('#8f97ac')"
        />
        <button
          title="Green"
          :style="v.swHlGreen"
          @click="setHighlightColor('#46a758')"
        />
        <button
          title="Blue"
          :style="v.swHlBlue"
          @click="setHighlightColor('#5b8def')"
        />
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:6px">
        <span>Opacity</span><span
          style="color:var(--heading);font-variant-numeric:tabular-nums"
        >{{ s.highlightOpacity }}%</span>
      </div>
      <input
        type="range"
        name="highlightOpacity"
        aria-label="Highlight opacity"
        min="5"
        max="60"
        step="1"
        :value="s.highlightOpacity"
        :style="`background:${v.sldHlOpacity};margin-bottom:15px`"
        @input="setNum"
      >
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:6px">
        <span>Padding</span><span
          style="color:var(--heading);font-variant-numeric:tabular-nums"
        >{{ s.highlightPadding }} px</span>
      </div>
      <input
        type="range"
        name="highlightPadding"
        aria-label="Highlight padding"
        min="0"
        max="20"
        step="1"
        :value="s.highlightPadding"
        :style="`background:${v.sldHlPadding}`"
        @input="setNum"
      >
    </div>
    <p style="font-size:11.5px;color:var(--t4);margin:14px 0 0;line-height:1.5">
      Speed changes how fast the notation scrolls and scales the exported video length.
    </p>
  </div>
</template>
