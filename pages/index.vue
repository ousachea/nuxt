<template>
    <div class="wrap">
        <header class="header">
            <span class="brand">Netpulse</span>
            <div class="status">
                <span class="dot" :class="{ on: busy }" />
                <span>{{ statusTxt }}</span>
            </div>
        </header>

        <!-- Connection badge -->
        <div class="conn-badge" :class="connBadgeClass">
            <span class="conn-icon">{{ connIcon }}</span>
            {{ profile.label }}
        </div>

        <div class="big-area">
            <div class="big-row">
                <span class="big-num" :class="{ pop: numPop }" :style="{ color: phaseColor.num }">{{ display }}</span>
                <span class="big-unit">{{ displayUnit }}</span>
            </div>
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
                <span v-for="t in profile.ticks" :key="t" class="tick">{{ t }}</span>
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

        <div v-if="error" class="error-msg">{{ error }}</div>

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

<script setup lang="ts">
useHead({
    style: [{ children: 'html,body{margin:0;padding:0;background:#0c0c0f;}' }],
    link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap' }],
})

// ── Connection profiles ───────────────────────────────────────────────────────
interface ConnProfile {
    type: 'wifi' | 'cellular' | 'unknown'
    label: string
    uploadSize: number
    dlPayloadMB: number
    dlMax: number
    ulMax: number
    ticks: string[]
}

const PROFILES: Record<string, ConnProfile> = {
    wifi: {
        type: 'wifi', label: 'Wi-Fi / Broadband',
        uploadSize: 10 * 1024 * 1024, dlPayloadMB: 20,
        dlMax: 1000, ulMax: 500,
        ticks: ['0', '250', '500', '750', '1000'],
    },
    cellular: {
        type: 'cellular', label: 'Cellular / SIM',
        uploadSize: 2 * 1024 * 1024, dlPayloadMB: 5,
        dlMax: 150, ulMax: 75,
        ticks: ['0', '37', '75', '112', '150'],
    },
    unknown: {
        type: 'unknown', label: 'Detecting…',
        uploadSize: 5 * 1024 * 1024, dlPayloadMB: 10,
        dlMax: 500, ulMax: 200,
        ticks: ['0', '125', '250', '375', '500'],
    },
}

function detectProfile(): ConnProfile {
    if (!import.meta.client) return PROFILES.unknown
    const nav = navigator as any
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection
    if (!conn) return PROFILES.unknown
    const etype: string = (conn.effectiveType ?? '').toLowerCase()
    const ctype: string = (conn.type ?? '').toLowerCase()
    if (ctype === 'wifi' || ctype === 'ethernet') return PROFILES.wifi
    if (['cellular', 'wimax'].includes(ctype)) return PROFILES.cellular
    if (['4g'].includes(etype)) return PROFILES.cellular
    if (['slow-2g', '2g', '3g'].includes(etype)) return PROFILES.cellular
    return PROFILES.unknown
}

// After a warmup ping we refine: < 50ms likely wifi, > 120ms likely cellular
async function refineProfile(p: ConnProfile): Promise<ConnProfile> {
    try {
        const t0 = performance.now()
        await fetch('/api/ping', { cache: 'no-store' })
        const rtt = performance.now() - t0
        if (p.type === 'unknown') {
            return rtt < 60 ? PROFILES.wifi : PROFILES.cellular
        }
    } catch { }
    return p
}

// ── Phase colors ──────────────────────────────────────────────────────────────
const COLORS: Record<string, Record<string, string>> = {
    idle: { num: '#222', bar: '#1a1a1f', glow: 'transparent', label: '#333' },
    ping: { num: '#facc15', bar: '#ca8a04', glow: 'rgba(250,204,21,.55)', label: '#a37f0d' },
    download: { num: '#34d399', bar: '#059669', glow: 'rgba(52,211,153,.55)', label: '#0a7a4f' },
    upload: { num: '#60a5fa', bar: '#2563eb', glow: 'rgba(96,165,250,.55)', label: '#1d4fa8' },
    complete: { num: '#34d399', bar: '#059669', glow: 'rgba(52,211,153,.55)', label: '#0a7a4f' },
}

// ── State ─────────────────────────────────────────────────────────────────────
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

const profile = ref<ConnProfile>(PROFILES.unknown)
const busy = ref(false)
const currentPhase = ref('')
const donePhases = ref<string[]>([])
const liveSpeed = ref(0)
const barPct = ref(0)
const statusTxt = ref('Ready')
const state = ref('idle')
const error = ref('')
const numPop = ref(false)
const typedLabel = ref('Press start to begin')
const typing = ref(false)
const results = ref<Record<string, string | number>>({
    download: '—', upload: '—', ping: '—', jitter: '—',
})

// Detect connection on mount
onMounted(() => { profile.value = detectProfile() })

// ── Computed ──────────────────────────────────────────────────────────────────
const phaseColor = computed(() => COLORS[state.value] ?? COLORS.idle)

const connBadgeClass = computed(() => ({
    'badge-wifi': profile.value.type === 'wifi',
    'badge-cellular': profile.value.type === 'cellular',
    'badge-unknown': profile.value.type === 'unknown',
}))
const connIcon = computed(() =>
    ({ wifi: '▲', cellular: '◉', unknown: '○' }[profile.value.type])
)

const display = computed(() => {
    if (state.value === 'idle') return '—'
    if (state.value === 'complete') return results.value.download
    return liveSpeed.value > 0 ? Number(liveSpeed.value).toFixed(1) : '…'
})
const displayUnit = computed(() => currentPhase.value === 'ping' ? 'ms' : 'Mbps')
const btnLabel = computed(() =>
    busy.value ? 'Testing…' : state.value === 'complete' ? 'Run again' : 'Start test'
)

// ── Typewriter ────────────────────────────────────────────────────────────────
async function typewrite(text: string) {
    typing.value = true
    typedLabel.value = ''
    for (const ch of text) {
        typedLabel.value += ch
        await sleep(36)
    }
    typing.value = false
}

// ── Card flip ─────────────────────────────────────────────────────────────────
async function flipCard(key: string, value: string | number) {
    const card = metricCards.find(c => c.key === key)
    if (!card) return
    card.flipping = true
    await sleep(250)
    results.value[key] = value
    card.revealed = true
    await sleep(260)
    card.flipping = false
}

function triggerPop() {
    numPop.value = false
    nextTick(() => { numPop.value = true; setTimeout(() => { numPop.value = false }, 260) })
}

function setPhase(id: string) {
    currentPhase.value = id
    state.value = id
    statusTxt.value = ({ ping: 'Pinging…', download: 'Downloading…', upload: 'Uploading…' } as Record<string, string>)[id] ?? ''
}
function markDone(id: string) {
    if (!donePhases.value.includes(id)) donePhases.value.push(id)
}

function reset() {
    donePhases.value = []
    liveSpeed.value = 0
    barPct.value = 0
    error.value = ''
    results.value = { download: '—', upload: '—', ping: '—', jitter: '—' }
    metricCards.forEach(c => { c.flipping = false; c.revealed = false })
}

// ── Main runner ───────────────────────────────────────────────────────────────
async function run() {
    if (busy.value) return
    busy.value = true
    state.value = 'idle'
    reset()

    try {
        // Detect & refine connection profile before starting
        let p = detectProfile()
        p = await refineProfile(p)
        profile.value = p

        // ── Ping ──────────────────────────────────────────────────────────────────
        setPhase('ping')
        await typewrite('Measuring latency…')
        const { ping, jitter } = await measurePing()
        liveSpeed.value = ping
        barPct.value = Math.min(Math.max(100 - ping, 0), 100)
        triggerPop()
        await Promise.all([flipCard('ping', ping), flipCard('jitter', jitter)])
        markDone('ping')
        await sleep(300)

        // ── Download ──────────────────────────────────────────────────────────────
        setPhase('download')
        await typewrite('Download speed')
        liveSpeed.value = 0; barPct.value = 0
        const dl = await measureDownload(p)
        triggerPop()
        await flipCard('download', dl.toFixed(1))
        results.value.download = dl.toFixed(1)
        markDone('download')
        await sleep(300)

        // ── Upload ────────────────────────────────────────────────────────────────
        setPhase('upload')
        await typewrite('Upload speed')
        liveSpeed.value = 0; barPct.value = 0
        const ul = await measureUpload(p)
        triggerPop()
        await flipCard('upload', ul.toFixed(1))
        results.value.upload = ul.toFixed(1)
        markDone('upload')

        // ── Done ──────────────────────────────────────────────────────────────────
        state.value = 'complete'
        currentPhase.value = ''
        liveSpeed.value = dl
        barPct.value = Math.min((dl / p.dlMax) * 100, 100)
        statusTxt.value = 'Done'
        await typewrite('Test complete')

    } catch (e: any) {
        console.error('[SpeedTest]', e)
        error.value = `Test failed: ${e?.message ?? 'unknown error'}`
        state.value = 'idle'
        statusTxt.value = 'Error'
        await typewrite('Something went wrong')
    }

    busy.value = false
}

// ── Ping ──────────────────────────────────────────────────────────────────────
async function measurePing(): Promise<{ ping: number; jitter: number }> {
    const times: number[] = []
    const rounds = 8
    for (let i = 0; i < rounds; i++) {
        const t0 = performance.now()
        const res = await fetch('/api/ping', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Ping returned ${res.status}`)
        await res.json()
        times.push(performance.now() - t0)
        if (i < rounds - 1) await sleep(80)
    }
    const sorted = [...times].sort((a, b) => a - b)
    const ping = sorted[Math.floor(sorted.length / 2)]
    const avg = times.reduce((s, v) => s + v, 0) / times.length
    const jitter = Math.sqrt(times.reduce((s, v) => s + (v - avg) ** 2, 0) / times.length)
    return { ping: Math.round(ping), jitter: Math.round(jitter) }
}

// ── Download ──────────────────────────────────────────────────────────────────
async function measureDownload(p: ConnProfile): Promise<number> {
    // Pass payload size as query param so server adjusts how much to stream
    const res = await fetch(`/api/download-test?mb=${p.dlPayloadMB}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Download returned ${res.status}`)
    if (!res.body) throw new Error('Streaming not supported in this browser')

    const reader = res.body.getReader()
    let bytes = 0
    const t0 = performance.now()

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.length
        const secs = (performance.now() - t0) / 1000
        if (secs > 0.15) {
            liveSpeed.value = +((bytes * 8) / 1e6 / secs).toFixed(1)
            barPct.value = Math.min((liveSpeed.value / p.dlMax) * 100, 100)
        }
    }

    const total = (performance.now() - t0) / 1000
    if (total === 0 || bytes === 0) throw new Error('No download data received')
    return (bytes * 8) / 1e6 / total
}

// ── Upload ────────────────────────────────────────────────────────────────────
function measureUpload(p: ConnProfile): Promise<number> {
    return new Promise((resolve, reject) => {
        const payload = new Uint8Array(p.uploadSize)
        crypto.getRandomValues(payload.subarray(0, Math.min(4096, p.uploadSize)))
        const blob = new Blob([payload])
        const xhr = new XMLHttpRequest()
        const t0 = performance.now()

        xhr.upload.addEventListener('progress', (e) => {
            if (!e.lengthComputable) return
            const secs = (performance.now() - t0) / 1000
            if (secs > 0.15) {
                liveSpeed.value = +((e.loaded * 8) / 1e6 / secs).toFixed(1)
                barPct.value = Math.min((liveSpeed.value / p.ulMax) * 100, 100)
            }
        })

        xhr.addEventListener('load', () => {
            if (xhr.status < 200 || xhr.status >= 300)
                return reject(new Error(`Upload returned ${xhr.status}`))
            const secs = (performance.now() - t0) / 1000
            resolve((p.uploadSize * 8) / 1e6 / secs)
        })

        xhr.addEventListener('error', () => reject(new Error('Upload network error')))
        xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')))

        xhr.timeout = 30_000
        xhr.open('POST', '/api/upload-test')
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.send(blob)
    })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
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
    margin-bottom: 20px;
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

/* Connection badge */
.conn-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: .07em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 20px;
    margin-bottom: 32px;
    align-self: flex-start;
    border: 1px solid;
}

.conn-icon {
    font-size: 8px;
}

.badge-wifi {
    color: #34d399;
    border-color: rgba(52, 211, 153, .25);
    background: rgba(52, 211, 153, .06);
}

.badge-cellular {
    color: #60a5fa;
    border-color: rgba(96, 165, 250, .25);
    background: rgba(96, 165, 250, .06);
}

.badge-unknown {
    color: #555;
    border-color: #222;
    background: transparent;
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

.error-msg {
    font-size: 11px;
    color: #f87171;
    margin-bottom: 16px;
    letter-spacing: .03em;
    line-height: 1.5;
}

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
        margin-bottom: 16px;
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