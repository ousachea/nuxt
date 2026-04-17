<template>
    <div class="solver">
        <header class="header">
            <div class="header__logo"><span class="logo-sq" />
                <h1>KUBE</h1>
            </div>
            <p class="header__sub">Rubik's Cube Solver</p>
        </header>

        <main class="main">

            <!-- ══ LEFT: 3D Cube ══ -->
            <section class="panel panel--cube">
                <div class="preview-header">
                    <p class="panel__label">3D CUBE · <span class="hint-text">click a face to edit</span></p>
                    <span v-if="solution.length" class="step-badge">{{ currentStep }}/{{ solution.length }}</span>
                </div>

                <!-- 3D scene — click face to open editor, drag to rotate -->
                <div class="scene" @mousedown="startDrag" @touchstart.prevent="startDragTouch">
                    <div class="cube3d" :style="cubeStyle" :class="{ 'cube3d--flash': flashing }">
                        <div v-for="fd in FACE_DEFS" :key="fd.id" class="face"
                            :class="[fd.cls, { 'face--active': activeFace === fd.id }]" :data-face="fd.id">
                            <div class="mini-grid">
                                <div v-for="j in 9" :key="j" class="mc"
                                    :class="{ 'mc--empty': preview[fd.id][fd.order[j - 1]] === EMPTY }"
                                    :style="{ background: hex(preview[fd.id][fd.order[j - 1]]) }" />
                            </div>
                            <div class="face-id-badge">{{ fd.id }}</div>
                        </div>
                    </div>
                </div>
                <p class="drag-hint">Drag to rotate · Click face to edit</p>

                <!-- Solution controls -->
                <template v-if="alreadySolved">
                    <p class="solved-msg">✓ Already solved!</p>
                </template>
                <template v-else-if="solution.length">
                    <p class="panel__label">SOLUTION · {{ solution.length }} moves</p>
                    <div class="move-list">
                        <span v-for="(m, i) in solution" :key="i" class="move-chip"
                            :class="{ done: i < currentStep, current: i === currentStep }" @click="jumpTo(i + 1)">{{ m
                            }}</span>
                    </div>
                    <div class="step-row">
                        <button class="btn ghost sm" :disabled="currentStep === 0 || animating" @click="stepBack">‹</button>
                        <button class="btn ghost sm" :disabled="currentStep >= solution.length || animating"
                            @click="stepFwd">›</button>
                        <button class="btn primary sm" :disabled="playing || animating" @click="autoPlay">▶ Auto</button>
                        <button v-if="playing" class="btn ghost sm" @click="stopPlay">■</button>
                        <button class="btn ghost sm" :disabled="animating" @click="jumpTo(0)">↺</button>
                        <div class="speed-wrap">
                            <span class="speed-label">{{ playSpeedLabel }}</span>
                            <input type="range" min="1" max="5" v-model.number="playSpeed" class="speed-slider" />
                        </div>
                    </div>
                </template>
                <div v-else-if="!solving" class="empty">
                    <div class="empty-hex">⬡</div>
                    <p>Click a face on the cube to start editing</p>
                </div>
            </section>

            <!-- ══ RIGHT: Editor panel ══ -->
            <section class="panel panel--editor">

                <!-- Face editor (shown when a face is selected) -->
                <template v-if="activeFace">
                    <div class="face-editor-header">
                        <div class="face-nav">
                            <button v-for="fd in FACE_DEFS" :key="fd.id" class="face-nav-btn"
                                :class="{ active: activeFace === fd.id }" @click="openFaceEditor(fd.id)">{{ fd.id
                                }}</button>
                        </div>
                        <button class="btn ghost sm" @click="activeFace = null">✕ Close</button>
                    </div>

                    <div class="face-editor-body">
                        <!-- Large flat face grid -->
                        <div class="big-face-wrap">
                            <p class="face-editor-label">{{ FACE_NAMES[activeFace] }} Face</p>
                            <div class="big-face">
                                <div v-for="(_, vi) in Array(9)" :key="vi" class="big-sticker"
                                    :class="{ 'big-sticker--empty': faceDisplayColors[vi] === EMPTY, 'big-sticker--predicted': isPredicted(activeFace, FACE_DEFS.find(f => f.id === activeFace).order[vi]) }"
                                    :style="{ background: hex(faceDisplayColors[vi]) }" @click="paintOnFace(vi)">
                                    <span v-if="isPredicted(activeFace, FACE_DEFS.find(f => f.id === activeFace).order[vi])"
                                        class="predicted-dot">●</span>
                                </div>
                            </div>
                            <!-- Neighbor labels around the grid -->
                            <div class="neighbor-labels">
                                <span class="nb nb--top">{{ faceNeighbors[activeFace]?.top }}</span>
                                <span class="nb nb--left">{{ faceNeighbors[activeFace]?.left }}</span>
                                <span class="nb nb--right">{{ faceNeighbors[activeFace]?.right }}</span>
                                <span class="nb nb--bottom">{{ faceNeighbors[activeFace]?.bottom }}</span>
                            </div>
                        </div>

                        <!-- Color picker -->
                        <div class="editor-palette">
                            <p class="panel__label">COLOR</p>
                            <div class="palette">
                                <button v-for="col in COLORS" :key="col.id" class="pal-btn"
                                    :class="{ active: selectedColor === col.id, maxed: colorCount(col.id) >= 9 }"
                                    :style="{ background: col.hex }"
                                    :disabled="colorCount(col.id) >= 9 && selectedColor !== col.id"
                                    @click="selectedColor = col.id">
                                    <span v-if="selectedColor === col.id" class="pal-check">✓</span>
                                    <span class="pal-count" :class="{ 'pal-count--full': colorCount(col.id) >= 9 }">{{
                        colorCount(col.id) }}/9</span>
                                </button>
                                <button class="pal-btn eraser-btn" :class="{ active: selectedColor === EMPTY }"
                                    @click="selectedColor = EMPTY" title="Erase">
                                    <span v-if="selectedColor === EMPTY" class="pal-check"
                                        style="color:rgba(255,255,255,0.8)">✓</span>
                                    <span v-else class="eraser-icon">⌫</span>
                                    <span class="pal-count" style="color:rgba(255,255,255,0.35)">{{ emptyCount
                                        }}/54</span>
                                </button>
                            </div>

                            <!-- Prediction row -->
                            <div v-if="predictions.length" class="predict-row">
                                <p class="panel__label">PREDICTED</p>
                                <div class="predict-chips">
                                    <button v-for="p in predictions" :key="p.colorId" class="predict-chip"
                                        :style="{ background: hex(p.colorId) }" @click="applyPrediction(p.colorId)"
                                        :title="`Fill remaining ${activeFace} stickers with this color (${p.remaining} left)`">
                                        <span class="predict-chip-label">{{ p.remaining }} left</span>
                                    </button>
                                </div>
                                <p class="predict-hint">Auto-fill remaining stickers of this face</p>
                            </div>

                            <!-- Fill face shortcut -->
                            <button v-if="selectedColor !== EMPTY && colorCount(selectedColor) < 9"
                                class="btn ghost sm fill-btn" @click="fillFace">Fill empty stickers with {{
                        selectedColor }}</button>
                        </div>
                    </div>
                </template>

                <!-- No face selected -->
                <template v-else>
                    <p class="panel__label">EDITOR</p>
                    <p class="panel__desc">Click any face on the 3D cube to edit it.</p>

                    <!-- Centers quick setup -->
                    <div class="center-picker">
                        <p class="panel__label">SET CENTERS</p>
                        <p class="panel__desc" style="margin-top:-0.25rem">Each face must have a unique center color.
                        </p>
                        <div class="center-grid">
                            <div v-for="f in FACE_META" :key="f.id" class="center-slot">
                                <span class="center-face-lbl">{{ f.id }}</span>
                                <div class="center-swatches">
                                    <button v-for="col in COLORS" :key="col.id" class="center-swatch"
                                        :class="{ active: cube[f.id][4] === col.id, taken: centerTaken(col.id, f.id) }"
                                        :style="{ background: col.hex }" :disabled="centerTaken(col.id, f.id)"
                                        @click="setCenter(f.id, col.id)" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Status overview -->
                    <div class="status-grid">
                        <div v-for="fd in FACE_DEFS" :key="fd.id" class="status-face" @click="openFaceEditor(fd.id)">
                            <div class="status-mini">
                                <div v-for="j in 9" :key="j" class="status-cell"
                                    :class="{ 'status-cell--empty': cube[fd.id][j - 1] === EMPTY }"
                                    :style="{ background: hex(cube[fd.id][j - 1]) }" />
                            </div>
                            <span class="status-label">{{ fd.id }}</span>
                        </div>
                    </div>
                </template>

                <!-- Divider -->
                <div class="divider" />

                <!-- Controls always visible -->
                <div class="controls">
                    <button class="btn ghost sm" @click="resetCube">Reset</button>
                    <button class="btn ghost sm" @click="loadScramble">Random</button>
                    <button class="btn primary" :disabled="solving || animating" @click="solveCube">
                        <span v-if="!solving">Solve ↗</span>
                        <span v-else class="spin" />
                    </button>
                </div>
                <p v-if="solverStatus" class="solver-status">
                    <span class="solver-status-dot" />{{ solverStatus }}
                </p>

                <!-- Scramble input -->
                <div class="scramble-input-wrap">
                    <div class="scramble-row">
                        <input v-model="scrambleInput" class="scramble-input"
                            placeholder="Paste scramble: R U' F2 L B D2 R' U" @keydown.enter="applyScrambleInput" />
                        <button class="btn primary sm" @click="applyScrambleInput">Apply</button>
                    </div>
                    <p v-if="scrambleError" class="scramble-err">{{ scrambleError }}</p>
                </div>

                <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
            </section>

        </main>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'

// ── Constants ──────────────────────────────────────────────────────────────
const COLORS = [
    { id: 'W', hex: '#F5F5F0' },
    { id: 'Y', hex: '#FFD600' },
    { id: 'O', hex: '#FF6D00' },
    { id: 'R', hex: '#E53935' },
    { id: 'G', hex: '#43A047' },
    { id: 'B', hex: '#1E88E5' },
]
const COLOR_MAP = Object.fromEntries([...COLORS.map(c => [c.id, c.hex]), ['_', '#2a2a30']])
const EMPTY = '_'
const FACE_META = [
    { id: 'U', name: 'Up' }, { id: 'D', name: 'Down' }, { id: 'F', name: 'Front' },
    { id: 'B', name: 'Back' }, { id: 'L', name: 'Left' }, { id: 'R', name: 'Right' }
]
const FACE_NAMES = { U: 'Top (Up)', D: 'Bottom (Down)', F: 'Front', B: 'Back', L: 'Left', R: 'Right' }
const ALL_MOVES = ['U', "U'", "U2", 'D', "D'", "D2", 'F', "F'", "F2", 'B', "B'", "B2", 'L', "L'", "L2", 'R', "R'", "R2"]
const INV_MOVE = { 'U': "U'", "U'": "U", "U2": "U2", 'D': "D'", "D'": "D", "D2": "D2", 'F': "F'", "F'": "F", "F2": "F2", 'B': "B'", "B'": "B", "B2": "B2", 'L': "L'", "L'": "L", "L2": "L2", 'R': "R'", "R'": "R", "R2": "R2" }

const hex = id => COLOR_MAP[id] ?? '#333'

// Face display order: B, R, D faces need column reversal due to CSS transform flip
const COL_FLIP = [2, 1, 0, 5, 4, 3, 8, 7, 6]
const STRAIGHT = [0, 1, 2, 3, 4, 5, 6, 7, 8]
const FACE_DEFS = [
    { id: 'F', cls: 'face-front', order: STRAIGHT },
    { id: 'B', cls: 'face-back', order: COL_FLIP },
    { id: 'L', cls: 'face-left', order: STRAIGHT },
    { id: 'R', cls: 'face-right', order: COL_FLIP },
    { id: 'U', cls: 'face-top', order: STRAIGHT },
    { id: 'D', cls: 'face-bottom', order: COL_FLIP },
]

// Neighbor labels for orientation context
const faceNeighbors = {
    U: { top: 'B', bottom: 'F', left: 'L', right: 'R' },
    D: { top: 'F', bottom: 'B', left: 'L', right: 'R' },
    F: { top: 'U', bottom: 'D', left: 'L', right: 'R' },
    B: { top: 'U', bottom: 'D', left: 'R', right: 'L' },
    L: { top: 'U', bottom: 'D', left: 'B', right: 'F' },
    R: { top: 'U', bottom: 'D', left: 'F', right: 'B' },
}

// ── State ──────────────────────────────────────────────────────────────────
const defaultCube = () => ({
    U: Array(9).fill(EMPTY), D: Array(9).fill(EMPTY),
    F: Array(9).fill(EMPTY), B: Array(9).fill(EMPTY),
    L: Array(9).fill(EMPTY), R: Array(9).fill(EMPTY),
})

const cube = reactive(defaultCube())
const preview = reactive(defaultCube())
const activeFace = ref(null)   // which face is open in editor
const selectedColor = ref('W')
const solving = ref(false)
const errorMsg = ref('')
const solution = ref([])
const alreadySolved = ref(false)
const currentStep = ref(0)
const playing = ref(false)
const scrambleInput = ref('')
const scrambleError = ref('')
const solverStatus = ref('')
let playTimer = null
const playSpeed = ref(3)   // 1=slow … 5=fast
const SPEED_MS = [900, 600, 350, 180, 80]  // ms per step at each speed level
const playSpeedLabel = computed(() => ['0.5×', '1×', '2×', '4×', '8×'][playSpeed.value - 1])

// ── Color counts ───────────────────────────────────────────────────────────
const colorCount = computed(() => id => {
    let n = 0
    for (const f of Object.keys(cube)) for (const c of cube[f]) if (c === id) n++
    return n
})
const emptyCount = computed(() => {
    let n = 0
    for (const f of Object.keys(cube)) for (const c of cube[f]) if (c === EMPTY) n++
    return n
})

// ── Face editor display ────────────────────────────────────────────────────
// faceDisplayColors: the 9 colors in VISUAL order for the big editor grid
const faceDisplayColors = computed(() => {
    if (!activeFace.value) return []
    const fd = FACE_DEFS.find(f => f.id === activeFace.value)
    return fd.order.map(i => cube[activeFace.value][i])
})

// paintOnFace: vi = visual index (0-8) in the big editor
function paintOnFace(vi) {
    const fd = FACE_DEFS.find(f => f.id === activeFace.value)
    const dataIdx = fd.order[vi]
    paint(activeFace.value, dataIdx)
}

// ── Color prediction ───────────────────────────────────────────────────────
// For the active face, predict which colors should fill empty stickers.
// Logic: the center of this face tells us the "home" color.
// Any remaining empty sticker on this face should likely be the center color.
const predictions = computed(() => {
    if (!activeFace.value) return []
    const face = activeFace.value
    const centerColor = cube[face][4]
    if (centerColor === EMPTY) return []

    // How many empty stickers are on this face?
    const emptyOnFace = cube[face].filter(c => c === EMPTY).length
    if (emptyOnFace === 0) return []

    // How many more of the center color can we place? (limit 9 total)
    const alreadyPlaced = colorCount.value(centerColor)
    const canPlace = 9 - alreadyPlaced
    if (canPlace <= 0) return []

    return [{
        colorId: centerColor,
        remaining: Math.min(emptyOnFace, canPlace),
    }]
})

// predicted stickers: empty stickers on the active face where center color fits
const predictedIndices = computed(() => {
    if (!activeFace.value) return new Set()
    const face = activeFace.value
    const centerColor = cube[face][4]
    if (centerColor === EMPTY) return new Set()
    const canPlace = 9 - colorCount.value(centerColor)
    if (canPlace <= 0) return new Set()
    const result = new Set()
    cube[face].forEach((c, i) => { if (c === EMPTY && result.size < canPlace) result.add(i) })
    return result
})

function isPredicted(faceId, dataIdx) {
    if (faceId !== activeFace.value) return false
    return predictedIndices.value.has(dataIdx)
}

function applyPrediction(colorId) {
    const face = activeFace.value
    let canPlace = 9 - colorCount.value(colorId)
    cube[face].forEach((c, i) => {
        if (c === EMPTY && canPlace > 0) {
            cube[face][i] = colorId
            canPlace--
        }
    })
    syncPreviewToCube()
    solution.value = []
    alreadySolved.value = false
    currentStep.value = 0
    errorMsg.value = ''
}

function fillFace() {
    const face = activeFace.value
    const col = selectedColor.value
    if (col === EMPTY) return
    let canPlace = 9 - colorCount.value(col)
    cube[face].forEach((c, i) => {
        if (c === EMPTY && canPlace > 0) {
            cube[face][i] = col
            canPlace--
        }
    })
    syncPreviewToCube()
    solution.value = []
    alreadySolved.value = false
    currentStep.value = 0
    errorMsg.value = ''
}

// ── Face editor navigation ─────────────────────────────────────────────────
function openFaceEditor(faceId) {
    if (currentStep.value > 0) return   // don't edit mid-solution
    activeFace.value = faceId
    // Auto-select the center color of this face as active color
    const center = cube[faceId][4]
    if (center !== EMPTY) selectedColor.value = center
}

// ── Paint ──────────────────────────────────────────────────────────────────
function paint(faceId, dataIdx) {
    const current = cube[faceId][dataIdx]
    const next = selectedColor.value
    if (current === next) {
        cube[faceId][dataIdx] = EMPTY
    } else {
        if (next !== EMPTY && colorCount.value(next) >= 9) return
        cube[faceId][dataIdx] = next
    }
    syncPreviewToCube()
    solution.value = []
    alreadySolved.value = false
    currentStep.value = 0
    errorMsg.value = ''
}

// ── Centers ────────────────────────────────────────────────────────────────
function centerTaken(colorId, excludeFace) {
    return FACE_META.some(f => f.id !== excludeFace && cube[f.id][4] === colorId)
}
function setCenter(faceId, colorId) {
    cube[faceId][4] = colorId
    syncPreviewToCube()
    solution.value = []
    alreadySolved.value = false
    currentStep.value = 0
    errorMsg.value = ''
}

// ── Reset ──────────────────────────────────────────────────────────────────
function resetCube() {
    const d = defaultCube()
    for (const f of Object.keys(d)) cube[f] = [...d[f]]
    syncPreviewToCube()
    solution.value = []; alreadySolved.value = false
    errorMsg.value = ''; currentStep.value = 0
    activeFace.value = null
    stopPlay()
}

// ── Preview ────────────────────────────────────────────────────────────────
function syncPreviewToCube() {
    for (const f of Object.keys(cube)) preview[f] = [...cube[f]]
}
function rebuildPreview() {
    let s = deepCopy(cube)
    for (let i = 0; i < currentStep.value; i++) s = applyMove(s, solution.value[i])
    for (const f of Object.keys(s)) preview[f] = s[f]
}
watch(currentStep, rebuildPreview)

// ── 3D rotation ────────────────────────────────────────────────────────────
const rotX = ref(-28)
const rotY = ref(38)
const ANIM_MS = 220
const flashing = ref(false)

const MOVE_NUDGE = {
    'U': { rx: -20, ry: 0 }, "U'": { rx: 20, ry: 0 }, 'U2': { rx: -28, ry: 0 },
    'D': { rx: 20, ry: 0 }, "D'": { rx: -20, ry: 0 }, 'D2': { rx: 28, ry: 0 },
    'F': { rx: 0, ry: -20 }, "F'": { rx: 0, ry: 20 }, 'F2': { rx: 0, ry: -28 },
    'B': { rx: 0, ry: 20 }, "B'": { rx: 0, ry: -20 }, 'B2': { rx: 0, ry: 28 },
    'L': { rx: 0, ry: 20 }, "L'": { rx: 0, ry: -20 }, 'L2': { rx: 0, ry: 28 },
    'R': { rx: 0, ry: -20 }, "R'": { rx: 0, ry: 20 }, 'R2': { rx: 0, ry: -28 },
}

const animating = ref(false)
const cubeStyle = computed(() => ({
    transform: `rotateX(${rotX.value}deg) rotateY(${rotY.value}deg)`,
    transition: animating.value ? `transform ${ANIM_MS}ms cubic-bezier(0.34,1.56,0.64,1)` : 'none',
}))

let drag = null
let dragMoved = false

function startDrag(e) {
    dragMoved = false
    drag = { x: e.clientX, y: e.clientY, rx: rotX.value, ry: rotY.value, faceEl: e.target.closest('.face') }
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDragFn)
}
function startDragTouch(e) {
    dragMoved = false
    const t = e.touches[0]
    drag = { x: t.clientX, y: t.clientY, rx: rotX.value, ry: rotY.value }
    window.addEventListener('touchmove', onDragTouch, { passive: false })
    window.addEventListener('touchend', stopDragFn)
}
function onDrag(e) {
    if (!drag) return
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y
    if (Math.abs(dx) + Math.abs(dy) > 5) dragMoved = true
    if (!dragMoved) return
    rotX.value = drag.rx - dy * 0.5
    rotY.value = drag.ry + dx * 0.5
}
function onDragTouch(e) {
    e.preventDefault()
    dragMoved = true
    const t = e.touches[0]
    rotX.value = drag.rx - (t.clientY - drag.y) * 0.5
    rotY.value = drag.ry + (t.clientX - drag.x) * 0.5
}
function stopDragFn() {
    // If mouse didn't move, treat as a click on the face
    if (!dragMoved && drag?.faceEl) {
        const faceId = drag.faceEl.dataset.face
        if (faceId) openFaceEditor(faceId)
    }
    drag = null
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDragFn)
    window.removeEventListener('touchmove', onDragTouch)
    window.removeEventListener('touchend', stopDragFn)
}

// ── Cube logic (object model — used for UI/preview/scramble) ─────────────
function deepCopy(s) { const c = {}; for (const f of Object.keys(s)) c[f] = [...s[f]]; return c }
function rotateFaceCW(s, face) { const [a, b, c, d, e, f, g, h, i] = s[face]; s[face] = [g, d, a, h, e, b, i, f, c] }
function cyc4(s, q0, q1, q2, q3) {
    const v0 = q0.map(([f, i]) => s[f][i]), v1 = q1.map(([f, i]) => s[f][i]), v2 = q2.map(([f, i]) => s[f][i]), v3 = q3.map(([f, i]) => s[f][i])
    q1.forEach(([f, i], j) => { s[f][i] = v0[j] }); q2.forEach(([f, i], j) => { s[f][i] = v1[j] }); q3.forEach(([f, i], j) => { s[f][i] = v2[j] }); q0.forEach(([f, i], j) => { s[f][i] = v3[j] })
}
function applyPrimitive(s, m) {
    if (m === 'U') { rotateFaceCW(s, 'U'); cyc4(s, [['F', 0], ['F', 1], ['F', 2]], [['R', 0], ['R', 1], ['R', 2]], [['B', 0], ['B', 1], ['B', 2]], [['L', 0], ['L', 1], ['L', 2]]) }
    if (m === 'D') { rotateFaceCW(s, 'D'); cyc4(s, [['B', 6], ['B', 7], ['B', 8]], [['R', 6], ['R', 7], ['R', 8]], [['F', 6], ['F', 7], ['F', 8]], [['L', 6], ['L', 7], ['L', 8]]) }
    if (m === 'F') { rotateFaceCW(s, 'F'); cyc4(s, [['U', 6], ['U', 7], ['U', 8]], [['R', 0], ['R', 3], ['R', 6]], [['D', 2], ['D', 1], ['D', 0]], [['L', 8], ['L', 5], ['L', 2]]) }
    if (m === 'B') { rotateFaceCW(s, 'B'); cyc4(s, [['U', 2], ['U', 1], ['U', 0]], [['L', 0], ['L', 3], ['L', 6]], [['D', 6], ['D', 7], ['D', 8]], [['R', 8], ['R', 5], ['R', 2]]) }
    if (m === 'L') { rotateFaceCW(s, 'L'); cyc4(s, [['U', 0], ['U', 3], ['U', 6]], [['F', 0], ['F', 3], ['F', 6]], [['D', 0], ['D', 3], ['D', 6]], [['B', 8], ['B', 5], ['B', 2]]) }
    if (m === 'R') { rotateFaceCW(s, 'R'); cyc4(s, [['U', 8], ['U', 5], ['U', 2]], [['B', 0], ['B', 3], ['B', 6]], [['D', 8], ['D', 5], ['D', 2]], [['F', 8], ['F', 5], ['F', 2]]) }
}
function applyMove(state, move) {
    const s = deepCopy(state), base = move.replace(/['2]/g, ''), times = move.endsWith('2') ? 2 : move.endsWith("'") ? 3 : 1
    for (let t = 0; t < times; t++)applyPrimitive(s, base); return s
}
function isSolved(s) {
    return Object.keys(s).every(f => s[f][4] !== EMPTY && s[f].every(v => v === s[f][4]))
}

// ── Scramble ───────────────────────────────────────────────────────────────
function loadScramble() {
    stopPlay(); errorMsg.value = ''; solution.value = []; alreadySolved.value = false
    currentStep.value = 0; activeFace.value = null
    const hasCenters = Object.keys(cube).every(f => cube[f][4] !== EMPTY)
    let state = hasCenters
        ? Object.fromEntries(Object.keys(cube).map(f => [f, Array(9).fill(cube[f][4])]))
        : { U: Array(9).fill('W'), D: Array(9).fill('Y'), F: Array(9).fill('G'), B: Array(9).fill('B'), L: Array(9).fill('O'), R: Array(9).fill('R') }
    for (let i = 0; i < 20; i++) state = applyMove(state, ALL_MOVES[Math.floor(Math.random() * ALL_MOVES.length)])
    for (const f of Object.keys(state)) cube[f] = state[f]
    syncPreviewToCube()
}

function applyScrambleInput() {
    scrambleError.value = ''
    const raw = scrambleInput.value.trim(); if (!raw) return
    const tokens = raw.toUpperCase().replace(/[′ʹ]/g, "'").split(/\s+/).filter(Boolean)
    const valid = new Set(ALL_MOVES.map(m => m.toUpperCase()))
    const bad = tokens.filter(t => !valid.has(t))
    if (bad.length) { scrambleError.value = `Unknown: ${bad.join(', ')}`; return }
    stopPlay(); errorMsg.value = ''; solution.value = []; alreadySolved.value = false
    currentStep.value = 0; activeFace.value = null
    const hasCenters = Object.keys(cube).every(f => cube[f][4] !== EMPTY)
    let state = hasCenters
        ? Object.fromEntries(Object.keys(cube).map(f => [f, Array(9).fill(cube[f][4])]))
        : { U: Array(9).fill('W'), D: Array(9).fill('Y'), F: Array(9).fill('G'), B: Array(9).fill('B'), L: Array(9).fill('O'), R: Array(9).fill('R') }
    for (const mv of tokens) state = applyMove(state, mv)
    for (const f of Object.keys(state)) cube[f] = state[f]
    syncPreviewToCube()
}

// ── Fast solver via Web Worker (cubejs Kociemba two-phase) ──────────────
// Place cube-solver.worker.js in your /public folder.
// Kociemba solves any valid cube in ≤22 moves, 0.01–0.4s after ~2s init.
let solverWorker = null
let workerInitialized = false

function getWorker() {
    if (solverWorker) return solverWorker
    // /public files are served at root in Nuxt 3
    solverWorker = new Worker('/cube-solver.worker.js')
    // Set up persistent handlers once — never reassign
    solverWorker.onmessage = async (e) => {
        workerInitialized = true
        solving.value = false
        solverStatus.value = ''
        const sol = e.data.solution
        if (sol && sol.trim()) {
            solution.value = sol.trim().split(/\s+/).filter(Boolean)
            currentStep.value = 0
            syncPreviewToCube()
            await nextTick()
            autoPlay()
        } else {
            errorMsg.value = 'Could not solve — invalid cube state.'
        }
    }
    solverWorker.onerror = (err) => {
        solving.value = false
        solverStatus.value = ''
        errorMsg.value = 'Worker error: ' + (err.message || 'unknown')
    }
    return solverWorker
}

async function solveCube() {
    errorMsg.value = ''; solution.value = []; alreadySolved.value = false
    currentStep.value = 0; stopPlay(); solving.value = true; activeFace.value = null

    // Validate all 54 stickers painted
    const hasEmpty = Object.values(cube).some(f => f.includes(EMPTY))
    if (hasEmpty) {
        errorMsg.value = 'Incomplete: all 54 stickers must be painted.'
        solving.value = false; return
    }
    // Validate 6 unique centers
    const centers = Object.keys(cube).map(f => cube[f][4])
    if (new Set(centers).size !== 6) {
        errorMsg.value = 'Each face needs a unique center color.'
        solving.value = false; return
    }
    // Validate 9 of each color
    const counts = {}
    for (const f of Object.keys(cube)) cube[f].forEach(c => { counts[c] = (counts[c] || 0) + 1 })
    if (Object.values(counts).some(v => v !== 9)) {
        errorMsg.value = `Each color needs exactly 9 stickers. Got: ${Object.entries(counts).map(([c, n]) => c + ':' + n).join(', ')}`
        solving.value = false; return
    }
    // Already solved?
    if (isSolved(cube)) {
        alreadySolved.value = true; solving.value = false; syncPreviewToCube(); return
    }

    solverStatus.value = workerInitialized ? 'Solving…' : 'Initializing Kociemba solver (one-time ~2s)…'
    getWorker().postMessage({ state: deepCopy(cube) })
}

// ── Animation ──────────────────────────────────────────────────────────────
function animateMove(stateBefore, move) {
    return new Promise(resolve => {
        const newState = applyMove(stateBefore, move)
        flashing.value = true
        const nudge = MOVE_NUDGE[move] || { rx: 0, ry: 0 }
        const origX = rotX.value, origY = rotY.value
        animating.value = true
        rotX.value += nudge.rx; rotY.value += nudge.ry
        setTimeout(() => { for (const f of Object.keys(newState)) preview[f] = newState[f] }, ANIM_MS * 0.4)
        setTimeout(() => { rotX.value = origX; rotY.value = origY; flashing.value = false; animating.value = false; resolve(newState) }, ANIM_MS)
    })
}

// ── Step controls ──────────────────────────────────────────────────────────
async function stepFwd() {
    if (animating.value || currentStep.value >= solution.value.length) return
    const sb = deepCopy(preview), mv = solution.value[currentStep.value]
    currentStep.value++
    await animateMove(sb, mv)
}
async function stepBack() {
    if (animating.value || currentStep.value <= 0) return
    currentStep.value--; rebuildPreview()
}
async function jumpTo(step) {
    if (animating.value) return
    currentStep.value = Math.max(0, Math.min(step, solution.value.length)); rebuildPreview()
}
function autoPlay() {
    if (playing.value || animating.value) return
    playing.value = true
    if (currentStep.value >= solution.value.length) currentStep.value = 0
    rebuildPreview()
    const runNext = async () => {
        if (!playing.value || currentStep.value >= solution.value.length) { stopPlay(); return }
        await stepFwd()
        if (playing.value) playTimer = setTimeout(runNext, SPEED_MS[playSpeed.value - 1])
    }
    playTimer = setTimeout(runNext, 100)
}
function stopPlay() { playing.value = false; clearTimeout(playTimer); playTimer = null }

onBeforeUnmount(() => { stopDragFn(); stopPlay() })
</script>

<style>
html,
body {
    margin: 0;
    padding: 0;
    background: #0d0d0f;
}
</style>

<style scoped>
.solver {
    --bg: #0d0d0f;
    --surface: #16161a;
    --surface2: #1e1e24;
    --border: rgba(255, 255, 255, 0.07);
    --text: #e8e8ec;
    --dim: #555;
    --accent: #7c6fff;
    --cs: 160px;
    --half: 80px;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
}

/* Header */
.header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 1rem 1rem;
    border-bottom: 1px solid var(--border);
    gap: 0.2rem;
}

.header__logo {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.logo-sq {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    background: linear-gradient(135deg, #7c6fff, #ff7eb3);
    display: inline-block;
}

h1 {
    font-family: 'DM Mono', 'Fira Code', monospace;
    font-size: 1.8rem;
    letter-spacing: 0.35em;
    font-weight: 700;
    background: linear-gradient(135deg, #fff 40%, #7c6fff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
}

.header__sub {
    font-size: 0.65rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--dim);
}

/* Layout */
.main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.2rem;
    padding: 1.2rem;
    flex: 1;
    align-items: start;
}

@media(max-width:860px) {
    .main {
        grid-template-columns: 1fr;
    }
}

/* Panels */
.panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
}

.panel__label {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.25em;
    color: var(--dim);
    margin: 0;
}

.panel__desc {
    font-size: 0.8rem;
    color: var(--dim);
    margin: -0.4rem 0 0;
}

.hint-text {
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    color: var(--accent);
    text-transform: none;
    font-family: 'Inter', sans-serif;
}

.preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.step-badge {
    font-family: 'DM Mono', monospace;
    font-size: 0.62rem;
    color: var(--accent);
    background: rgba(124, 111, 255, 0.1);
    border: 1px solid rgba(124, 111, 255, 0.2);
    border-radius: 6px;
    padding: 0.18rem 0.45rem;
}

/* 3D Scene */
.scene {
    width: 100%;
    height: 270px;
    display: flex;
    align-items: center;
    justify-content: center;
    perspective: 700px;
    cursor: grab;
    user-select: none;
    background: radial-gradient(ellipse at center, #1a1a22 0%, #0d0d0f 70%);
    border-radius: 12px;
    border: 1px solid var(--border);
}

.scene:active {
    cursor: grabbing;
}

.cube3d {
    width: var(--cs);
    height: var(--cs);
    position: relative;
    transform-style: preserve-3d;
}

.cube3d--flash .mc {
    transition: background 0.18s ease;
}

.face {
    position: absolute;
    width: var(--cs);
    height: var(--cs);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    background: #111;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.face:hover {
    border-color: rgba(124, 111, 255, 0.6);
    box-shadow: 0 0 20px rgba(124, 111, 255, 0.25);
}

.face--active {
    border-color: var(--accent) !important;
    box-shadow: 0 0 24px rgba(124, 111, 255, 0.4) !important;
}

.face-front {
    transform: translateZ(var(--half));
}

.face-back {
    transform: rotateY(180deg) translateZ(var(--half));
}

.face-left {
    transform: rotateY(-90deg) translateZ(var(--half));
}

.face-right {
    transform: rotateY(90deg) translateZ(var(--half));
}

.face-top {
    transform: rotateX(90deg) translateZ(var(--half));
}

.face-bottom {
    transform: rotateX(-90deg) translateZ(var(--half));
}

.face-id-badge {
    position: absolute;
    bottom: 3px;
    right: 5px;
    font-family: 'DM Mono', monospace;
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.3);
    pointer-events: none;
}

.face--active .face-id-badge {
    color: rgba(124, 111, 255, 0.8);
}

.mini-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 8px;
    width: 100%;
    height: 100%;
}

.mc {
    border-radius: 3px;
    transition: background 0.15s;
}

.mc--empty {
    border: 1px dashed rgba(255, 255, 255, 0.1);
    background: #1a1a20 !important;
}

.drag-hint {
    text-align: center;
    font-size: 0.62rem;
    letter-spacing: 0.15em;
    color: var(--dim);
    margin-top: -0.3rem;
}

/* Solution */
.solved-msg {
    font-family: 'DM Mono', monospace;
    font-size: 0.85rem;
    color: #5dba72;
}

.move-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
}

.move-chip {
    padding: 0.25rem 0.5rem;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-family: 'DM Mono', monospace;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.12s;
}

.move-chip:hover {
    background: rgba(124, 111, 255, 0.12);
    border-color: var(--accent);
}

.move-chip.done {
    background: rgba(124, 111, 255, 0.15);
    border-color: rgba(124, 111, 255, 0.4);
    color: #b3a9ff;
}

.move-chip.current {
    background: rgba(124, 111, 255, 0.35);
    border-color: var(--accent);
    color: #fff;
    box-shadow: 0 0 8px rgba(124, 111, 255, 0.4);
    transform: translateY(-1px) scale(1.05);
}

.step-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
}

/* Empty */
.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    gap: 0.6rem;
    color: var(--dim);
    text-align: center;
}

.empty-hex {
    font-size: 2.5rem;
    opacity: 0.12;
}

.empty p {
    font-size: 0.8rem;
}

/* ── Editor panel ── */
.face-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.face-nav {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
}

.face-nav-btn {
    padding: 0.3rem 0.55rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--dim);
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s;
}

.face-nav-btn:hover {
    color: var(--text);
}

.face-nav-btn.active {
    background: rgba(124, 111, 255, 0.2);
    border-color: var(--accent);
    color: #fff;
}

.face-editor-body {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
}

.big-face-wrap {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    position: relative;
}

.face-editor-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    color: var(--dim);
}

.big-face {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 8px;
    background: #111;
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 162px;
    height: 162px;
}

.big-sticker {
    border-radius: 6px;
    cursor: pointer;
    transition: filter 0.1s, transform 0.1s, box-shadow 0.1s;
    position: relative;
}

.big-sticker--empty {
    border: 2px dashed rgba(255, 255, 255, 0.13);
    background: #1a1a20 !important;
}

.big-sticker--predicted {
    border: 2px dashed rgba(124, 111, 255, 0.5) !important;
}

.big-sticker:hover {
    filter: brightness(1.35);
    transform: scale(1.08);
    box-shadow: 0 0 10px rgba(124, 111, 255, 0.4);
}

.predicted-dot {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 0.5rem;
    color: rgba(124, 111, 255, 0.7);
    pointer-events: none;
}

/* Neighbor labels */
.neighbor-labels {
    position: absolute;
    inset: -18px;
    pointer-events: none;
}

.nb {
    position: absolute;
    font-family: 'DM Mono', monospace;
    font-size: 0.55rem;
    color: var(--dim);
    letter-spacing: 0.1em;
}

.nb--top {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
}

.nb--bottom {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
}

.nb--left {
    left: 0;
    top: 50%;
    transform: translateY(-50%);
}

.nb--right {
    right: 0;
    top: 50%;
    transform: translateY(-50%);
}

.editor-palette {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
}

/* Palette */
.palette {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.pal-btn {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    border: 2px solid transparent;
    cursor: pointer;
    position: relative;
    transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
}

.pal-btn:hover {
    transform: scale(1.1);
}

.pal-btn.active {
    border-color: #fff;
    box-shadow: 0 0 0 3px rgba(124, 111, 255, 0.45);
}

.pal-btn.maxed {
    opacity: 0.35;
    cursor: not-allowed;
}

.pal-btn.maxed.active {
    opacity: 1;
}

.pal-check {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 1rem;
    font-weight: 900;
    color: rgba(0, 0, 0, 0.65);
}

.pal-count {
    position: absolute;
    bottom: 1px;
    right: 3px;
    font-size: 0.45rem;
    font-family: 'DM Mono', monospace;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.5);
    line-height: 1;
    pointer-events: none;
}

.pal-count--full {
    color: rgba(0, 0, 0, 0.8);
}

.eraser-btn {
    background: #2a2a30 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
}

.eraser-btn.active {
    border-color: #fff !important;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15) !important;
}

.eraser-icon {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.45);
}

/* Prediction */
.predict-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.predict-chips {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.predict-chip {
    width: 40px;
    height: 24px;
    border-radius: 6px;
    border: 2px solid rgba(124, 111, 255, 0.4);
    cursor: pointer;
    position: relative;
    transition: transform 0.1s, box-shadow 0.1s;
}

.predict-chip:hover {
    transform: scale(1.05);
    box-shadow: 0 0 8px rgba(124, 111, 255, 0.5);
}

.predict-chip-label {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 0.45rem;
    font-family: 'DM Mono', monospace;
    color: rgba(0, 0, 0, 0.7);
    font-weight: 700;
}

.predict-hint {
    font-size: 0.68rem;
    color: var(--dim);
}

.fill-btn {
    align-self: flex-start;
}

/* Status overview (no face selected) */
.status-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
}

.status-face {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    transition: border-color 0.12s, background 0.12s;
}

.status-face:hover {
    border-color: var(--accent);
    background: rgba(124, 111, 255, 0.05);
}

.status-mini {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    width: 48px;
    height: 48px;
}

.status-cell {
    border-radius: 2px;
}

.status-cell--empty {
    background: #1a1a20;
    border: 1px dashed rgba(255, 255, 255, 0.1);
}

.status-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem;
    color: var(--dim);
}

/* Centers */
.center-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.65rem;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
}

.center-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
}

.center-slot {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.center-face-lbl {
    font-family: 'DM Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.15em;
    color: var(--dim);
}

.center-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
}

.center-swatch {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.1s;
    padding: 0;
}

.center-swatch:hover:not(:disabled) {
    transform: scale(1.2);
}

.center-swatch.active {
    border-color: #fff;
    box-shadow: 0 0 0 2px rgba(124, 111, 255, 0.5);
}

.center-swatch.taken {
    opacity: 0.18;
    cursor: not-allowed;
}

/* Divider */
.divider {
    height: 1px;
    background: var(--border);
    margin: 0 -0.25rem;
}

/* Buttons */
.controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.btn {
    padding: 0.5rem 1.1rem;
    border-radius: 10px;
    font-size: 0.8rem;
    font-family: 'DM Mono', monospace;
    cursor: pointer;
    border: none;
    font-weight: 600;
    letter-spacing: 0.04em;
    transition: transform 0.12s, opacity 0.12s;
}

.btn.sm {
    padding: 0.35rem 0.7rem;
    font-size: 0.72rem;
}

.btn:hover:not(:disabled) {
    transform: translateY(-1px);
}

.btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.btn.ghost {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
}

.btn.ghost:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.07);
}

.btn.primary {
    background: linear-gradient(135deg, #7c6fff, #a06fff);
    color: #fff;
    box-shadow: 0 4px 16px rgba(124, 111, 255, 0.3);
}

.spin {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Scramble input */
.scramble-input-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.scramble-row {
    display: flex;
    gap: 0.4rem;
}

.scramble-input {
    flex: 1;
    background: #111;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: 'DM Mono', monospace;
    font-size: 0.75rem;
    padding: 0.4rem 0.65rem;
    outline: none;
    transition: border-color 0.15s;
    min-width: 0;
}

.scramble-input:focus {
    border-color: var(--accent);
}

.scramble-input::placeholder {
    color: var(--dim);
}

.scramble-err {
    font-size: 0.7rem;
    color: #ff9a6c;
}

.err {
    font-size: 0.74rem;
    color: #ff7070;
    background: rgba(255, 80, 80, 0.08);
    border: 1px solid rgba(255, 80, 80, 0.2);
    border-radius: 8px;
    padding: 0.45rem 0.7rem;
    line-height: 1.5;
}

/* Solver status */
.solver-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    color: var(--dim);
    font-family: 'DM Mono', monospace;
}

.solver-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.4;
        transform: scale(0.8);
    }
}

/* Speed control */
.speed-wrap {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
}

.speed-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: var(--dim);
    min-width: 26px;
    text-align: right;
}

.speed-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 60px;
    height: 3px;
    border-radius: 2px;
    background: var(--border);
    outline: none;
    cursor: pointer;
}

.speed-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    transition: transform 0.1s;
}

.speed-slider::-webkit-slider-thumb:hover {
    transform: scale(1.3);
}

.speed-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: none;
}
</style>