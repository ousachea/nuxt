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
                <span class="big-num">{{ display }}</span>
                <span class="big-unit">{{ displayUnit }}</span>
            </div>
            <div class="big-label">{{ displayLabel }}</div>
        </div>

        <div class="bar-track">
            <div class="bar-fill" :style="{ width: barPct + '%' }" />
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

        <div class="metrics">
            <div class="m">
                <div class="m-lbl">Download</div>
                <div><span class="m-val">{{ results.download }}</span><span class="m-unit">Mbps</span></div>
            </div>
            <div class="m">
                <div class="m-lbl">Upload</div>
                <div><span class="m-val">{{ results.upload }}</span><span class="m-unit">Mbps</span></div>
            </div>
            <div class="m">
                <div class="m-lbl">Ping</div>
                <div><span class="m-val">{{ results.ping }}</span><span class="m-unit">ms</span></div>
            </div>
            <div class="m">
                <div class="m-lbl">Jitter</div>
                <div><span class="m-val">{{ results.jitter }}</span><span class="m-unit">ms</span></div>
            </div>
        </div>
    </div>
</template>

<script setup>
useHead({
    style: [{ children: 'html,body{margin:0;padding:0;background:#fff;}@media(prefers-color-scheme:dark){html,body{background:#0a0a0a;}}' }],
    link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap' }],
})

// ── Config ────────────────────────────────────────────────────────────────────
// How many bytes to upload (10 MB). Increase for faster connections.
const UPLOAD_SIZE = 10 * 1024 * 1024

const phases = [
    { id: 'ping', label: 'Latency' },
    { id: 'download', label: 'Download' },
    { id: 'upload', label: 'Upload' },
]

// ── State ─────────────────────────────────────────────────────────────────────
const busy = ref(false)
const currentPhase = ref('')
const donePhases = ref([])
const liveSpeed = ref(0)
const barPct = ref(0)
const statusTxt = ref('Ready')
const state = ref('idle')
const error = ref('')
const results = ref({ download: '—', upload: '—', ping: '—', jitter: '—' })

// ── Computed ──────────────────────────────────────────────────────────────────
const display = computed(() => {
    if (state.value === 'idle') return '—'
    if (state.value === 'complete') return results.value.download
    return liveSpeed.value > 0 ? liveSpeed.value.toFixed(1) : '…'
})

const displayUnit = computed(() =>
    currentPhase.value === 'ping' ? 'ms' : 'Mbps'
)

const displayLabel = computed(() => ({
    idle: 'Press start to begin',
    ping: 'Measuring latency',
    download: 'Download speed',
    upload: 'Upload speed',
    complete: 'Download result',
}[state.value] || ''))

const btnLabel = computed(() =>
    busy.value ? 'Testing…' : state.value === 'complete' ? 'Run again' : 'Start test'
)

// ── Runner ────────────────────────────────────────────────────────────────────
async function run() {
    if (busy.value) return
    busy.value = true
    error.value = ''
    state.value = 'idle'
    donePhases.value = []
    liveSpeed.value = 0
    barPct.value = 0
    results.value = { download: '—', upload: '—', ping: '—', jitter: '—' }

    try {
        // ── Phase 1: Ping ────────────────────────────────────────────────────────
        setPhase('ping')
        const { ping, jitter } = await measurePing()
        liveSpeed.value = ping
        barPct.value = Math.min(Math.max(100 - ping, 0), 100)
        results.value.ping = ping
        results.value.jitter = jitter
        markDone('ping')

        // ── Phase 2: Download ────────────────────────────────────────────────────
        setPhase('download')
        liveSpeed.value = 0; barPct.value = 0
        const dl = await measureDownload()
        results.value.download = dl.toFixed(1)
        markDone('download')

        // ── Phase 3: Upload ──────────────────────────────────────────────────────
        setPhase('upload')
        liveSpeed.value = 0; barPct.value = 0
        const ul = await measureUpload()
        results.value.upload = ul.toFixed(1)
        markDone('upload')

        // ── Done ─────────────────────────────────────────────────────────────────
        state.value = 'complete'
        currentPhase.value = ''
        liveSpeed.value = dl
        barPct.value = Math.min((dl / 1000) * 100, 100)
        statusTxt.value = 'Done'

    } catch (e) {
        error.value = 'Test failed — check your connection and try again.'
        state.value = 'idle'
        statusTxt.value = 'Error'
    }

    busy.value = false
}

// ── Ping: hit /api/ping 8 times, take median + jitter ────────────────────────
async function measurePing() {
    const times = []
    for (let i = 0; i < 8; i++) {
        const t0 = performance.now()
        await fetch('/api/ping', { cache: 'no-store' })
        times.push(performance.now() - t0)
        await sleep(100)
    }
    const sorted = [...times].sort((a, b) => a - b)
    const ping = sorted[Math.floor(sorted.length / 2)]
    const avg = times.reduce((s, v) => s + v, 0) / times.length
    const jitter = Math.sqrt(times.reduce((s, v) => s + (v - avg) ** 2, 0) / times.length)
    return { ping: Math.round(ping), jitter: Math.round(jitter) }
}

// ── Download: stream /api/download-test, measure bytes/sec live ───────────────
async function measureDownload() {
    const res = await fetch('/api/download-test', { cache: 'no-store' })
    if (!res.ok) throw new Error('Download endpoint failed')

    const reader = res.body.getReader()
    let bytes = 0
    const t0 = performance.now()

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.length
        const elapsed = (performance.now() - t0) / 1000
        if (elapsed > 0) {
            const mbps = (bytes * 8) / 1e6 / elapsed
            liveSpeed.value = +mbps.toFixed(1)
            barPct.value = Math.min((mbps / 1000) * 100, 100)
        }
    }

    const totalSec = (performance.now() - t0) / 1000
    return (bytes * 8) / 1e6 / totalSec
}

// ── Upload: POST a blob, measure bytes/sec via XHR progress ──────────────────
async function measureUpload() {
    const blob = new Blob([new Uint8Array(UPLOAD_SIZE)])

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const t0 = performance.now()

        xhr.upload.addEventListener('progress', (e) => {
            if (!e.lengthComputable) return
            const elapsed = (performance.now() - t0) / 1000
            if (elapsed > 0) {
                const mbps = (e.loaded * 8) / 1e6 / elapsed
                liveSpeed.value = +mbps.toFixed(1)
                barPct.value = Math.min((mbps / 500) * 100, 100)
            }
        })

        xhr.addEventListener('load', () => {
            const totalSec = (performance.now() - t0) / 1000
            resolve((UPLOAD_SIZE * 8) / 1e6 / totalSec)
        })

        xhr.addEventListener('error', reject)
        xhr.open('POST', '/api/upload-test')
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.send(blob)
    })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setPhase(id) {
    currentPhase.value = id
    state.value = id
    statusTxt.value = { ping: 'Pinging…', download: 'Downloading…', upload: 'Uploading…' }[id]
}
function markDone(id) {
    if (!donePhases.value.includes(id)) donePhases.value.push(id)
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
</script>

<style scoped>
.wrap {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    max-width: 480px;
    margin: 0 auto;
    padding: 40px 24px;
    display: flex;
    flex-direction: column;
    color: #0a0a0a;
}

@media (prefers-color-scheme: dark) {
    .wrap {
        color: #f0f0f0;
    }
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 56px;
}

.brand {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: .06em;
}

.status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    opacity: .4;
}

.dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: .3;
    transition: opacity .3s, background .3s;
}

.dot.on {
    opacity: 1;
    background: #22c55e;
}

.big-area {
    margin-bottom: 20px;
}

.big-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
}

.big-num {
    font-size: 80px;
    font-weight: 500;
    letter-spacing: -.04em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.big-unit {
    font-size: 14px;
    opacity: .35;
    letter-spacing: .04em;
}

.big-label {
    font-size: 12px;
    opacity: .35;
    margin-top: 10px;
}

.bar-track {
    height: 2px;
    background: rgba(0, 0, 0, .08);
    border-radius: 2px;
    margin-bottom: 28px;
    overflow: hidden;
}

@media (prefers-color-scheme: dark) {
    .bar-track {
        background: rgba(255, 255, 255, .1);
    }
}

.bar-fill {
    height: 100%;
    width: 0%;
    background: currentColor;
    border-radius: 2px;
    transition: width .12s linear;
}

.phases {
    display: flex;
    gap: 20px;
    margin-bottom: 32px;
}

.ph {
    font-size: 11px;
    opacity: .25;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: opacity .2s;
}

.ph.active {
    opacity: 1;
}

.ph.done {
    opacity: .25;
    text-decoration: line-through;
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
    height: 36px;
    padding: 0 22px;
    border-radius: 20px;
    border: 1px solid rgba(0, 0, 0, .15);
    background: transparent;
    color: inherit;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    letter-spacing: .04em;
    margin-bottom: 32px;
    position: relative;
    transition: background .15s, transform .1s;
}

@media (prefers-color-scheme: dark) {
    .go {
        border-color: rgba(255, 255, 255, .15);
    }
}

.go:hover:not(:disabled) {
    background: rgba(0, 0, 0, .04);
}

.go:active:not(:disabled) {
    transform: scale(.97);
}

.go:disabled {
    opacity: .3;
    cursor: default;
}

.go.spin::after {
    content: '';
    position: absolute;
    right: -28px;
    top: 50%;
    margin-top: -6px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid rgba(0, 0, 0, .12);
    border-top-color: currentColor;
    animation: rot 1s linear infinite;
}

@media (prefers-color-scheme: dark) {
    .go.spin::after {
        border-color: rgba(255, 255, 255, .12);
        border-top-color: currentColor;
    }
}

@keyframes rot {
    to {
        transform: rotate(360deg);
    }
}

.error {
    font-size: 12px;
    color: #e53e3e;
    margin-bottom: 20px;
    opacity: .8;
}

.metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    background: rgba(0, 0, 0, .07);
    border-radius: 12px;
    overflow: hidden;
}

@media (prefers-color-scheme: dark) {
    .metrics {
        background: rgba(255, 255, 255, .08);
    }
}

.m {
    background: #fff;
    padding: 16px 14px;
}

@media (prefers-color-scheme: dark) {
    .m {
        background: #0a0a0a;
    }
}

.m-lbl {
    font-size: 11px;
    opacity: .35;
    margin-bottom: 8px;
}

.m-val {
    font-size: 20px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
}

.m-unit {
    font-size: 10px;
    opacity: .35;
    margin-left: 2px;
}

@media (max-width: 400px) {
    .big-num {
        font-size: 60px;
    }

    .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>