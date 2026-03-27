<template>
  <div class="page">
    <!-- Background grid -->
    <div class="grid-bg" aria-hidden="true" />

    <div class="wrapper">
      <!-- Header -->
      <header class="header">
        <div class="header-flag">🇰🇭</div>
        <div>
          <h1 class="header-title">Carrier Checker</h1>
          <p class="header-sub">Cambodia Mobile Network</p>
        </div>
      </header>

      <!-- Input -->
      <div class="input-card">
        <label class="input-label">Enter phone prefix</label>
        <div class="input-row">
          <span class="input-prefix-hint">+855</span>
          <input
            v-model="phoneNumber"
            class="input"
            :class="{ 'input--error': invalidInput, 'input--success': carrier !== 'Unknown Carrier' }"
            placeholder="e.g. 12"
            maxlength="2"
            type="text"
            inputmode="numeric"
            @input="formatAndDetectCarrier"
            autofocus
          />
          <button v-if="phoneNumber" class="clear-btn" @click="clearInput" aria-label="Clear">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Result pill -->
        <Transition name="result">
          <div v-if="carrier !== 'Unknown Carrier'" class="result-pill" :style="{ '--accent': carrierColor }">
            <span class="result-dot" />
            <span class="result-name">{{ carrier }}</span>
            <span class="result-badge">Detected</span>
          </div>
          <div v-else-if="invalidInput" class="result-pill result-pill--error">
            <span class="result-dot result-dot--error" />
            <span class="result-name">Unknown prefix</span>
          </div>
        </Transition>
      </div>

      <!-- Carriers grid -->
      <div class="carriers">
        <div
          v-for="(data, name) in carriers"
          :key="name"
          class="carrier-card"
          :class="{ 'carrier-card--active': carrier === name }"
          :style="{ '--c': data.color }"
        >
          <div class="carrier-header">
            <span class="carrier-dot" />
            <h2 class="carrier-name">{{ name }}</h2>
          </div>
          <div class="prefix-grid">
            <button
              v-for="prefix in data.prefixes"
              :key="prefix"
              class="prefix-btn"
              :class="{ 'prefix-btn--active': matchedPrefix === prefix }"
              @click="selectPrefix(prefix)"
            >
              0{{ prefix }}
            </button>
          </div>
        </div>
      </div>

      <p class="footer-note">Tap any prefix to identify its carrier</p>
    </div>
  </div>
</template>

<script setup>
const phoneNumber = ref('')
const matchedPrefix = ref(null)
const invalidInput = ref(false)
const carrier = ref('Unknown Carrier')

const carriers = {
  Cellcard: {
    color: '#F97316',
    prefixes: ['11','12','17','61','76','77','78','79','85','89','92','95','99'],
  },
  Smart: {
    color: '#22C55E',
    prefixes: ['10','15','16','69','70','81','86','87','93','96','98'],
  },
  Metfone: {
    color: '#3B82F6',
    prefixes: ['88','97'],
  },
}

const validPrefixes = new Set(
  Object.values(carriers).flatMap(d => d.prefixes)
)

const carrierColor = computed(() => carriers[carrier.value]?.color ?? '#888')

const clearInput = () => {
  phoneNumber.value = ''
  carrier.value = 'Unknown Carrier'
  matchedPrefix.value = null
  invalidInput.value = false
}

const selectPrefix = (prefix) => {
  phoneNumber.value = prefix
  formatAndDetectCarrier()
}

const formatAndDetectCarrier = () => {
  if (!phoneNumber.value) {
    carrier.value = 'Unknown Carrier'
    matchedPrefix.value = null
    invalidInput.value = false
    return
  }

  const input = phoneNumber.value.slice(0, 2)
  matchedPrefix.value = null
  carrier.value = 'Unknown Carrier'
  invalidInput.value = false

  if (input.length === 2 && !validPrefixes.has(input)) {
    invalidInput.value = true
    return
  }

  for (const [key, data] of Object.entries(carriers)) {
    if (data.prefixes.includes(input)) {
      carrier.value = key
      matchedPrefix.value = input
      return
    }
  }
}
</script>

<style scoped>
/* ── Tokens ─────────────────────────────────────────── */
:root {
  --bg: #0a0a0f;
  --surface: #111118;
  --border: rgba(255,255,255,0.07);
  --text: #f0f0f5;
  --muted: #6b6b80;
  --radius: 14px;
}

/* ── Page ────────────────────────────────────────────── */
.page {
  min-height: 100vh;
  background: #0a0a0f;
  font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
  color: #f0f0f5;
  position: relative;
  overflow: hidden;
}

.grid-bg {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 0;
}

.wrapper {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin: 0 auto;
  padding: 48px 20px 80px;
}

/* ── Header ──────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 36px;
}

.header-flag {
  font-size: 36px;
  line-height: 1;
  filter: drop-shadow(0 0 12px rgba(255,255,255,0.15));
}

.header-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0 0 2px;
  color: #f0f0f5;
}

.header-sub {
  font-size: 13px;
  color: #6b6b80;
  margin: 0;
  letter-spacing: 0.3px;
}

/* ── Input Card ─────────────────────────────────────── */
.input-card {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--radius);
  padding: 22px 20px;
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b6b80;
  margin-bottom: 12px;
  font-weight: 600;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-prefix-hint {
  font-size: 15px;
  color: #6b6b80;
  font-weight: 500;
  flex-shrink: 0;
}

.input {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 9px;
  padding: 11px 14px;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #f0f0f5;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: 'DM Mono', 'Fira Mono', monospace;
}

.input::placeholder {
  color: rgba(255,255,255,0.15);
  font-weight: 400;
  font-size: 16px;
}

.input:focus {
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.04);
}

.input--error {
  border-color: rgba(239,68,68,0.5) !important;
  color: #f87171;
}

.input--success {
  border-color: rgba(255,255,255,0.15) !important;
}

.clear-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #6b6b80;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #f0f0f5;
}

/* ── Result pill ─────────────────────────────────────── */
.result-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 9px;
}

.result-pill--error {
  background: rgba(239,68,68,0.06);
  border-color: rgba(239,68,68,0.2);
}

.result-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent, #888);
  box-shadow: 0 0 6px var(--accent, #888);
  flex-shrink: 0;
}

.result-dot--error {
  background: #f87171;
  box-shadow: 0 0 6px #f87171;
}

.result-name {
  font-size: 15px;
  font-weight: 600;
  color: #f0f0f5;
  flex: 1;
}

.result-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  background: rgba(255,255,255,0.05);
  padding: 3px 8px;
  border-radius: 4px;
}

/* ── Carrier Cards ───────────────────────────────────── */
.carriers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.carrier-card {
  background: #111118;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius);
  padding: 18px 18px 16px;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.carrier-card--active {
  border-color: color-mix(in srgb, var(--c) 40%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 15%, transparent) inset;
}

.carrier-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.carrier-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 7px var(--c);
  flex-shrink: 0;
}

.carrier-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c);
  margin: 0;
}

.prefix-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.prefix-btn {
  padding: 6px 11px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  color: #9090a8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Mono', 'Fira Mono', monospace;
  letter-spacing: 0.03em;
}

.prefix-btn:hover {
  background: rgba(255,255,255,0.07);
  color: #f0f0f5;
  border-color: rgba(255,255,255,0.14);
}

.prefix-btn--active {
  background: var(--c) !important;
  color: #fff !important;
  border-color: var(--c) !important;
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 50%, transparent);
}

/* ── Footer ──────────────────────────────────────────── */
.footer-note {
  text-align: center;
  font-size: 12px;
  color: #3a3a50;
  margin-top: 28px;
  letter-spacing: 0.02em;
}

/* ── Transitions ─────────────────────────────────────── */
.result-enter-active,
.result-leave-active {
  transition: all 0.25s ease;
}

.result-enter-from,
.result-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Mobile ──────────────────────────────────────────── */
@media (max-width: 480px) {
  .wrapper {
    padding: 32px 16px 60px;
  }

  .header-title {
    font-size: 20px;
  }

  .input {
    font-size: 18px;
  }
}
</style>