<template>
  <div class="app">
    <div class="noise-overlay" />

    <div class="page">
      <!-- Header -->
      <header class="header">
        <div class="header-eyebrow">FUEL EFFICIENCY</div>
        <h1 class="header-title">Converter</h1>
        <p class="header-sub">MPG ↔ L/100km — smart insights included</p>
      </header>

      <!-- Mode Toggle -->
      <div class="toggle-wrap">
        <button
          class="toggle-btn"
          :class="{ active: mode === 'mpg-to-l100km' }"
          @click="mode = 'mpg-to-l100km'"
        >
          MPG → L/100km
        </button>
        <div class="toggle-pip" :class="mode === 'l100km-to-mpg' ? 'right' : 'left'" />
        <button
          class="toggle-btn"
          :class="{ active: mode === 'l100km-to-mpg' }"
          @click="mode = 'l100km-to-mpg'"
        >
          L/100km → MPG
        </button>
      </div>

      <!-- Presets -->
      <section class="presets">
        <p class="section-label">QUICK SELECT</p>
        <div class="preset-grid">
          <button
            v-for="p in presets"
            :key="p.name"
            class="preset-btn"
            :title="p.description"
            @click="applyPreset(p)"
          >
            <span class="preset-icon">{{ p.icon }}</span>
            <span class="preset-name">{{ p.name }}</span>
          </button>
        </div>
      </section>

      <!-- Input -->
      <section class="input-section">
        <label class="section-label" :for="inputId">
          {{ mode === 'mpg-to-l100km' ? 'MILES PER GALLON' : 'LITERS / 100 KM' }}
        </label>
        <div class="input-wrap" :class="{ warning: showWarning, error: showError }">
          <input
            :id="inputId"
            v-model.number="inputValue"
            type="number"
            :min="limits.min"
            :max="limits.max"
            :step="inputStep"
            :placeholder="placeholder"
            class="main-input"
            @input="onInput"
          />
          <span class="input-unit">{{ inputUnit }}</span>
        </div>
        <div v-if="showError || showWarning" class="feedback">
          <span>{{ showError ? '⚠️' : '💡' }}</span>
          {{ feedbackMsg }}
        </div>
        <p class="input-help">{{ helpText }}</p>
      </section>

      <!-- Result -->
      <section class="result-section" :class="efficiencyClass">
        <div class="efficiency-pill">{{ efficiencyLabel }}</div>
        <div class="result-value" :class="{ calculating: isCalculating }">
          <span class="result-num">{{ displayResult }}</span>
          <span class="result-unit">{{ outputUnit }}</span>
        </div>

        <div v-if="hasValid" class="sub-conversions">
          <div class="sub-item">
            <span class="sub-label">km/L</span>
            <span class="sub-val">{{ kmPerLiter }}</span>
          </div>
        </div>

        <div v-if="hasValid" class="comparison">
          <span class="comparison-icon">🚗</span>
          <span class="comparison-text">{{ comparisonText }}</span>
        </div>

        <p class="info-line">
          <span class="info-dot" />
          {{ infoText }}
        </p>
      </section>

      <!-- Actions -->
      <section class="actions">
        <button class="action-btn share" :disabled="!hasValid" @click="shareResult">
          📤 Share
        </button>
        <button class="action-btn save" :disabled="!hasValid" @click="saveToHistory">
          💾 Save
        </button>
        <button class="action-btn clear" @click="clearInput">
          🗑️ Clear
        </button>
      </section>

      <!-- History -->
      <section v-if="history.length > 0" class="history">
        <p class="section-label">RECENT</p>
        <div class="history-list">
          <button
            v-for="(item, i) in history.slice(0, 3)"
            :key="i"
            class="history-item"
            @click="loadHistory(item)"
          >
            <span class="h-input">{{ item.input }} <span class="h-unit">{{ item.inputUnit }}</span></span>
            <span class="h-arrow">→</span>
            <span class="h-result">{{ item.result }} <span class="h-unit">{{ item.outputUnit }}</span></span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// ─── Constants ───────────────────────────────────────────
const FACTOR = 235.215
const MPG_LIMITS = { min: 1, max: 150 }
const L100KM_LIMITS = { min: 1.5, max: 50 }

const PRESETS = [
  { name: 'Compact',   icon: '🚗', mpg: 32, l100km: 7.4,  description: 'Small efficient car' },
  { name: 'Sedan',     icon: '🚙', mpg: 28, l100km: 8.4,  description: 'Mid-size sedan' },
  { name: 'SUV',       icon: '🚐', mpg: 22, l100km: 10.7, description: 'Sport utility vehicle' },
  { name: 'Sport',     icon: '🏎️', mpg: 20, l100km: 11.8, description: 'High-performance sports car' },
  { name: 'Truck',     icon: '🛻', mpg: 18, l100km: 13.1, description: 'Pickup truck' },
  { name: 'Hybrid',    icon: '🔋', mpg: 45, l100km: 5.2,  description: 'Hybrid vehicle' },
]

// ─── State ───────────────────────────────────────────────
const mode          = ref('mpg-to-l100km')
const inputValue    = ref(25)
const isCalculating = ref(false)
const history       = ref([])
const presets       = PRESETS

let debounce = null

// ─── Computed ────────────────────────────────────────────
const inputId    = computed(() => `${mode.value}-input`)
const limits     = computed(() => mode.value === 'mpg-to-l100km' ? MPG_LIMITS : L100KM_LIMITS)
const inputStep  = computed(() => mode.value === 'mpg-to-l100km' ? '1' : '0.1')
const inputUnit  = computed(() => mode.value === 'mpg-to-l100km' ? 'MPG' : 'L/100km')
const outputUnit = computed(() => mode.value === 'mpg-to-l100km' ? 'L/100km' : 'MPG')
const placeholder = computed(() =>
  mode.value === 'mpg-to-l100km' ? 'e.g. 25' : 'e.g. 8.5'
)
const helpText = computed(() =>
  mode.value === 'mpg-to-l100km'
    ? 'Typical range: 15–50 MPG  ·  lower L/100km = better'
    : 'Typical range: 4–15 L/100km  ·  higher MPG = better'
)
const infoText = computed(() =>
  mode.value === 'mpg-to-l100km'
    ? 'Lower L/100km values indicate better fuel efficiency'
    : 'Higher MPG values indicate better fuel efficiency'
)

const showWarning = computed(() => {
  const v = parseFloat(inputValue.value)
  if (isNaN(v)) return false
  return mode.value === 'mpg-to-l100km' ? (v > 60 || v < 10) : (v > 20 || v < 3)
})
const showError = computed(() => {
  const v = parseFloat(inputValue.value)
  if (isNaN(v)) return true
  return v < limits.value.min || v > limits.value.max
})
const feedbackMsg = computed(() => {
  if (showError.value) return `Value must be between ${limits.value.min} and ${limits.value.max}`
  return mode.value === 'mpg-to-l100km'
    ? 'Unusually high/low for typical vehicles'
    : 'Unusually high/low fuel consumption'
})
const hasValid = computed(() => {
  const v = parseFloat(inputValue.value)
  return !isNaN(v) && v >= limits.value.min && v <= limits.value.max
})

const displayResult = computed(() => {
  if (!hasValid.value) return '—'
  const v = parseFloat(inputValue.value)
  const r = FACTOR / v
  return r < 10 ? r.toFixed(1) : r.toFixed(0)
})

const kmPerLiter = computed(() => {
  if (!hasValid.value) return '—'
  const v = parseFloat(inputValue.value)
  const l100km = mode.value === 'mpg-to-l100km' ? FACTOR / v : v
  return (100 / l100km).toFixed(1)
})

const _l100km = computed(() => {
  if (!hasValid.value) return null
  const v = parseFloat(inputValue.value)
  return mode.value === 'mpg-to-l100km' ? FACTOR / v : v
})

const efficiencyLabel = computed(() => {
  if (!hasValid.value) return 'Enter value'
  const l = _l100km.value
  if (l <= 4)  return 'Excellent'
  if (l <= 6)  return 'Great'
  if (l <= 8)  return 'Good'
  if (l <= 12) return 'Average'
  return 'Poor'
})
const efficiencyClass = computed(() => {
  if (!hasValid.value) return 'neutral'
  const l = _l100km.value
  if (l <= 4)  return 'excellent'
  if (l <= 6)  return 'great'
  if (l <= 8)  return 'good'
  if (l <= 12) return 'average'
  return 'poor'
})
const comparisonText = computed(() => {
  if (!hasValid.value) return ''
  const l = _l100km.value
  if (l <= 4)  return 'Better than most hybrids'
  if (l <= 6)  return 'Hybrid vehicle range'
  if (l <= 8)  return 'Compact car range'
  if (l <= 12) return 'Mid-size vehicle range'
  return 'Large vehicle / truck range'
})

// ─── Methods ─────────────────────────────────────────────
function applyPreset(p) {
  inputValue.value = mode.value === 'mpg-to-l100km' ? p.mpg : p.l100km
}

function onInput() {
  isCalculating.value = true
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    const v = parseFloat(inputValue.value)
    if (!isNaN(v)) {
      if (v < limits.value.min) inputValue.value = limits.value.min
      else if (v > limits.value.max) inputValue.value = limits.value.max
    }
    isCalculating.value = false
  }, 300)
}

function shareResult() {
  if (!hasValid.value) return
  const text = `🚗 Fuel Efficiency: ${inputValue.value} ${inputUnit.value} = ${displayResult.value} ${outputUnit.value}`
  if (navigator.share) {
    navigator.share({ title: 'Fuel Efficiency Conversion', text, url: window.location.href })
  } else {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'))
  }
}

function saveToHistory() {
  if (!hasValid.value) return
  const item = {
    input: inputValue.value,
    inputUnit: inputUnit.value,
    result: displayResult.value,
    outputUnit: outputUnit.value,
    mode: mode.value,
    timestamp: new Date().toLocaleTimeString(),
  }
  history.value = history.value.filter(
    h => !(h.input === item.input && h.mode === item.mode)
  )
  history.value.unshift(item)
  history.value = history.value.slice(0, 10)
  try { localStorage.setItem('fuelHistory', JSON.stringify(history.value)) } catch {}
}

function loadHistory(item) {
  mode.value = item.mode
  inputValue.value = item.input
}

function clearInput() {
  inputValue.value = ''
}

// ─── Lifecycle ───────────────────────────────────────────
onMounted(() => {
  try {
    const saved = localStorage.getItem('fuelHistory')
    if (saved) history.value = JSON.parse(saved)
  } catch {}
})

onBeforeUnmount(() => clearTimeout(debounce))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #0d0d0f;
  --surface: #141417;
  --border:  #252528;
  --text:    #f0ede8;
  --muted:   #6b6870;
  --accent:  #e8d96a;
  --accent2: #6de8b4;
  --red:     #e86d6d;
  --orange:  #e8a06d;
  --ff-head: 'Syne', sans-serif;
  --ff-mono: 'DM Mono', monospace;
  --radius:  14px;
}

html { background: var(--bg); color: var(--text); font-family: var(--ff-head); }

.noise-overlay {
  pointer-events: none;
  position: fixed; inset: 0; z-index: 999;
  opacity: .03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.app {
  min-height: 100dvh;
  background: var(--bg);
}

.page {
  max-width: 580px;
  margin: 0 auto;
  padding: 48px 20px 80px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

/* ── Header ── */
.header { text-align: center; }

.header-eyebrow {
  font-family: var(--ff-mono);
  font-size: 11px;
  letter-spacing: .15em;
  color: var(--accent);
  margin-bottom: 8px;
}

.header-title {
  font-size: clamp(52px, 12vw, 80px);
  font-weight: 800;
  /* Fix: line-height + padding prevent descender/ascender clipping of gradient */
  line-height: 1.15;
  padding: 0 6px 6px;
  letter-spacing: -.03em;
  display: inline-block;
  background: linear-gradient(135deg, var(--text) 30%, var(--muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-sub {
  font-size: 14px;
  color: var(--muted);
  margin-top: 6px;
  font-family: var(--ff-mono);
}

/* ── Toggle ── */
.toggle-wrap {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 50px;
  padding: 5px;
  position: relative;
  gap: 4px;
}

.toggle-pip {
  position: absolute;
  top: 5px; bottom: 5px;
  width: calc(50% - 7px);
  background: var(--accent);
  border-radius: 40px;
  transition: left .25s cubic-bezier(.4,0,.2,1);
}
.toggle-pip.left  { left: 5px; }
.toggle-pip.right { left: calc(50% + 2px); }

.toggle-btn {
  flex: 1; z-index: 1; position: relative;
  padding: 12px 16px;
  border: none; background: transparent;
  font-family: var(--ff-head); font-weight: 700; font-size: 13px;
  color: var(--muted);
  cursor: pointer;
  border-radius: 40px;
  transition: color .2s;
  white-space: nowrap;
}
.toggle-btn.active { color: var(--bg); }

/* ── Section label ── */
.section-label {
  font-family: var(--ff-mono);
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--muted);
  margin-bottom: 14px;
  display: block;
}

/* ── Presets ── */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.preset-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color .15s, background .15s, transform .1s;
  font-family: var(--ff-head);
  color: var(--text);
}
.preset-btn:hover {
  border-color: var(--accent);
  background: #1e1d15;
  transform: translateY(-2px);
}
.preset-icon { font-size: 22px; }
.preset-name { font-size: 12px; font-weight: 600; color: var(--muted); }

/* ── Input ── */
.input-wrap {
  position: relative;
  display: flex; align-items: center;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.input-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(232,217,106,.1);
}
.input-wrap.warning { border-color: var(--orange); }
.input-wrap.error   { border-color: var(--red); }

.main-input {
  flex: 1;
  background: transparent;
  border: none; outline: none;
  padding: 20px;
  font-family: var(--ff-mono); font-size: 28px; font-weight: 500;
  color: var(--text);
  text-align: center;
  -moz-appearance: textfield;
}
.main-input::-webkit-inner-spin-button,
.main-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.main-input::placeholder { color: var(--muted); }

.input-unit {
  padding-right: 20px;
  font-family: var(--ff-mono); font-size: 14px; font-weight: 500;
  color: var(--muted); white-space: nowrap; flex-shrink: 0;
}

.feedback {
  margin-top: 8px;
  font-family: var(--ff-mono); font-size: 12px;
  color: var(--orange);
  display: flex; align-items: center; gap: 6px;
}

.input-help {
  margin-top: 8px;
  font-family: var(--ff-mono); font-size: 11px;
  color: var(--muted);
}

/* ── Result ── */
.result-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 28px;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: border-color .3s;
}
.result-section::before {
  content: '';
  position: absolute; inset: 0;
  opacity: .04;
  background: radial-gradient(circle at 50% 0%, var(--accent), transparent 70%);
  pointer-events: none;
}
.result-section.excellent { border-color: #6de8b4; }
.result-section.great     { border-color: #6db8e8; }
.result-section.good      { border-color: var(--accent); }
.result-section.average   { border-color: var(--border); }
.result-section.poor      { border-color: var(--red); }
.result-section.neutral   { border-color: var(--border); }

.efficiency-pill {
  font-family: var(--ff-mono); font-size: 11px; font-weight: 500;
  letter-spacing: .12em; text-transform: uppercase;
  padding: 6px 16px;
  border-radius: 50px;
  border: 1px solid currentColor;
}
.result-section.excellent .efficiency-pill { color: #6de8b4; background: rgba(109,232,180,.08); }
.result-section.great     .efficiency-pill { color: #6db8e8; background: rgba(109,184,232,.08); }
.result-section.good      .efficiency-pill { color: var(--accent); background: rgba(232,217,106,.08); }
.result-section.average   .efficiency-pill { color: var(--muted); background: rgba(107,104,112,.1); }
.result-section.poor      .efficiency-pill { color: var(--red); background: rgba(232,109,109,.08); }
.result-section.neutral   .efficiency-pill { color: var(--muted); background: rgba(107,104,112,.1); }

.result-value {
  display: flex; align-items: baseline; gap: 10px;
  transition: opacity .2s;
}
.result-value.calculating { opacity: .4; }

.result-num {
  font-size: clamp(56px, 14vw, 80px);
  font-weight: 800; line-height: 1;
  color: var(--text);
  letter-spacing: -.03em;
}
.result-unit {
  font-family: var(--ff-mono); font-size: 16px; color: var(--muted);
}

.sub-conversions {
  display: flex; gap: 24px;
  padding: 12px 20px;
  background: rgba(255,255,255,.03);
  border-radius: 10px;
  border: 1px solid var(--border);
}
.sub-item { display: flex; align-items: center; gap: 8px; }
.sub-label { font-family: var(--ff-mono); font-size: 12px; color: var(--muted); }
.sub-val   { font-family: var(--ff-mono); font-size: 14px; font-weight: 500; color: var(--text); }

.comparison {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: var(--muted);
}
.comparison-icon { font-size: 18px; }

.info-line {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--ff-mono); font-size: 11px; color: var(--muted);
}
.info-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--muted); flex-shrink: 0;
}

/* ── Actions ── */
.actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.action-btn {
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: var(--ff-head); font-weight: 700; font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .1s, opacity .15s;
}
.action-btn:hover:not(:disabled) { background: #1e1e22; transform: translateY(-1px); }
.action-btn.share:hover:not(:disabled) { border-color: var(--accent2); }
.action-btn.save:hover:not(:disabled)  { border-color: var(--accent); }
.action-btn.clear:hover:not(:disabled) { border-color: var(--red); }
.action-btn:disabled { opacity: .3; cursor: not-allowed; }

/* ── History ── */
.history-list {
  display: flex; flex-direction: column; gap: 8px;
}
.history-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color .15s, background .15s;
  font-family: var(--ff-mono); font-size: 13px;
  color: var(--text);
  width: 100%; text-align: left;
}
.history-item:hover {
  border-color: var(--accent);
  background: #1e1d15;
}
.h-input { color: var(--muted); }
.h-unit  { font-size: 11px; opacity: .7; }
.h-arrow { color: var(--muted); margin: 0 8px; }
.h-result { color: var(--accent); font-weight: 500; }

/* ── Responsive ── */
@media (max-width: 420px) {
  .page { gap: 28px; padding: 32px 16px 60px; }
  .preset-grid { grid-template-columns: repeat(2, 1fr); }
  .actions { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}

@media print {
  .actions, .history { display: none; }
}
</style>