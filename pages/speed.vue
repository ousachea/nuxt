<template>
  <div class="st-root">
    <div class="st-bg-grid" />
    <div class="st-bg-glow" />

    <!-- Header -->
    <header class="st-header">
      <div class="st-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <polygon points="13,2 4,14 11,14 11,22 20,10 13,10" fill="#00f5c4" />
        </svg>
        NETPULSE
      </div>
      <div class="st-server">
        <span class="st-dot" :class="{ 'st-dot--active': state !== 'idle' }" />
        {{ serverLabel }}
      </div>
    </header>

    <!-- Main -->
    <main class="st-main">

      <!-- Gauge -->
      <div class="st-gauge-wrap">
        <svg class="st-gauge-svg" viewBox="0 0 320 210" xmlns="http://www.w3.org/2000/svg">
          <path d="M 35 180 A 130 130 0 0 1 285 180" fill="none" stroke="#1a1f35" stroke-width="8"
            stroke-linecap="round" />
          <path d="M 35 180 A 130 130 0 0 1 285 180" fill="none" :stroke="arcColor" stroke-width="8"
            stroke-linecap="round" :stroke-dasharray="ARC_LEN + ' ' + ARC_LEN" :stroke-dashoffset="arcOffset"
            style="transition: stroke-dashoffset 0.2s linear, stroke 0.4s ease;" />
          <g v-for="t in ticks" :key="t.i">
            <line :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" :stroke="t.major ? '#2a3050' : '#1a2040'"
              :stroke-width="t.major ? 2 : 1" stroke-linecap="round" />
            <text v-if="t.major" :x="t.lx" :y="t.ly" fill="#3a4466" font-size="9" font-family="monospace"
              text-anchor="middle" dominant-baseline="middle">{{ t.label }}</text>
          </g>
          <g
            :style="`transform: rotate(${needleAngle}deg); transform-origin: 160px 180px; transition: transform 0.25s ease-out;`">
            <line x1="160" y1="180" x2="160" y2="68" stroke="white" stroke-width="2" stroke-linecap="round" />
          </g>
          <circle cx="160" cy="180" r="9" fill="#0d1022" stroke="#00f5c4" stroke-width="1.5" />
          <circle cx="160" cy="180" r="4" fill="#00f5c4" />
        </svg>

        <div class="st-speed-box">
          <div class="st-speed-num">
            <span class="st-num">{{ displaySpeed }}</span>
            <span class="st-unit">{{ speedUnit }}</span>
          </div>
          <div class="st-speed-lbl">{{ speedLabel }}</div>
        </div>
      </div>

      <!-- GO button -->
      <div class="st-btn-wrap">
        <button class="st-btn" :class="{ 'st-btn--running': isRunning, 'st-btn--done': state === 'complete' }"
          :disabled="isRunning" @click="startTest">
          <span class="st-btn-ring" />
          {{ btnLabel }}
        </button>
      </div>

      <!-- Phase pills -->
      <div class="st-phases">
        <div v-for="p in phases" :key="p.id" class="st-phase" :class="{
          'st-phase--active': currentPhase === p.id,
          'st-phase--done': phasesDone.includes(p.id)
        }">
          <span class="st-phase-dot" />{{ p.label }}
        </div>
      </div>

      <!-- Results -->
      <Transition name="st-fade-up">
        <div v-if="state === 'complete'" class="st-results">
          <div v-for="r in resultCards" :key="r.key" class="st-card">
            <div class="st-card-icon" :style="{ color: r.color }">{{ r.icon }}</div>
            <div class="st-card-val">{{ results[r.key] }}<span class="st-card-unit">{{ r.unit }}</span></div>
            <div class="st-card-lbl">{{ r.label }}</div>
            <div class="st-bar">
              <div class="st-bar-fill"
                :style="{ width: r.pct + '%', background: `linear-gradient(90deg, ${r.color2}, ${r.color})` }" />
            </div>
          </div>
        </div>
      </Transition>

    </main>

    <footer class="st-footer">
      <span>Phnom Penh · KH</span><span>·</span><span>{{ clock }}</span>
    </footer>
  </div>
</template>

<script setup>
useHead({
  style: [{ children: 'html,body{background:#07080f!important;margin:0;padding:0;}' }],
  link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;600&display=swap' }]
})

const ARC_LEN = 408
const state = ref('idle')
const currentPhase = ref('')
const liveSpeed = ref(0)
const phasesDone = ref([])
const clock = ref('')
const results = ref({ download: '—', upload: '—', ping: '—', jitter: '—' })

const phases = [
  { id: 'ping', label: 'Latency' },
  { id: 'download', label: 'Download' },
  { id: 'upload', label: 'Upload' },
]

const resultCards = computed(() => [
  {
    key: 'download', label: 'Download', icon: '↓', unit: 'Mbps', color: '#00f5c4', color2: '#3d6fff',
    pct: Math.min((parseFloat(results.value.download) / 1000) * 100, 100) || 0
  },
  {
    key: 'upload', label: 'Upload', icon: '↑', unit: 'Mbps', color: '#3d6fff', color2: '#8b5cf6',
    pct: Math.min((parseFloat(results.value.upload) / 500) * 100, 100) || 0
  },
  {
    key: 'ping', label: 'Ping', icon: '◇', unit: 'ms', color: '#facc15', color2: '#f97316',
    pct: Math.min(Math.max(100 - parseFloat(results.value.ping), 0), 100) || 0
  },
  {
    key: 'jitter', label: 'Jitter', icon: '≈', unit: 'ms', color: '#f472b6', color2: '#e879f9',
    pct: Math.min(Math.max(100 - parseFloat(results.value.jitter) * 5, 0), 100) || 0
  },
])

const isRunning = computed(() => ['ping', 'download', 'upload'].includes(state.value))
const displaySpeed = computed(() => {
  if (state.value === 'idle') return '—'
  if (state.value === 'ping') return results.value.ping !== '—' ? results.value.ping : '…'
  if (state.value === 'complete') return results.value.download
  return liveSpeed.value > 0 ? liveSpeed.value.toFixed(1) : '…'
})
const speedUnit = computed(() => state.value === 'ping' ? 'ms' : 'Mbps')
const speedLabel = computed(() => ({ idle: 'PRESS GO TO START', ping: 'MEASURING LATENCY', download: 'DOWNLOAD SPEED', upload: 'UPLOAD SPEED', complete: 'DOWNLOAD RESULT' }[state.value]))
const serverLabel = computed(() => ({ idle: 'NEAREST SERVER', ping: 'PINGING…', download: 'DOWNLOADING…', upload: 'UPLOADING…', complete: 'TEST COMPLETE' }[state.value]))
const btnLabel = computed(() => ({ idle: 'GO', ping: '···', download: '···', upload: '···', complete: 'RETEST' }[state.value]))
const arcColor = computed(() => ({ idle: '#1a2040', ping: '#facc15', download: '#00f5c4', upload: '#3d6fff', complete: '#00f5c4' }[state.value]))
const gaugePercent = computed(() => {
  if (!isRunning.value && state.value !== 'complete') return 0
  if (state.value === 'ping') return 0
  return Math.min(liveSpeed.value / (state.value === 'upload' ? 500 : 1000), 1)
})
const arcOffset = computed(() => ARC_LEN - gaugePercent.value * ARC_LEN)
const needleAngle = computed(() => -135 + gaugePercent.value * 270)

const ticks = computed(() => Array.from({ length: 11 }, (_, i) => {
  const major = i % 2 === 0
  const ang = (-135 + (i / 10) * 270) * Math.PI / 180
  const r = 130, cx = 160, cy = 180, len = major ? 16 : 8
  return {
    i,
    x1: cx + r * Math.cos(ang), y1: cy + r * Math.sin(ang),
    x2: cx + (r - len) * Math.cos(ang), y2: cy + (r - len) * Math.sin(ang),
    lx: cx + (r - 30) * Math.cos(ang), ly: cy + (r - 30) * Math.sin(ang),
    major, label: Math.round((i / 10) * 10) * 100,
  }
}))

if (import.meta.client) {
  const tick = () => { clock.value = new Date().toLocaleTimeString('en-GB') }
  tick(); setInterval(tick, 1000)
}

async function startTest() {
  if (isRunning.value) return
  results.value = { download: '—', upload: '—', ping: '—', jitter: '—' }
  phasesDone.value = []; liveSpeed.value = 0

  state.value = 'ping'; currentPhase.value = 'ping'
  await runPing()
  phasesDone.value = ['ping']

  state.value = 'download'; currentPhase.value = 'download'; liveSpeed.value = 0
  const dl = await simulateTransfer({ peak: rand(80, 920), duration: 6000, ramp: 1400 })
  results.value.download = dl.toFixed(1)
  phasesDone.value = ['ping', 'download']

  state.value = 'upload'; currentPhase.value = 'upload'; liveSpeed.value = 0
  const ul = await simulateTransfer({ peak: rand(30, 420), duration: 5000, ramp: 1200 })
  results.value.upload = ul.toFixed(1)
  phasesDone.value = ['ping', 'download', 'upload']

  state.value = 'complete'; currentPhase.value = ''
}

async function runPing() {
  const t = []
  for (let i = 0; i < 6; i++) {
    const t0 = performance.now()
    try { await fetch('https://www.cloudflare.com/cdn-cgi/trace', { mode: 'no-cors', cache: 'no-store' }) } catch { }
    t.push(performance.now() - t0)
    await sleep(180)
  }
  const ping = [...t].sort((a, b) => a - b)[Math.floor(t.length / 2)]
  const avg = t.reduce((s, v) => s + v, 0) / t.length
  const jitter = Math.sqrt(t.reduce((s, v) => s + (v - avg) ** 2, 0) / t.length)
  results.value.ping = Math.round(ping)
  results.value.jitter = Math.round(jitter)
}

function simulateTransfer({ peak, duration, ramp }) {
  return new Promise(resolve => {
    const t0 = performance.now()
    function frame(now) {
      const e = now - t0
      if (e >= duration) { liveSpeed.value = 0; return resolve(peak) }
      const r = Math.min(e / ramp, 1)
      const ease = r < 0.5 ? 2 * r * r : 1 - Math.pow(-2 * r + 2, 2) / 2
      liveSpeed.value = Math.max(0, peak * ease + (Math.random() - 0.5) * peak * 0.12)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const rand = (a, b) => a + Math.random() * (b - a)
</script>

<style scoped>
.st-root {
  min-height: 100vh;
  background: #07080f;
  color: #e2e8f0;
  font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow-x: hidden;
}

.st-bg-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(0, 245, 196, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 245, 196, 0.025) 1px, transparent 1px);
  background-size: 44px 44px;
}

.st-bg-glow {
  position: fixed;
  top: -150px;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 700px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(ellipse, rgba(0, 245, 196, 0.07) 0%, transparent 65%);
}

.st-header {
  width: 100%;
  max-width: 820px;
  padding: 26px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.st-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.22em;
  color: #00f5c4;
}

.st-server {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #3a4466;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.st-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1e2440;
  transition: background 0.3s, box-shadow 0.3s;
}

.st-dot--active {
  background: #00f5c4;
  box-shadow: 0 0 8px #00f5c4;
}

.st-main {
  flex: 1;
  width: 100%;
  max-width: 820px;
  padding: 32px 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.st-gauge-wrap {
  position: relative;
  width: 360px;
}

.st-gauge-svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

.st-speed-box {
  text-align: center;
  margin-top: 4px;
}

.st-speed-num {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}

.st-num {
  font-family: 'Space Mono', monospace;
  font-size: 56px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  letter-spacing: -0.04em;
}

.st-unit {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  color: #00f5c4;
  letter-spacing: 0.12em;
}

.st-speed-lbl {
  font-size: 10px;
  color: #3a4466;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  margin-top: 6px;
  font-family: 'Space Mono', monospace;
}

.st-btn-wrap {
  display: flex;
  justify-content: center;
}

.st-btn {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 1.5px solid #00f5c4;
  background: transparent;
  color: #00f5c4;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2em;
  cursor: pointer;
  outline: none;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
}

.st-btn:hover:not(:disabled) {
  background: rgba(0, 245, 196, 0.07);
  box-shadow: 0 0 32px rgba(0, 245, 196, 0.18);
}

.st-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.st-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.st-btn--done {
  border-color: #3d6fff;
  color: #3d6fff;
}

.st-btn--done:hover:not(:disabled) {
  background: rgba(61, 111, 255, 0.07);
  box-shadow: 0 0 32px rgba(61, 111, 255, 0.18);
}

.st-btn-ring {
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  border: 1px solid transparent;
}

.st-btn--running .st-btn-ring {
  border-top-color: #00f5c4;
  animation: spin 1.4s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.st-phases {
  display: flex;
  gap: 36px;
}

.st-phase {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #2a3050;
  transition: color 0.2s;
}

.st-phase--active {
  color: #00f5c4;
}

.st-phase--done {
  color: rgba(0, 245, 196, 0.35);
}

.st-phase-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.st-phase--active .st-phase-dot {
  box-shadow: 0 0 8px #00f5c4;
}

.st-results {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  width: 100%;
}

.st-card {
  background: #0d1022;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px 14px;
  text-align: center;
}

.st-card-icon {
  font-size: 18px;
  margin-bottom: 8px;
  line-height: 1;
}

.st-card-val {
  font-family: 'Space Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.st-card-unit {
  font-size: 10px;
  color: #3a4466;
  margin-left: 3px;
}

.st-card-lbl {
  font-size: 9px;
  color: #3a4466;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin: 8px 0 10px;
  font-family: 'Space Mono', monospace;
}

.st-bar {
  height: 2px;
  background: #1a2040;
  border-radius: 2px;
  overflow: hidden;
}

.st-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 1.2s ease-out;
}

.st-footer {
  padding: 18px 40px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #252d4a;
  letter-spacing: 0.1em;
  display: flex;
  gap: 14px;
}

.st-fade-up-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.st-fade-up-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

@media (max-width: 620px) {

  .st-header,
  .st-main {
    padding-left: 20px;
    padding-right: 20px;
  }

  .st-gauge-wrap {
    width: 290px;
  }

  .st-num {
    font-size: 42px;
  }

  .st-results {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>