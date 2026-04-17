<template>
    <div class="wrap">
        <header class="header">
            <span class="brand">Netpulse</span>
            <div class="status">
                <span class="dot" :class="{ on: busy }" />
                <span>{{ statusTxt }}</span>
            </div>
        </header>

        <div class="big-area">
            <div class="big-row">
                <span class="big-num" :class="{ pop: numPop }" :style="{ color: phaseColor.num }">{{ display }}</span>
                <span class="big-unit">{{ displayUnit }}</span>
            </div>
            <!-- Typewriter label -->
            <div class="big-label" :style="{ color: phaseColor.label }">
                {{ typedLabel }}<span class="cursor" :class="{ blink: typing }">|</span>
            </div>
        </div>

        <div class="bar-wrap">
            <div class="bar-track">
                <div class="bar-fill" :style="{ width: barPct + '%', background: phaseColor.bar }" />
                <div class="bar-glow" :style="{ background: phaseColor.glow, opacity: barPct > 0 ? 1 : 0 }" />
            </div>
            <div class="ticks">
                <span v-for="t in ['0', '250', '500', '750', '1000']" :key="t" class="tick">{{ t }}</span>
            </div>
        </div>

        <div class="phases">
            <div v-for="p in phases" :key="p.id" class="ph"
                :class="{ active: currentPhase === p.id, done: donePhases.includes(p.id) }">
                <span class="ph-dot" />{{ p.label }}
            </div>
        </div>

        <button class="go" :class="{ spin: busy }" :disabled="busy" @click="run">
            {{ btnLabel }}
        </button>

        <div v-if="error" class="error">{{ error }}</div>

        <!-- Metric cards with flip animation -->
        <div class="metrics">
            <div v-for="card in metricCards" :key="card.key" class="flip-wrap">
                <div class="flip-card" :class="{ flipping: card.flipping }">
                    <div class="m-lbl">{{ card.label }}</div>
                    <div>
                        <span class="m-val" :style="{ color: card.revealed ? card.color : '#222' }">
                            {{ results[card.key] }}
                        </span>
                        <span class="m-unit">{{ card.unit }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
useHead({
    style: [{ children: 'html,body{margin:0;padding:0;background:#0c0c0f;}' }],
    link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap' }],
})

const UPLOAD_SIZE = 10 * 1024 * 1024

const COLORS = {
    idle: { num: '#222', bar: '#1a1a1f', glow: 'transparent', label: '#333' },
    ping: { num: '#facc15', bar: '#ca8a04', glow: 'rgba(250,204,21,.55)', label: '#a37f0d' },
    download: { num: '#34d399', bar: '#059669', glow: 'rgba(52,211,153,.55)', label: '#0a7a4f' },
    upload: { num: '#60a5fa', bar: '#2563eb', glow: 'rgba(96,165,250,.55)', label: '#1d4fa8' },
    complete: { num: '#34d399', bar: '#059669', glow: 'rgba(52,211,153,.55)', label: '#0a7a4f' },
}

const phases = [
    { id: 'ping', label: 'Latency' },
    { id: 'download', label: 'Download' },
    { id: 'upload', label: 'Upload' },
]

const metricCards = reactive([
    { key: 'download', label: 'Download', unit: 'Mbps', color: '#34d399', flipping: false, revealed: false },
    { key: 'upload', label: 'Upload', unit: 'Mbps', color: '#60a5fa', flipping: false, revealed: false },
    { key: 'ping', label: 'Ping', unit: 'ms', color: '#facc15', flipping: false, revealed: false },
    { key: 'jitter', label: 'Jitter', unit: 'ms', color: '#facc15', flipping: false, revealed: false },
])

const busy = ref(false)
const currentPhase = ref('')
const donePhases = ref([])
const liveSpeed = ref(0)
const barPct = ref(0)
const statusTxt = ref('Ready')
const state = ref('idle')
const error = ref('')
const numPop = ref(false)
const typedLabel = ref('Press start to begin')
const typing = ref(false)
const results = ref({ download: '—', upload: '—', ping: '—', jitter: '—' })

const phaseColor = computed(() => COLORS[state.value] || COLORS.idle)

const display = computed(() => {
    if (state.value === 'idle') return '—'
    if (state.value === 'complete') return results.value.download
    return liveSpeed.value > 0 ? liveSpeed.value.toFixed(1) : '…'
})
const displayUnit = computed(() => currentPhase.value === 'ping' ? 'ms' : 'Mbps')
const btnLabel = computed(() =>
    busy.value ? 'Testing…' : state.value === 'complete' ? 'Run again' : 'Start test'
)

// ── Typewriter ────────────────────────────────────────────────────────────────
async function typewrite(text) {
    typing.value = true
    typedLabel.value = ''
    for (const ch of text) {
        typedLabel.value += ch
        await sleep(36)
    }
    typing.value = false
}

// ── Card flip ─────────────────────────────────────────────────────────────────
async function flipCard(key, value) {
    const card = metricCards.find(c => c.key === key)
    if (!card) return
    card.flipping = true
    // At halfway point of flip, swap the value in
    await sleep(250)
    results.value[key] = value
    card.revealed = true
    await sleep(260)
    card.flipping = false
}

// ── Number pop ────────────────────────────────────────────────────────────────
function triggerPop() {
    numPop.value = false
    nextTick(() => { numPop.value = true; setTimeout(() => { numPop.value = false }, 260) })
}

// ── Main runner ───────────────────────────────────────────────────────────────
async function run() {
    if (busy.value) return
    busy.value = true
    error.value = ''
    state.value = 'idle'
    donePhases.value = []
    liveSpeed.value = 0
    barPct.value = 0
    results.value = { download: '—', upload: '—', ping: '—', jitter: '—' }
    metricCards.forEach(c => { c.flipping = false; c.revealed = false })

    try {
        // Ping
        setPhase('ping')
        await typewrite('Measuring latency…')
        const { ping, jitter } = await measurePing()
        liveSpeed.value = ping
        barPct.value = Math.min(Math.max(100 - ping, 0), 100)
        triggerPop()
        await Promise.all([flipCard('ping', ping), flipCard('jitter', jitter)])
        markDone('ping')
        await sleep(300)

        // Download
        setPhase('download')
        await typewrite('Download speed')
        liveSpeed.value = 0; barPct.value = 0
        const dl = await measureDownload()
        triggerPop()
        await flipCard('download', dl.toFixed(1))
        markDone('download')
        await sleep(300)

        // Upload
        setPhase('upload')
        await typewrite('Upload speed')
        liveSpeed.value = 0; barPct.value = 0
        const ul = await measureUpload()
        triggerPop()
        await flipCard('upload', ul.toFixed(1))
        markDone('upload')

        // Done
        state.value = 'complete'
        currentPhase.value = ''
        liveSpeed.value = dl
        barPct.value = Math.min((dl / 1000) * 100, 100)
        statusTxt.value = 'Done'
        await typewrite('Test complete')

    } catch (e) {
        error.value = 'Test failed — check your connection and try again.'
        state.value = 'idle'
        statusTxt.value = 'Error'
        await typewrite('Something went wrong')
    }

    busy.value = false
}

function setPhase(id) {
    currentPhase.value = id
    state.value = id
    statusTxt.value = { ping: 'Pinging…', download: 'Downloading…', upload: 'Uploading…' }[id]
}
function markDone(id) {
    if (!donePhases.value.includes(id)) donePhases.value.push(id)
}

// ── Real measurements ─────────────────────────────────────────────────────────
async function measurePing() {
    const t = []
    for (let i = 0; i < 8; i++) {
        const t0 = performance.now()
        await fetch('/api/ping', { cache: 'no-store' })
        t.push(performance.now() - t0)
        await sleep(100)
    }
    const sorted = [...t].sort((a, b) => a - b)
    const ping = sorted[Math.floor(sorted.length / 2)]
    const avg = t.reduce((s, v) => s + v, 0) / t.length
    const jitter = Math.sqrt(t.reduce((s, v) => s + (v - avg) ** 2, 0) / t.length)
    return { ping: Math.round(ping), jitter: Math.round(jitter) }
}

async function measureDownload() {
    const res = await fetch('/api/download-test', { cache: 'no-store' })
    if (!res.ok) throw new Error('Download failed')
    const reader = res.body.getReader()
    let bytes = 0
    const t0 = performance.now()
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.length
        const elapsed = (performance.now() - t0) / 1000
        if (elapsed > 0) {
            liveSpeed.value = +((bytes * 8) / 1e6 / elapsed).toFixed(1)
            barPct.value = Math.min((liveSpeed.value / 1000) * 100, 100)
        }
    }
    return (bytes * 8) / 1e6 / ((performance.now() - t0) / 1000)
}

function measureUpload() {
    const blob = new Blob([new Uint8Array(UPLOAD_SIZE)])
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const t0 = performance.now()
        xhr.upload.addEventListener('progress', (e) => {
            if (!e.lengthComputable) return
            const elapsed = (performance.now() - t0) / 1000
            if (elapsed > 0) {
                liveSpeed.value = +((e.loaded * 8) / 1e6 / elapsed).toFixed(1)
                barPct.value = Math.min((liveSpeed.value / 500) * 100, 100)
            }
        })
        xhr.addEventListener('load', () => resolve((UPLOAD_SIZE * 8) / 1e6 / ((performance.now() - t0) / 1000)))
        xhr.addEventListener('error', reject)
        xhr.open('POST', '/api/upload-test')
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.send(blob)
    })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
</script>

<style scoped>
@keyframes rot {
    to {
        transform: rotate(360deg);
    }
}

@keyframes pop {

    0%,
    100% {
        transform: scale(1)
    }

    50% {
        transform: scale(1.045)
    }
}

@keyframes breathe {

    0%,
    100% {
        opacity: 1
    }

    50% {
        opacity: .45
    }
}

@keyframes blink {

    0%,
    100% {
        opacity: 1
    }

    50% {
        opacity: 0
    }
}

@keyframes flipOut {
    0% {
        transform: rotateY(0)
    }

    100% {
        transform: rotateY(90deg)
    }
}

@keyframes flipIn {
    0% {
        transform: rotateY(-90deg)
    }

    100% {
        transform: rotateY(0)
    }
}

.wrap {
    font-family: 'DM Sans', sans-serif;
    max-width: 480px;
    margin: 0 auto;
    padding: 40px 28px 48px;
    padding-bottom: max(48px, env(safe-area-inset-bottom, 48px));
    display: flex;
    flex-direction: column;
    background: #0c0c0f;
    color: #fff;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 52px;
}

.brand {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
}

.status {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: #444;
    letter-spacing: .04em;
}

.dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2a2a2a;
    transition: background .4s, box-shadow .4s;
}

.dot.on {
    background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, .18);
}

.big-area {
    margin-bottom: 18px;
}

.big-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
}

.big-num {
    font-size: 84px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -.04em;
    font-variant-numeric: tabular-nums;
    transition: color .5s;
}

.big-num.pop {
    animation: pop .26s ease;
}

.big-unit {
    font-size: 15px;
    color: #333;
    letter-spacing: .06em;
}

.big-label {
    font-size: 12px;
    margin-top: 12px;
    letter-spacing: .04em;
    min-height: 18px;
    transition: color .5s;
}

.cursor {
    display: inline-block;
    margin-left: 1px;
    opacity: 0;
    font-weight: 300;
}

.cursor.blink {
    opacity: 1;
    animation: blink .7s step-end infinite;
}

.bar-wrap {
    margin-bottom: 28px;
}

.bar-track {
    height: 3px;
    background: #111;
    border-radius: 3px;
    overflow: visible;
    position: relative;
}

.bar-fill {
    height: 100%;
    width: 0%;
    border-radius: 3px;
    transition: width .12s linear, background .5s;
}

.bar-glow {
    position: absolute;
    right: -2px;
    top: -3px;
    width: 18px;
    height: 9px;
    border-radius: 50%;
    filter: blur(5px);
    transition: opacity .3s, background .5s;
    pointer-events: none;
}

.ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 7px;
    padding: 0 1px;
}

.tick {
    font-size: 9px;
    color: #222;
    font-variant-numeric: tabular-nums;
}

.phases {
    display: flex;
    gap: 18px;
    margin-bottom: 32px;
}

.ph {
    font-size: 11px;
    color: #2a2a2a;
    display: flex;
    align-items: center;
    gap: 5px;
    letter-spacing: .03em;
    transition: color .25s;
}

.ph.active {
    color: #fff;
    animation: breathe 1.4s ease infinite;
}

.ph.done {
    color: #1e1e1e;
    text-decoration: line-through;
    text-decoration-color: #1e1e1e;
}

.ph-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
}

.go {
    align-self: flex-start;
    height: 38px;
    padding: 0 26px;
    border-radius: 20px;
    border: 1px solid #222;
    background: transparent;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    letter-spacing: .05em;
    margin-bottom: 40px;
    position: relative;
    transition: border-color .25s, background .2s, transform .1s;
}

.go:hover:not(:disabled) {
    border-color: #444;
    background: #111;
}

.go:active:not(:disabled) {
    transform: scale(.96);
}

.go:disabled {
    opacity: .25;
    cursor: default;
}

.go.spin::after {
    content: '';
    position: absolute;
    right: -30px;
    top: 50%;
    margin-top: -7px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.5px solid #222;
    border-top-color: #fff;
    animation: rot 1s linear infinite;
}

.error {
    font-size: 11px;
    color: #e53e3e;
    margin-bottom: 16px;
    letter-spacing: .03em;
}

/* Card flip grid */
.metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
}

.flip-wrap {
    perspective: 500px;
}

.flip-card {
    background: #0f0f14;
    border: 1px solid #111;
    border-radius: 12px;
    padding: 16px 14px;
    transform-style: preserve-3d;
}

/* Two-phase flip: out then in */
.flip-card.flipping {
    animation: flipOut .26s ease forwards, flipIn .26s ease .26s forwards;
}

.m-lbl {
    font-size: 10px;
    color: #2a2a2a;
    margin-bottom: 8px;
    letter-spacing: .05em;
    text-transform: uppercase;
}

.m-val {
    font-size: 21px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    transition: color .3s;
}

.m-unit {
    font-size: 10px;
    color: #2a2a2a;
    margin-left: 2px;
}

@media (max-width: 400px) {
    .wrap {
        padding: 28px 20px 40px;
    }

    .header {
        margin-bottom: 36px;
    }

    .big-num {
        font-size: 60px;
    }

    .go {
        margin-bottom: 28px;
    }

    .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>