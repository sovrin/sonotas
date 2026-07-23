<script setup>
const { s, v, setCursorColor, setNum, toggle, setActiveNoteColor } = useSonotas()
</script>

<template>
  <div style="padding:16px;border-bottom:1px solid var(--border-soft)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
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
        <circle
          cx="13.5"
          cy="6.5"
          r="2.5"
        />
        <circle
          cx="17.5"
          cy="10.5"
          r="2.5"
        />
        <circle
          cx="8.5"
          cy="7.5"
          r="2.5"
        />
        <circle
          cx="6.5"
          cy="12.5"
          r="2.5"
        />
        <path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2 10 10 0 0 0-9-11z" />
      </svg>
      <h3 style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--heading);margin:0;font-weight:600">
        Cursor
      </h3>
    </div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:7px">
      Colour
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button
        title="Accent"
        :style="v.swAccent"
        @click="setCursorColor('#8f97ac')"
      />
      <button
        title="Red"
        :style="v.swRed"
        @click="setCursorColor('#e5484d')"
      />
      <button
        title="White"
        :style="v.swWhite"
        @click="setCursorColor('#e9eaec')"
      />
      <button
        title="Amber"
        :style="v.swAmber"
        @click="setCursorColor('#e0a94c')"
      />
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:6px">
      <span>Opacity</span><span
        style="color:var(--heading);font-variant-numeric:tabular-nums"
      >{{ s.cursorOpacity }}%</span>
    </div>
    <input
      type="range"
      name="cursorOpacity"
      aria-label="Cursor opacity"
      min="10"
      max="100"
      step="1"
      :value="s.cursorOpacity"
      :style="`background:${v.sldOpacity};margin-bottom:15px`"
      @input="setNum"
    >
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:6px">
      <span>Width</span><span
        style="color:var(--heading);font-variant-numeric:tabular-nums"
      >{{ s.cursorWidth }} px</span>
    </div>
    <input
      type="range"
      name="cursorWidth"
      aria-label="Cursor width"
      min="1"
      max="10"
      step="1"
      :value="s.cursorWidth"
      :style="`background:${v.sldWidth};margin-bottom:15px`"
      @input="setNum"
    >
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:6px">
      <span>Height</span><span
        style="color:var(--heading);font-variant-numeric:tabular-nums"
      >{{ s.cursorHeight }}%</span>
    </div>
    <input
      type="range"
      name="cursorHeight"
      aria-label="Cursor height"
      min="40"
      max="100"
      step="1"
      :value="s.cursorHeight"
      :style="`background:${v.sldHeight};margin-bottom:15px`"
      @input="setNum"
    >
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:6px">
      <span>Offset</span><span
        style="color:var(--heading);font-variant-numeric:tabular-nums"
      >{{ s.cursorOffset }} px</span>
    </div>
    <input
      type="range"
      name="cursorOffset"
      aria-label="Cursor offset"
      min="-100"
      max="100"
      step="1"
      :value="s.cursorOffset"
      :style="`background:${v.sldOffset}`"
      @input="setNum"
    >
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-soft)">
      <button
        role="checkbox"
        :aria-checked="s.recolorNote"
        style="display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:2px 0;cursor:pointer;text-align:left"
        @click="toggle('recolorNote')"
      >
        <span :style="v.boxRecolor"><svg
          v-if="s.recolorNote"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--inset)"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M20 6L9 17l-5-5" /></svg></span>
        <span style="font-size:13.5px;color:var(--text)">Recolour current note</span>
      </button>
      <div
        v-if="s.recolorNote"
        style="margin-top:12px"
      >
        <div style="font-size:11px;color:var(--t3);margin-bottom:7px">
          Note colour
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button
            title="Red"
            :style="v.swAnRed"
            @click="setActiveNoteColor('#e5484d')"
          />
          <button
            title="Amber"
            :style="v.swAnAmber"
            @click="setActiveNoteColor('#e0a94c')"
          />
          <button
            title="Green"
            :style="v.swAnGreen"
            @click="setActiveNoteColor('#46a758')"
          />
          <button
            title="Blue"
            :style="v.swAnBlue"
            @click="setActiveNoteColor('#5b8def')"
          />
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:6px">
          <span>Opacity</span><span
            style="color:var(--heading);font-variant-numeric:tabular-nums"
          >{{ s.activeNoteOpacity }}%</span>
        </div>
        <input
          type="range"
          name="activeNoteOpacity"
          aria-label="Active note opacity"
          min="30"
          max="100"
          step="1"
          :value="s.activeNoteOpacity"
          :style="`background:${v.sldAnOpacity}`"
          @input="setNum"
        >
      </div>
    </div>
  </div>
</template>
