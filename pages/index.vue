<template>
    <div class="app" :class="{ dark: isDark }">
        <!-- Ambient Background -->
        <div class="ambient" aria-hidden="true">
            <div class="orb orb-1"
                :class="{ fetching: loading, 'orb-up': orbColor === 'up', 'orb-down': orbColor === 'down' }" />
            <div class="orb orb-2"
                :class="{ fetching: loading, 'orb-up': orbColor === 'up', 'orb-down': orbColor === 'down' }" />
        </div>

        <!-- Header -->
        <header class="header">
            <div class="header-inner">
                <div class="logo">
                    <span class="logo-gem" :class="{ spinning: gemSpinning }">◈</span>
                    <div class="logo-text">
                        <span class="logo-title">{{ t.title }}</span>
                        <span class="logo-sub">gold portfolio tracker</span>
                    </div>
                </div>
                <div class="header-controls">
                    <button class="ctrl-btn" @click="activateScreensaver" aria-label="Screensaver">
                        <span>⬛</span>
                    </button>
                    <button class="ctrl-btn" @click="toggleDark" :aria-label="isDark ? 'Light mode' : 'Dark mode'">
                        <span>{{ isDark ? '☀' : '◑' }}</span>
                    </button>
                    <button class="ctrl-btn lang-btn" @click="toggleLang"
                        :aria-label="lang === 'en' ? 'Switch to Khmer' : 'Switch to English'">
                        {{ lang === 'en' ? 'ខ្មែរ' : 'EN' }}
                    </button>
                </div>
            </div>
            <div v-if="!isOnline" class="offline-bar" role="alert">
                ⚠ {{ t.offlineWarning }}
            </div>
        </header>

        <!-- Sticky Price Pill -->
        <div class="sticky-price" :class="{ visible: showStickyPrice && goldPrice }">
            <span class="sticky-gem" :class="{ spinning: gemSpinning }">◈</span>
            <span class="sticky-val">${{ goldPrice?.toFixed(2) ?? '——' }}</span>
            <span class="sticky-unit">/ oz</span>
            <button class="sticky-refresh" @click="fetchPrice" :disabled="loading">↻</button>
        </div>

        <!-- ── SCREENSAVER ── -->
        <transition name="ss-fade">
            <div v-if="screensaver" class="screensaver" @click="dismissScreensaver" @touchstart="dismissScreensaver">
                <div class="ss-orb ss-orb1" />
                <div class="ss-orb ss-orb2" />
                <div class="ss-orb ss-orb3" />
                <div class="ss-content">
                    <div class="ss-gem">◈</div>
                    <div class="ss-time">{{ ssTime }}</div>
                    <div class="ss-price" v-if="goldPrice">
                        <span class="ss-price-val">${{ goldPrice.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                            }) }}</span>
                        <span class="ss-price-unit">XAU / USD</span>
                    </div>
                    <div class="ss-date">{{ ssDate }}</div>
                    <div class="ss-tap">TAP TO DISMISS</div>
                </div>
            </div>
        </transition>

        <!-- ── CONFETTI CANVAS ── -->
        <canvas ref="confettiCanvas" class="confetti-canvas" aria-hidden="true" />

        <main class="main">

            <!-- ── PRICE SECTION ── -->
            <section class="card price-hero">
                <!-- Accent line trace -->
                <div class="card-accent">
                    <div class="accent-fill" :class="{ trace: accentTrace }" />
                </div>

                <!-- Source Toggle -->
                <div class="seg-ctrl">
                    <button class="seg-btn" :class="{ active: priceSource === 'api' }" @click="priceSource = 'api'">
                        ⬡ {{ t.live }}
                    </button>
                    <button class="seg-btn" :class="{ active: priceSource === 'custom' }"
                        @click="priceSource = 'custom'">
                        ✦ {{ t.custom }}
                    </button>
                </div>

                <!-- Big Price -->
                <div class="hero-price-block">
                    <div class="hero-meta-row">
                        <span class="metal-tag">🥇 {{ t.gold }}</span>
                        <span v-if="lastUpdated && priceSource === 'api'" class="last-updated-wrap"><span v-if="isLive"
                                class="live-dot" /><span v-if="isLive" class="live-badge">LIVE</span><span
                                class="last-updated">{{ lastUpdated }}</span></span>
                    </div>
                </div>
                <!-- Digit Roll Ticker -->
                <div class="hero-price ticker-row">
                    <span class="price-dollar">$</span>
                    <div class="digit-ticker" v-if="goldPrice"
                        :class="{ 'flash-up': priceFlash === 'up', 'flash-down': priceFlash === 'down' }">
                        <div v-for="(col, i) in tickerCols" :key="i" class="digit-col"
                            :class="{ separator: col.isSep, rolling: col.rolling }">
                            <div class="digit-reel" :style="col.reelStyle">
                                <span v-for="(ch, j) in col.chars" :key="j">{{ ch }}</span>
                            </div>
                        </div>
                    </div>
                    <div v-else class="price-empty">——</div>
                </div>
                <div class="price-bottom-row">
                    <span class="price-unit-label">{{ t.perTroyOz }}</span>
                    <transition name="pill-pop">
                        <span v-if="changePill.show" class="change-pill" :class="changePill.dir">
                            {{ changePill.dir === 'up' ? '▲' : '▼' }} {{ changePill.text }}
                        </span>
                    </transition>
                </div>

                <!-- Shimmer skeleton chips while loading, real chips after -->
                <div v-if="loading" class="chips-scroll">
                    <div v-for="n in 6" :key="n" class="chip shimmer-chip">
                        <div class="shimmer-line short" />
                        <div class="shimmer-line long" />
                    </div>
                </div>
                <div v-else-if="goldPrice" class="chips-scroll">
                    <div v-for="u in priceUnits" :key="u.key" class="chip">
                        <span class="chip-label">{{ t[u.key] || u.label }}</span>
                        <span class="chip-price">${{ u.price < 1 ? u.price.toFixed(4) : u.price.toFixed(2) }}</span>
                    </div>
                </div>

                <!-- Loading progress -->
                <div v-if="loading" class="progress-bar">
                    <div class="progress-fill" />
                </div>

                <!-- Flash -->
                <transition name="fade">
                    <div v-if="flashMsg" class="flash" :class="flashType" role="alert">{{ flashMsg }}</div>
                </transition>

                <!-- API Panel -->
                <div v-if="priceSource === 'api'" class="sub-panel">
                    <div class="sub-panel-row">
                        <div class="api-info">
                            <span class="api-badge">gold-api.com</span>
                            <span class="api-hint-text">{{ t.apiHint }}</span>
                        </div>
                        <button class="primary-btn refresh-btn" @click="fetchPrice($event)" :disabled="loading">
                            <span :class="{ 'spin': loading }">↻</span>
                            {{ loading ? t.loading : t.refresh }}
                        </button>
                    </div>
                    <div class="api-key-row">
                        <input v-model="customApiUrl" class="text-input" type="text" :placeholder="t.apiKeyPlaceholder"
                            autocomplete="off" autocorrect="off" spellcheck="false" />
                        <button class="icon-btn-sm" @click="pasteClipboard" :title="t.paste">📋</button>
                        <button v-if="customApiUrl" class="icon-btn-sm danger" @click="customApiUrl = ''; save()"
                            :title="t.clear">✕</button>
                    </div>
                    <p class="api-hint">
                        {{ t.freeNoKey }} ·
                        <a href="https://www.goldapi.io/" target="_blank" rel="noopener">goldapi.io</a>
                        {{ t.asBackup }}
                    </p>
                </div>

                <!-- Custom Panel -->
                <div v-if="priceSource === 'custom'" class="sub-panel">
                    <div class="method-tabs">
                        <button v-for="m in ['troyOz', 'damlung', 'chi']" :key="m" class="method-btn"
                            :class="{ active: priceMethod === m }" @click="switchMethod(m)">
                            {{ m === 'troyOz' ? t.troyOz : t[m] }}
                        </button>
                    </div>
                    <div class="price-input-row">
                        <span class="input-prefix">$</span>
                        <input v-model.number="customPrice" class="text-input price-input" type="text"
                            inputmode="decimal"
                            :placeholder="t.enterPriceFor + ' ' + (priceMethod === 'troyOz' ? t.troyOz : priceMethod === 'damlung' ? t.damlung : t.chi)"
                            @input="applyCustomPrice" />
                    </div>
                </div>
            </section>

            <!-- ── CONVERTER ── -->
            <section class="card">
                <h2 class="section-title">{{ t.unitConverter }}</h2>
                <div class="conv-tabs-scroll">
                    <button v-for="u in converterUnits" :key="u" class="conv-tab" :class="{ active: activeConv === u }"
                        @click="activeConv = u">
                        {{ t[u] || u }}
                    </button>
                </div>
                <div class="conv-input-row">
                    <div class="from-badge">{{ t[activeConv] }}</div>
                    <input v-model.number="convInput" class="text-input conv-input" type="text" inputmode="decimal"
                        :placeholder="'1'" />
                </div>
                <div class="conv-results">
                    <div v-for="u in converterUnits.filter(x => x !== activeConv)" :key="u" class="conv-row">
                        <span class="conv-label">{{ t[u] }}</span>
                        <span class="conv-val">{{ convertUnit(convInput || 0, activeConv, u) }}</span>
                    </div>
                </div>
            </section>

            <!-- ── PRICE GRID ── -->
            <section class="card">
                <h2 class="section-title">{{ t.priceByUnit }}</h2>
                <div v-if="goldPrice" class="unit-grid">
                    <div v-for="u in allUnits" :key="u.key" class="unit-tile">
                        <div class="tile-top">
                            <span class="tile-name">{{ t[u.key] || u.label }}</span>
                            <span class="tile-gram">{{ u.gram }}</span>
                        </div>
                        <span class="tile-price">${{ u.price < 1 ? u.price.toFixed(4) : u.price.toFixed(2) }}</span>
                    </div>
                </div>
                <div v-else class="empty-state">
                    <span class="empty-icon">◈</span>
                    <p>{{ t.fetchPriceFirst }}</p>
                </div>
            </section>

            <!-- ── PURCHASES ── -->
            <section class="card">
                <div class="section-header">
                    <h2 class="section-title">{{ t.myPurchases }}</h2>
                    <div class="section-actions">
                        <button class="ghost-btn" @click="exportCSV">↓ CSV</button>
                        <button class="ghost-btn" @click="csvInput.click()">↑ CSV</button>
                        <input ref="csvInput" type="file" accept=".csv" hidden @change="importCSV" />
                    </div>
                </div>

                <button class="add-purchase-btn" @click="showForm = !showForm">
                    <span class="add-icon">{{ showForm ? '✕' : '+' }}</span>
                    <span>{{ showForm ? t.cancel : t.addPurchase }}</span>
                </button>

                <transition name="slide-down">
                    <div v-if="showForm" class="purchase-form">
                        <div class="form-grid">
                            <div class="form-field">
                                <label>{{ t.weight }}</label>
                                <input v-model.number="draft.weight" type="text" inputmode="decimal"
                                    :placeholder="t.enterWeight" class="text-input" />
                            </div>
                            <div class="form-field">
                                <label>{{ t.unit }}</label>
                                <select v-model="draft.unit" class="text-input">
                                    <option v-for="u in converterUnits" :key="u" :value="u">{{ t[u] || u }}</option>
                                </select>
                            </div>
                            <div class="form-field">
                                <label>{{ t.pricePaid }} (USD)</label>
                                <input v-model.number="draft.price" type="text" inputmode="decimal"
                                    :placeholder="t.enterPrice" class="text-input" />
                            </div>
                            <div class="form-field">
                                <label>{{ t.date }}</label>
                                <input v-model="draft.date" type="date" class="text-input" />
                            </div>
                        </div>
                        <button class="primary-btn full-btn" @click="addPurchase">✦ {{ t.save }}</button>
                    </div>
                </transition>

                <div v-if="purchases.length" class="purchases-list">
                    <div v-for="(p, i) in purchases" :key="p.id" class="p-card slide-in-card" :style="{
        borderLeftColor: gainLoss(p) >= 0 ? 'var(--gain)' : 'var(--loss)',
        borderColor: gainLoss(p) >= 0 ? 'var(--gain-border)' : 'var(--loss-border)',
        background: gainLoss(p) >= 0 ? 'var(--gain-bg)' : 'var(--loss-bg)',
        animationDelay: (i * 0.1) + 's'
    }">
                        <div v-if="editIdx !== i">
                            <div class="pcard-header">
                                <div class="pcard-weight-row">
                                    <span class="pcard-weight">{{ p.weight }} <span class="pcard-unit">{{ t[p.unit] ||
                                            p.unit }}</span></span>
                                    <span class="pcard-date">{{ formatDate(p.date) }}</span>
                                </div>
                                <div class="pcard-btns">
                                    <button class="pcard-btn" @click="startEdit(i)" :aria-label="t.edit">✎</button>
                                    <button class="pcard-btn danger" @click="removePurchase(i)"
                                        :aria-label="t.delete">✕</button>
                                </div>
                            </div>
                            <div class="gl-row">
                                <div class="gl-col">
                                    <span class="gl-label">{{ t.paid }}</span>
                                    <span class="gl-val">${{ p.price.toFixed(2) }}</span>
                                </div>
                                <div class="gl-divider" />
                                <div class="gl-col">
                                    <span class="gl-label">{{ t.current }}</span>
                                    <span class="gl-val" :class="gainLoss(p) >= 0 ? 'gain-text' : 'loss-text'">${{
                                        currentValue(p).toFixed(2) }}</span>
                                </div>
                                <div class="gl-divider" />
                                <div class="gl-col">
                                    <span class="gl-label">{{ t.gainLoss }}</span>
                                    <span class="gl-val gl-main" :class="gainLoss(p) >= 0 ? 'gain-text' : 'loss-text'">
                                        {{ gainLoss(p) >= 0 ? '+' : '' }}${{ gainLoss(p).toFixed(2) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div v-else>
                            <div class="form-grid">
                                <div class="form-field">
                                    <label>{{ t.weight }}</label>
                                    <input v-model.number="editDraft.weight" type="text" inputmode="decimal"
                                        class="text-input" />
                                </div>
                                <div class="form-field">
                                    <label>{{ t.unit }}</label>
                                    <select v-model="editDraft.unit" class="text-input">
                                        <option v-for="u in converterUnits" :key="u" :value="u">{{ t[u] || u }}</option>
                                    </select>
                                </div>
                                <div class="form-field">
                                    <label>{{ t.pricePaid }}</label>
                                    <input v-model.number="editDraft.price" type="text" inputmode="decimal"
                                        class="text-input" />
                                </div>
                                <div class="form-field">
                                    <label>{{ t.date }}</label>
                                    <input v-model="editDraft.date" type="date" class="text-input" />
                                </div>
                            </div>
                            <div class="edit-actions">
                                <button class="primary-btn" style="flex:1" @click="saveEdit">{{ t.save }}</button>
                                <button class="ghost-btn" style="flex:1" @click="editIdx = null">{{ t.cancel }}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Portfolio Summary with liquid bar -->
                <div v-if="purchases.length" class="summary">
                    <div class="sum-row">
                        <div class="sum-item">
                            <span class="sum-label">{{ t.totalInvested }}</span>
                            <span ref="sumInvested" class="sum-val">${{ totalInvested.toFixed(2) }}</span>
                        </div>
                        <div class="sum-item" :class="totalGL >= 0 ? 'gain' : 'loss'">
                            <span class="sum-label">{{ t.currentValue }}</span>
                            <span ref="sumCurrent" class="sum-val">${{ totalCurrent.toFixed(2) }}</span>
                        </div>
                        <div class="sum-item" :class="totalGL >= 0 ? 'gain' : 'loss'">
                            <span class="sum-label">{{ t.totalGainLoss }}</span>
                            <span ref="sumGL" class="sum-val">{{ totalGL >= 0 ? '+' : '' }}${{ totalGL.toFixed(2)
                                }}</span>
                        </div>
                    </div>
                    <!-- Liquid bar -->
                    <div v-if="totalInvested > 0" class="portfolio-bar">
                        <div class="portfolio-fill liquid-fill" :class="totalGL >= 0 ? 'gain' : 'loss'"
                            :style="{ width: Math.min(Math.abs(totalGL / totalInvested) * 100, 100) + '%' }" />
                    </div>
                    <div v-if="totalInvested > 0" class="portfolio-pct" :class="totalGL >= 0 ? 'gain' : 'loss'">
                        {{ totalGL >= 0 ? '▲' : '▼' }} {{ Math.abs(totalGL / totalInvested * 100).toFixed(1) }}%
                    </div>
                </div>

                <div v-else-if="!showForm" class="empty-state">
                    <span class="empty-icon">◈</span>
                    <p>{{ t.noPurchases }}</p>
                </div>
            </section>

        </main>

        <footer class="footer">
            <p>Gold Tracker · Nuxt 3 · Prices USD</p>
        </footer>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const TROY = 31.1035
const DAMLUNG = 37.5
const CHI = 3.75
const HUN = 0.375
const LI = 0.0375

const converterUnits = ['li', 'hun', 'chi', 'gram', 'damlung', 'troyOz']

// ─── State ────────────────────────────────────────────────────────────────────
const lang = ref('en')
const isDark = ref(true)
const isOnline = ref(true)
const priceSource = ref('api')
const priceMethod = ref('troyOz')
const customPrice = ref(null)
const customApiUrl = ref('')
const goldPrice = ref(null)
const lastUpdated = ref('')
const loading = ref(false)
const isLive = ref(false)
const flashMsg = ref('')
const flashType = ref('success')
const activeConv = ref('chi')
const convInput = ref(1)
const showForm = ref(false)
const showStickyPrice = ref(false)
const purchases = ref([])
const draft = ref({ weight: '', unit: 'chi', price: '', date: today() })
const editIdx = ref(null)
const editDraft = ref({})
const csvInput = ref(null)
const sumInvested = ref(null)
const sumCurrent = ref(null)
const sumGL = ref(null)

// ─── Animation state ──────────────────────────────────────────────────────────
const gemSpinning = ref(false)
const accentTrace = ref(false)
const tickerCols = ref([])
const priceFlash = ref('')
const changePill = ref({ show: false, dir: 'up', text: '' })
const orbColor = ref('neutral')
let prevGoldPrice = null
let priceFlashTimer = null
let pillTimer = null

// ─── Screensaver ──────────────────────────────────────────────────────────────
const screensaver = ref(false)
const ssTime = ref('')
const ssDate = ref('')
let ssClockTimer = null
let idleTimer = null
const IDLE_MS = 5 * 60 * 1000 // 5 min auto-trigger

function updateSsClock() {
    const n = new Date()
    const h = String(n.getHours()).padStart(2, '0')
    const m = String(n.getMinutes()).padStart(2, '0')
    const s = String(n.getSeconds()).padStart(2, '0')
    ssTime.value = `${h}:${m}:${s}`
    ssDate.value = n.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function activateScreensaver() {
    screensaver.value = true
    updateSsClock()
    ssClockTimer = setInterval(updateSsClock, 1000)
}

function dismissScreensaver() {
    screensaver.value = false
    clearInterval(ssClockTimer)
    resetIdleTimer()
}

function resetIdleTimer() {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(activateScreensaver, IDLE_MS)
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const confettiCanvas = ref(null)
let confettiAnimFrame = null
let prevTotalGL = null

const CONF_COLORS = ['#F5C842', '#22C55E', '#60A5FA', '#F87171', '#C084FC', '#FB923C', '#FBBF24']

function launchConfetti() {
    const canvas = confettiCanvas.value
    if (!canvas) return
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W
    canvas.height = H
    canvas.style.display = 'block'

    const pieces = Array.from({ length: 80 }, () => ({
        x: Math.random() * W,
        y: -10 - Math.random() * 80,
        r: 4 + Math.random() * 5,
        color: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 3 + Math.random() * 4,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        alpha: 1,
    }))

    const ctx = canvas.getContext('2d')
    let done = false

    function frame() {
        ctx.clearRect(0, 0, W, H)
        let alive = 0
        for (const p of pieces) {
            p.x += p.vx
            p.y += p.vy
            p.vy += 0.12
            p.rot += p.rotV
            if (p.y > H * 0.7) p.alpha = Math.max(0, p.alpha - 0.03)
            if (p.alpha <= 0) continue
            alive++
            ctx.save()
            ctx.globalAlpha = p.alpha
            ctx.translate(p.x, p.y)
            ctx.rotate((p.rot * Math.PI) / 180)
            ctx.fillStyle = p.color
            if (p.shape === 'circle') {
                ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill()
            } else {
                ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
            }
            ctx.restore()
        }
        if (alive > 0) confettiAnimFrame = requestAnimationFrame(frame)
        else { canvas.style.display = 'none'; ctx.clearRect(0, 0, W, H) }
    }
    cancelAnimationFrame(confettiAnimFrame)
    confettiAnimFrame = requestAnimationFrame(frame)
}

// ─── i18n ────────────────────────────────────────────────────────────────────
const translations = {
    en: {
        title: 'Gold Tracker', gold: 'Gold', live: 'Live', custom: 'Custom',
        refresh: 'Refresh', loading: 'Loading…', pricesUpdated: '✓ Updated',
        perTroyOz: '/ troy oz', priceByUnit: 'Price by Unit', unitConverter: 'Unit Converter',
        myPurchases: 'My Purchases', addPurchase: 'Add Purchase', cancel: 'Cancel',
        weight: 'Weight', unit: 'Unit', pricePaid: 'Price Paid', date: 'Date',
        save: 'Save', edit: 'Edit', delete: 'Delete', paid: 'Paid', current: 'Current',
        gainLoss: 'G / L', portfolioSummary: 'Portfolio', totalInvested: 'Invested',
        currentValue: 'Value Now', totalGainLoss: 'Total G/L', exportCSV: 'Export',
        importCSV: 'Import', enterWeight: 'e.g. 2', enterPrice: 'e.g. 240',
        enterPriceFor: 'Price per', apiHint: 'Optional API key for higher rate limits',
        apiKeyPlaceholder: 'Paste goldapi.io key (optional)…', freeNoKey: 'Free, no key needed',
        asBackup: 'key as fallback', paste: 'Paste', clear: 'Clear',
        gram: 'Gram', li: 'Li', hun: 'Hun', chi: 'Chi', damlung: 'Damlung',
        troyOunce: 'Troy Oz', troyOz: 'Troy Oz', fetchPriceFirst: 'Fetch a price first',
        offlineWarning: 'You are offline — prices may be outdated',
        noPurchases: 'No purchases yet. Tap + Add above.',
    },
    km: {
        title: 'តាមដានមាស', gold: 'មាស', live: 'បន្តផ្ទាល់', custom: 'កំណត់ផ្ទាល់',
        refresh: 'ធ្វើបច្ចុប្បន្នភាព', loading: 'កំពុងផ្ទុក…', pricesUpdated: '✓ បានធ្វើបច្ចុប្បន្នភាព',
        perTroyOz: '/ ត្រយ អោន', priceByUnit: 'តម្លៃតាមឯកតា', unitConverter: 'បម្លែងឯកតា',
        myPurchases: 'ការទិញរបស់ខ្ញុំ', addPurchase: 'បន្ថែម', cancel: 'បោះបង់',
        weight: 'ទម្ងន់', unit: 'ឯកតា', pricePaid: 'តម្លៃបង់', date: 'កាលបរិច្ឆេទ',
        save: 'រក្សាទុក', edit: 'កែ', delete: 'លុប', paid: 'បង់', current: 'បច្ចុប្បន្ន',
        gainLoss: 'ចំណេញ/ខាត', portfolioSummary: 'សង្ខេប', totalInvested: 'វិនិយោគ',
        currentValue: 'តម្លៃ', totalGainLoss: 'ចំណេញ/ខាត', exportCSV: 'នាំចេញ',
        importCSV: 'នាំចូល', enterWeight: 'ឧ. ២', enterPrice: 'ឧ. ២៤០',
        enterPriceFor: 'តម្លៃ', apiHint: 'ស្រេចចិត្ត API key',
        apiKeyPlaceholder: 'បិទភ្ជាប់ goldapi.io key…', freeNoKey: 'ឥតគិតថ្លៃ',
        asBackup: 'key ជាបម្រុង', paste: 'បិទភ្ជាប់', clear: 'លុប',
        gram: 'ក្រាម', li: 'លី', hun: 'ហុន', chi: 'ជី', damlung: 'ដំឡឹង',
        troyOunce: 'ត្រយ អោន', troyOz: 'ត្រយ អោន', fetchPriceFirst: 'សូមទាញតម្លៃជាមុន',
        offlineWarning: '⚠ ក្រៅបណ្តាញ', noPurchases: 'មិនទាន់មានការទិញ។ ចុច + បន្ថែម',
    }
}
const t = computed(() => translations[lang.value])

// ─── Price computations ───────────────────────────────────────────────────────
const pricePerGram = computed(() => goldPrice.value ? goldPrice.value / TROY : 0)
const priceUnits = computed(() => [
    { key: 'li', label: 'Li', price: pricePerGram.value * LI },
    { key: 'hun', label: 'Hun', price: pricePerGram.value * HUN },
    { key: 'chi', label: 'Chi', price: pricePerGram.value * CHI },
    { key: 'gram', label: 'Gram', price: pricePerGram.value },
    { key: 'damlung', label: 'Damlung', price: pricePerGram.value * DAMLUNG },
    { key: 'troyOz', label: 'Troy Oz', price: goldPrice.value || 0 },
])
const allUnits = computed(() => [
    { key: 'li', label: 'Li', price: pricePerGram.value * LI, gram: '0.0375g' },
    { key: 'hun', label: 'Hun', price: pricePerGram.value * HUN, gram: '0.375g' },
    { key: 'chi', label: 'Chi', price: pricePerGram.value * CHI, gram: '3.75g' },
    { key: 'gram', label: 'Gram', price: pricePerGram.value, gram: '1g' },
    { key: 'damlung', label: 'Damlung', price: pricePerGram.value * DAMLUNG, gram: '37.5g' },
    { key: 'troyOz', label: 'Troy Oz', price: goldPrice.value || 0, gram: '31.1g' },
])
const totalInvested = computed(() => purchases.value.reduce((s, p) => s + p.price, 0))
const totalCurrent = computed(() => purchases.value.reduce((s, p) => s + currentValue(p), 0))
const totalGL = computed(() => totalCurrent.value - totalInvested.value)

// ─── Ticker logic ─────────────────────────────────────────────────────────────
let prevTickerStr = ''

function buildTicker(price) {
    if (!price) { tickerCols.value = []; return }
    const str = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const chars = str.split('')
    const prev = prevTickerStr.split('')

    tickerCols.value = chars.map((ch, i) => {
        const isSep = ch === ',' || ch === '.'
        const changed = ch !== prev[i]
        if (isSep) {
            return { chars: [ch], rolling: false, reelStyle: {}, isSep: true }
        }
        if (changed && prev[i] && !isSep) {
            return {
                chars: [prev[i] || ch, ch],
                rolling: true,
                reelStyle: { transform: 'translateY(0)' },
                isSep: false,
            }
        }
        return { chars: [ch], rolling: false, reelStyle: {}, isSep: false }
    })

    prevTickerStr = str

    // animate rolling cols
    nextTick(() => {
        tickerCols.value.forEach((col, i) => {
            if (col.rolling) {
                setTimeout(() => {
                    if (tickerCols.value[i]) {
                        tickerCols.value[i].reelStyle = { transform: 'translateY(-50%)', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)' }
                    }
                    setTimeout(() => {
                        if (tickerCols.value[i]) {
                            tickerCols.value[i].chars = [col.chars[col.chars.length - 1]]
                            tickerCols.value[i].reelStyle = {}
                            tickerCols.value[i].rolling = false
                        }
                    }, 450)
                }, i * 30)
            }
        })
    })
}

watch(goldPrice, (val, oldVal) => {
    buildTicker(val)
    triggerAccent()
    triggerGemSpin()
    triggerPriceFlash(val, oldVal)
    triggerOrbShift(val, oldVal)
})

// Fire confetti when portfolio crosses a positive milestone (0%, 5%, 10%, 25%, 50%)
const MILESTONES = [0.001, 5, 10, 25, 50]
watch(totalGL, (newGL, oldGL) => {
    if (!totalInvested.value || totalInvested.value <= 0) return
    const newPct = (newGL / totalInvested.value) * 100
    const oldPct = oldGL != null ? (oldGL / totalInvested.value) * 100 : null
    if (oldPct === null) return
    for (const m of MILESTONES) {
        if (oldPct < m && newPct >= m) { launchConfetti(); break }
    }
})

// ─── Animation helpers ────────────────────────────────────────────────────────
function triggerGemSpin() {
    gemSpinning.value = false
    nextTick(() => { gemSpinning.value = true })
    setTimeout(() => { gemSpinning.value = false }, 700)
}

function triggerAccent() {
    accentTrace.value = false
    nextTick(() => { accentTrace.value = true })
}

function triggerPriceFlash(val, oldVal) {
    if (!oldVal || !val) return
    const dir = val > oldVal ? 'up' : val < oldVal ? 'down' : null
    if (!dir) return
    // flash color
    priceFlash.value = ''
    nextTick(() => { priceFlash.value = dir })
    clearTimeout(priceFlashTimer)
    priceFlashTimer = setTimeout(() => { priceFlash.value = '' }, 700)
    // change pill
    const diff = Math.abs(val - oldVal).toFixed(2)
    clearTimeout(pillTimer)
    changePill.value = { show: true, dir, text: `$${diff}` }
    pillTimer = setTimeout(() => { changePill.value = { ...changePill.value, show: false } }, 3500)
}

function triggerOrbShift(val, oldVal) {
    if (!oldVal || !val) return
    if (val > oldVal) orbColor.value = 'up'
    else if (val < oldVal) orbColor.value = 'down'
}

// Ripple on refresh button tap
function doRipple(e) {
    const btn = e.currentTarget
    const r = document.createElement('span')
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    r.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;border-radius:50%;background:rgba(255,255,255,0.35);transform:scale(0);animation:rippleAnim 0.55s ease-out forwards;pointer-events:none`
    btn.appendChild(r)
    setTimeout(() => r.remove(), 600)
}

// Count-up animation for summary numbers
function animateCount(el, target, prefix = '$') {
    if (!el) return
    const duration = 850
    const start = performance.now()
    const startVal = 0
    function step(now) {
        const p = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 4)
        el.textContent = prefix + (startVal + (target - startVal) * ease).toFixed(2)
        if (p < 1) requestAnimationFrame(step)
        else el.textContent = prefix + target.toFixed(2)
    }
    requestAnimationFrame(step)
}

// ─── Methods ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0] }
function toggleLang() { lang.value = lang.value === 'en' ? 'km' : 'en'; save() }
function toggleDark() { isDark.value = !isDark.value; save() }

function toGrams(w, u) {
    return w * ({ li: LI, hun: HUN, chi: CHI, gram: 1, damlung: DAMLUNG, troyOz: TROY }[u] || 1)
}
function fromGrams(g, u) {
    return g / ({ li: LI, hun: HUN, chi: CHI, gram: 1, damlung: DAMLUNG, troyOz: TROY }[u] || 1)
}
function convertUnit(val, from, to) { return fromGrams(toGrams(val, from), to).toFixed(4) }
function currentValue(p) { return goldPrice.value ? pricePerGram.value * toGrams(p.weight, p.unit) : 0 }
function gainLoss(p) { return currentValue(p) - p.price }
function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }

function flash(msg, type = 'success') {
    flashMsg.value = msg; flashType.value = type
    setTimeout(() => flashMsg.value = '', 3000)
}

function switchMethod(m) {
    priceMethod.value = m; customPrice.value = null; goldPrice.value = null; save()
}

function applyCustomPrice() {
    const p = customPrice.value
    if (!p || p <= 0) { goldPrice.value = null; return }
    if (priceMethod.value === 'troyOz') goldPrice.value = p
    else if (priceMethod.value === 'damlung') goldPrice.value = (p / DAMLUNG) * TROY
    else if (priceMethod.value === 'chi') goldPrice.value = (p / CHI) * TROY
    lastUpdated.value = new Date().toLocaleTimeString() + ' (custom)'
    save()
}

async function pasteClipboard() {
    try {
        const text = await navigator.clipboard.readText()
        if (text?.trim()) customApiUrl.value = text.trim()
        else flash('Clipboard is empty', 'error')
    } catch { flash('Allow clipboard access or paste manually', 'error') }
}

// Simulate 3 ticking price changes, then do the real API call on the 4th tick
async function fetchPrice(e) {
    if (e && e.currentTarget) doRipple(e)
    loading.value = true
    isLive.value = false
    orbColor.value = 'neutral'

    const base = goldPrice.value || 3300
    const fakeDeltas = [
        Math.round((Math.random() * 40 + 10) * (Math.random() > 0.5 ? 1 : -1) * 100) / 100,
        Math.round((Math.random() * 40 + 10) * (Math.random() > 0.5 ? 1 : -1) * 100) / 100,
        Math.round((Math.random() * 40 + 10) * (Math.random() > 0.5 ? 1 : -1) * 100) / 100,
    ]

    // tick 1
    await new Promise(r => setTimeout(r, 750))
    goldPrice.value = parseFloat((base + fakeDeltas[0]).toFixed(2))
    lastUpdated.value = 'fetching…'

    // tick 2
    await new Promise(r => setTimeout(r, 750))
    goldPrice.value = parseFloat((base + fakeDeltas[0] + fakeDeltas[1]).toFixed(2))

    // tick 3
    await new Promise(r => setTimeout(r, 750))
    goldPrice.value = parseFloat((base + fakeDeltas[0] + fakeDeltas[1] + fakeDeltas[2]).toFixed(2))

    // tick 4 — real API
    let ok = false
    try {
        const r = await fetch('https://api.gold-api.com/price/XAU', { mode: 'cors' })
        if (r.ok) {
            const d = await r.json()
            const p = d?.price ?? d?.ask ?? d?.bid
            if (p && !isNaN(p)) { goldPrice.value = parseFloat(p); ok = true }
        }
    } catch (_) { }

    if (!ok && customApiUrl.value?.trim()) {
        try {
            const r = await fetch('https://www.goldapi.io/api/XAU/USD', {
                headers: { 'x-access-token': customApiUrl.value.trim(), Accept: 'application/json' },
                mode: 'cors'
            })
            if (r.ok) {
                const d = await r.json()
                if (d?.price) { goldPrice.value = parseFloat(d.price); ok = true }
            }
        } catch (_) { }
    }

    if (ok) {
        isLive.value = true
        lastUpdated.value = '✓ ' + new Date().toLocaleTimeString()
        save(); flash(t.value.pricesUpdated)
    } else {
        const cached = load()?.goldPrice
        if (cached) {
            goldPrice.value = cached
            lastUpdated.value = (load()?.lastUpdated || '') + ' (cached)'
            flash('Using cached price — live fetch failed', 'error')
        } else {
            flash('Could not fetch price. Try Custom mode.', 'error')
        }
    }
    loading.value = false
}

function addPurchase() {
    if (!draft.value.weight || !draft.value.price) { flash('Fill in weight and price', 'error'); return }
    purchases.value.push({ ...draft.value, id: Date.now() })
    draft.value = { weight: '', unit: 'chi', price: '', date: today() }
    showForm.value = false
    save()
}

function startEdit(i) { editIdx.value = i; editDraft.value = { ...purchases.value[i] } }

function saveEdit() {
    if (!editDraft.value.weight || !editDraft.value.price) { flash('Fill in weight and price', 'error'); return }
    purchases.value[editIdx.value] = { ...editDraft.value }
    editIdx.value = null; save()
}

function removePurchase(i) {
    if (confirm('Delete this purchase?')) { purchases.value.splice(i, 1); save() }
}

function exportCSV() {
    const rows = purchases.value.map(p => [p.weight, p.unit, p.price.toFixed(2), p.date])
    const csv = [['Weight', 'Unit', 'Paid', 'Date'], ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `gold-${today()}.csv`; a.click()
}

function importCSV(e) {
    const file = e.target?.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
        try {
            const lines = evt.target.result.trim().split('\n').map(l => l.trim()).filter(Boolean)
            if (lines.length < 2) { flash('CSV empty or no data rows', 'error'); return }
            const hdr = lines[0].split(',').map(h => h.trim().toLowerCase())
            const wi = hdr.indexOf('weight'), ui = hdr.indexOf('unit'), pi = hdr.indexOf('paid'), di = hdr.indexOf('date')
            if (wi === -1 || pi === -1) { flash('CSV must have Weight and Paid columns', 'error'); return }
            let added = 0
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim())
                const weight = parseFloat(cols[wi]), price = parseFloat(cols[pi])
                if (isNaN(weight) || isNaN(price)) continue
                const unit = (ui !== -1 && converterUnits.includes(cols[ui])) ? cols[ui] : 'chi'
                const date = (di !== -1 && cols[di]) ? cols[di] : today()
                purchases.value.push({ weight, unit, price, date, id: Date.now() + i })
                added++
            }
            if (added > 0) { save(); flash(`✓ Imported ${added} purchase${added > 1 ? 's' : ''}`) }
            else flash('No valid rows found', 'error')
        } catch { flash('Failed to parse CSV', 'error') }
    }
    reader.readAsText(file); e.target.value = ''
}

function save() {
    try {
        localStorage.setItem('gt4', JSON.stringify({
            lang: lang.value, isDark: isDark.value, goldPrice: goldPrice.value,
            lastUpdated: lastUpdated.value, purchases: purchases.value,
            priceMethod: priceMethod.value, customPrice: customPrice.value,
            customApiUrl: customApiUrl.value, priceSource: priceSource.value,
        }))
    } catch { }
}
function load() { try { return JSON.parse(localStorage.getItem('gt4') || 'null') } catch { return null } }

function handleOnline() { isOnline.value = true; fetchPrice() }
function handleOffline() { isOnline.value = false }
function handleScroll() { showStickyPrice.value = window.scrollY > 100 }

onMounted(() => {
    const d = load()
    if (d) {
        lang.value = d.lang || 'en'; isDark.value = d.isDark ?? true
        goldPrice.value = d.goldPrice || null; lastUpdated.value = d.lastUpdated || ''
        purchases.value = d.purchases || []; priceMethod.value = d.priceMethod || 'troyOz'
        customPrice.value = d.customPrice || null; customApiUrl.value = d.customApiUrl || ''
        priceSource.value = d.priceSource || 'api'
        if (d.goldPrice) buildTicker(d.goldPrice)
    }
    // count-up on load
    nextTick(() => {
        setTimeout(() => {
            if (sumInvested.value) animateCount(sumInvested.value, totalInvested.value)
            setTimeout(() => { if (sumCurrent.value) animateCount(sumCurrent.value, totalCurrent.value) }, 120)
            setTimeout(() => { if (sumGL.value) animateCount(sumGL.value, Math.abs(totalGL.value), (totalGL.value >= 0 ? '+$' : '-$')) }, 240)
        }, 200)
    })
    if (priceSource.value === 'api') fetchPrice()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('scroll', handleScroll, { passive: true })
    // idle detection for screensaver
    const idleEvents = ['mousemove', 'keydown', 'touchstart', 'click']
    idleEvents.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }))
    resetIdleTimer()
})
onBeforeUnmount(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('scroll', handleScroll)
    clearTimeout(idleTimer)
    clearInterval(ssClockTimer)
    cancelAnimationFrame(confettiAnimFrame)
    const idleEvents = ['mousemove', 'keydown', 'touchstart', 'click']
    idleEvents.forEach(e => window.removeEventListener(e, resetIdleTimer))
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

*,
*::before,
*::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

.app {
    --gold: #F5C842;
    --gold-dim: #C08A10;
    --gold-alpha: rgba(245, 200, 66, 0.12);
    --gold-border: rgba(245, 200, 66, 0.28);
    --gain: #22C55E;
    --gain-bg: rgba(34, 197, 94, 0.08);
    --gain-border: rgba(34, 197, 94, 0.35);
    --loss: #F87171;
    --loss-bg: rgba(248, 113, 113, 0.08);
    --loss-border: rgba(248, 113, 113, 0.35);
    --radius-sm: 10px;
    --radius: 16px;
    --radius-lg: 20px;
    --font: 'Outfit', system-ui, sans-serif;
    --mono: 'DM Mono', ui-monospace, monospace;
    --touch: 52px;
}

.app.dark {
    --bg: #0C0C12;
    --surface: #13131C;
    --surface2: #1A1A26;
    --surface3: #222232;
    --border: rgba(255, 255, 255, 0.07);
    --border-hi: rgba(255, 255, 255, 0.14);
    --text: #F2EFE8;
    --text-2: #9490A0;
    --text-3: #5A576A;
}

.app:not(.dark) {
    --bg: #F4F1EB;
    --surface: #FFFFFF;
    --surface2: #F9F7F2;
    --surface3: #EEEBDF;
    --border: rgba(0, 0, 0, 0.08);
    --border-hi: rgba(0, 0, 0, 0.15);
    --text: #1A1810;
    --text-2: #6B665C;
    --text-3: #A09A8E;
    --gold: #B8820A;
    --gold-alpha: rgba(160, 110, 0, 0.1);
    --gold-border: rgba(160, 110, 0, 0.25);
}

.app {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
}

/* ── Ambient orbs ── */
.ambient {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
}

.orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.14;
}

.orb-1 {
    width: 420px;
    height: 420px;
    background: #F5C842;
    top: -120px;
    right: -80px;
    animation: drift 14s ease-in-out infinite alternate;
}

.orb-2 {
    width: 280px;
    height: 280px;
    background: #A07020;
    bottom: 25%;
    left: -60px;
    animation: drift 18s ease-in-out infinite alternate-reverse;
}

/* Orb pulse on fetch */
.orb.fetching {
    animation-duration: 0.8s !important;
    opacity: 0.35 !important;
    transition: opacity 0.3s;
}

.app:not(.dark) .orb {
    opacity: 0.08;
}

.app:not(.dark) .orb.fetching {
    opacity: 0.18 !important;
}

@keyframes drift {
    from {
        transform: translate(0, 0) scale(1);
    }

    to {
        transform: translate(20px, 30px) scale(1.08);
    }
}

/* ── Gem coin spin ── */
.logo-gem,
.sticky-gem {
    font-size: 22px;
    color: var(--gold);
    flex-shrink: 0;
    line-height: 1;
    display: inline-block;
    transform-style: preserve-3d;
}

.logo-gem {
    animation: heartbeat 4s ease-in-out infinite;
}

@keyframes heartbeat {

    0%,
    100% {
        transform: scale(1);
    }

    10% {
        transform: scale(1.22);
    }

    20% {
        transform: scale(1);
    }

    30% {
        transform: scale(1.12);
    }

    40% {
        transform: scale(1);
    }
}

.logo-gem.spinning,
.sticky-gem.spinning {
    animation: coinSpin 0.65s ease-in-out forwards;
}

@keyframes coinSpin {
    0% {
        transform: rotateY(0deg) scale(1);
    }

    30% {
        transform: rotateY(90deg) scale(0.7);
    }

    60% {
        transform: rotateY(180deg) scale(0.7);
    }

    100% {
        transform: rotateY(360deg) scale(1);
    }
}

/* ── Header ── */
.header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(12, 12, 18, 0.88);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
    border-bottom: 1px solid var(--border);
}

.app:not(.dark) .header {
    background: rgba(244, 241, 235, 0.92);
}

.header-inner {
    max-width: 640px;
    margin: 0 auto;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
}

.logo {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.logo-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.logo-title {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.logo-sub {
    font-size: 10px;
    color: var(--text-3);
    letter-spacing: 0.05em;
    margin-top: 1px;
}

.header-controls {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

.ctrl-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius-sm);
    font-size: 14px;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
    min-height: var(--touch);
    min-width: var(--touch);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.ctrl-btn:hover {
    border-color: var(--gold);
    color: var(--gold);
}

.lang-btn {
    font-size: 12px;
    padding: 0 12px;
    min-width: unset;
}

.offline-bar {
    text-align: center;
    padding: 8px;
    font-size: 12px;
    font-weight: 600;
    background: var(--gold-alpha);
    color: var(--gold);
    border-top: 1px solid var(--gold-border);
}

/* ── Sticky Price ── */
.sticky-price {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-56px);
    z-index: 99;
    background: var(--surface);
    border: 1px solid var(--gold-border);
    border-radius: 0 0 12px 12px;
    padding: 6px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.sticky-price.visible {
    transform: translateX(-50%) translateY(0);
}

.sticky-val {
    font-size: 16px;
    font-weight: 800;
    color: var(--gold);
    font-family: var(--mono);
}

.sticky-unit {
    font-size: 11px;
    color: var(--text-3);
}

.sticky-refresh {
    background: none;
    border: none;
    color: var(--text-2);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    margin-left: 4px;
    transition: color 0.2s;
    min-height: unset;
}

.sticky-refresh:hover {
    color: var(--gold);
}

/* ── Main ── */
.main {
    position: relative;
    z-index: 1;
    max-width: 640px;
    margin: 0 auto;
    padding: 12px 12px 72px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

/* ── Cards ── */
.card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 16px;
    position: relative;
    overflow: hidden;
}

/* ── Accent line trace ── */
.card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--surface3);
    overflow: hidden;
}

.accent-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    transform: translateX(-100%);
}

.accent-fill.trace {
    animation: traceLine 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes traceLine {
    from {
        transform: translateX(-100%);
    }

    to {
        transform: translateX(0%);
    }
}

/* ── Digit Roll Ticker ── */
.ticker-row {
    display: flex;
    align-items: baseline;
    gap: 2px;
    line-height: 1;
    margin-bottom: 4px;
}

.price-dollar {
    font-size: 28px;
    font-weight: 800;
    color: var(--gold);
    align-self: flex-start;
    margin-top: 6px;
}

.digit-ticker {
    display: flex;
    align-items: flex-end;
    overflow: hidden;
}

.digit-col {
    overflow: hidden;
    height: clamp(44px, 12vw, 72px);
    line-height: clamp(44px, 12vw, 72px);
    position: relative;
}

.digit-col.separator {
    font-size: clamp(28px, 7vw, 48px);
    font-weight: 800;
    color: var(--gold);
    font-family: var(--mono);
    display: flex;
    align-items: flex-end;
    height: clamp(44px, 12vw, 72px);
    padding-bottom: 2px;
}

.digit-reel {
    display: flex;
    flex-direction: column;
    will-change: transform;
}

.digit-reel span {
    display: block;
    height: clamp(44px, 12vw, 72px);
    line-height: clamp(44px, 12vw, 72px);
    font-size: clamp(44px, 12vw, 72px);
    font-weight: 800;
    color: var(--gold);
    letter-spacing: -2px;
    font-variant-numeric: tabular-nums;
    font-family: var(--mono);
    text-align: center;
    min-width: clamp(26px, 7vw, 46px);
}

.price-empty {
    font-size: clamp(44px, 12vw, 72px);
    font-weight: 800;
    color: var(--gold);
    letter-spacing: -2px;
    font-family: var(--mono);
}

.price-unit-label {
    font-size: 12px;
    color: var(--text-3);
    font-family: var(--mono);
}

/* ── Shimmer skeleton chips ── */
.shimmer-chip {
    flex-shrink: 0;
    min-width: 72px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    position: relative;
    overflow: hidden;
}

.shimmer-chip::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
            transparent 0%,
            rgba(245, 200, 66, 0.15) 50%,
            transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
}

.app:not(.dark) .shimmer-chip::after {
    background: linear-gradient(90deg,
            transparent 0%,
            rgba(160, 110, 0, 0.12) 50%,
            transparent 100%);
    background-size: 200% 100%;
}

@keyframes shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

.shimmer-line {
    height: 10px;
    background: var(--border-hi);
    border-radius: 4px;
    margin-bottom: 6px;
}

.shimmer-line.short {
    width: 55%;
}

.shimmer-line.long {
    height: 14px;
    width: 75%;
    margin-bottom: 0;
}

/* ── Real chips ── */
.chips-scroll {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 2px 0 10px;
    margin: 0 -4px;
    padding-left: 4px;
}

.chips-scroll::-webkit-scrollbar {
    display: none;
}

.chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    min-width: 64px;
}

.chip-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.chip-price {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    font-family: var(--mono);
}

/* ── Progress Bar ── */
.progress-bar {
    height: 3px;
    background: var(--surface3);
    border-radius: 2px;
    overflow: hidden;
    margin: 10px 0;
}

.progress-fill {
    height: 100%;
    background: var(--gold);
    animation: progress 1.4s ease-in-out infinite;
}

@keyframes progress {
    0% {
        transform: translateX(-100%) scaleX(0.4);
    }

    50% {
        transform: translateX(60%) scaleX(0.8);
    }

    100% {
        transform: translateX(200%) scaleX(0.4);
    }
}

/* ── Flash ── */
.flash {
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    margin-top: 10px;
}

.flash.success {
    background: rgba(34, 197, 94, .1);
    border: 1px solid rgba(34, 197, 94, .3);
    color: var(--gain);
}

.flash.error {
    background: rgba(248, 113, 113, .1);
    border: 1px solid rgba(248, 113, 113, .3);
    color: var(--loss);
}

/* ── Sub Panels ── */
.sub-panel {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
}

.sub-panel-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.api-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
}

.api-badge {
    display: inline-block;
    width: fit-content;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    background: var(--gold-alpha);
    border: 1px solid var(--gold-border);
    color: var(--gold);
    padding: 3px 8px;
    border-radius: 6px;
}

.api-hint-text {
    font-size: 12px;
    color: var(--text-3);
}

.api-key-row {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
}

.api-hint {
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.5;
}

.api-hint a {
    color: var(--gold);
    text-decoration: none;
}

.api-hint a:hover {
    text-decoration: underline;
}

/* ── Seg ctrl ── */
.seg-ctrl {
    display: flex;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 3px;
    margin-bottom: 18px;
    gap: 3px;
}

.seg-btn {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-2);
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.seg-btn.active {
    background: var(--gold-alpha);
    color: var(--gold);
    border: 1px solid var(--gold-border);
}

/* ── Method Tabs ── */
.method-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
}

.method-btn {
    flex: 1;
    padding: 10px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface2);
    color: var(--text-2);
    font-family: var(--font);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.method-btn.active {
    background: var(--gold-alpha);
    border-color: var(--gold-border);
    color: var(--gold);
}

.price-input-row {
    display: flex;
}

.input-prefix {
    background: var(--surface3);
    border: 1px solid var(--border);
    border-right: none;
    border-radius: 10px 0 0 10px;
    padding: 14px;
    font-size: 20px;
    color: var(--gold);
    font-family: var(--mono);
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.price-input {
    border-radius: 0 10px 10px 0 !important;
}

/* ── Inputs ── */
.text-input {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-family: var(--font);
    font-size: 16px;
    font-weight: 500;
    padding: 6px 12px;
    width: 100%;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    appearance: none;
}

.text-input:focus {
    outline: none;
    border-color: var(--gold-border);
}

.text-input::placeholder {
    color: var(--text-3);
}

/* ── Buttons ── */
.primary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--gold);
    color: #1A1000;
    border: none;
    border-radius: 12px;
    padding: 14px 22px;
    font-size: 15px;
    font-weight: 700;
    font-family: var(--font);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.primary-btn:hover:not(:disabled) {
    filter: brightness(1.08);
    transform: translateY(-1px);
}

.primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.app:not(.dark) .primary-btn {
    color: #fff;
    background: var(--gold-dim);
}

.refresh-btn {
    flex-shrink: 0;
    padding: 14px 20px;
}

.full-btn {
    width: 100%;
}

.ghost-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: 12px;
    padding: 14px 18px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    transition: all 0.2s;
}

.ghost-btn:hover {
    border-color: var(--border-hi);
    color: var(--text);
}

.icon-btn-sm {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: 10px;
    font-size: 16px;
    cursor: pointer;
    min-height: var(--touch);
    min-width: var(--touch);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
}

.icon-btn-sm:hover {
    border-color: var(--gold-border);
}

.icon-btn-sm.danger:hover {
    border-color: var(--loss-border);
}

.spin {
    display: inline-block;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* ── Section ── */
.section-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--text);
    margin-bottom: 14px;
}

.section-title::before {
    content: '◈ ';
    color: var(--gold);
    font-size: 10px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
    flex-wrap: wrap;
}

.section-header .section-title {
    margin-bottom: 0;
}

.section-actions {
    display: flex;
    gap: 6px;
}

/* ── Converter ── */
.conv-tabs-scroll {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
    margin-bottom: 12px;
}

.conv-tabs-scroll::-webkit-scrollbar {
    display: none;
}

.conv-tab {
    padding: 10px 14px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-2);
    font-family: var(--font);
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}

.conv-tab.active {
    background: var(--gold-alpha);
    border-color: var(--gold-border);
    color: var(--gold);
}

.conv-input-row {
    display: flex;
    gap: 0;
    margin-bottom: 10px;
}

.from-badge {
    background: var(--gold-alpha);
    border: 1px solid var(--gold-border);
    border-right: none;
    border-radius: 10px 0 0 10px;
    padding: 14px;
    color: var(--gold);
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    white-space: nowrap;
    flex-shrink: 0;
}

.conv-input {
    border-radius: 0 10px 10px 0 !important;
    font-size: 18px !important;
    font-family: var(--mono) !important;
}

.conv-results {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
}

.conv-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    gap: 8px;
}

.conv-row:last-child {
    border-bottom: none;
}

.conv-label {
    font-size: 14px;
    color: var(--text-2);
    font-weight: 500;
}

.conv-val {
    font-size: 14px;
    font-family: var(--mono);
    font-weight: 600;
    color: var(--text);
}

/* ── Unit Grid ── */
.unit-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.unit-tile {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.2s;
}

.unit-tile:hover {
    border-color: var(--gold-border);
}

.tile-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tile-name {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.tile-gram {
    font-size: 10px;
    color: var(--text-3);
    font-family: var(--mono);
}

.tile-price {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── Add Button ── */
.add-purchase-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    background: var(--surface2);
    border: 1.5px dashed var(--border-hi);
    border-radius: 14px;
    color: var(--text-2);
    font-family: var(--font);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    padding: 16px 20px;
    margin-bottom: 12px;
}

.add-purchase-btn:hover {
    border-color: var(--gold-border);
    color: var(--gold);
    background: var(--gold-alpha);
}

.add-icon {
    font-size: 22px;
    line-height: 1;
}

/* ── Purchase Form ── */
.purchase-form {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.form-field label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.07em;
}

/* ── Purchase Cards ── */
.purchases-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
}

.p-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    transition: all 0.2s;
    border-left: 3px solid var(--border);
}

.pcard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 8px;
}

.pcard-weight-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.pcard-weight {
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
    font-variant-numeric: tabular-nums;
}

.pcard-unit {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
}

.pcard-date {
    font-size: 11px;
    color: var(--text-3);
    font-family: var(--mono);
}

.pcard-btns {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

.pcard-btn {
    background: var(--surface3);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    min-height: 40px;
    min-width: 40px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.pcard-btn:hover {
    border-color: var(--gold-border);
    color: var(--gold);
}

.pcard-btn.danger:hover {
    border-color: var(--loss-border);
    color: var(--loss);
}

.gl-row {
    display: flex;
    align-items: stretch;
}

.gl-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 0 4px;
}

.gl-col:first-child {
    padding-left: 0;
}

.gl-col:last-child {
    padding-right: 0;
}

.gl-divider {
    width: 1px;
    background: var(--border);
    flex-shrink: 0;
    margin: 0 4px;
}

.gl-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.gl-val {
    font-size: 13px;
    font-weight: 700;
    font-family: var(--mono);
    color: var(--text);
}

.gl-main {
    font-size: 14px;
}

.gain-text {
    color: var(--gain) !important;
}

.loss-text {
    color: var(--loss) !important;
}

.edit-actions {
    display: flex;
    gap: 8px;
}

/* ── Hero price meta ── */
.hero-price-block {
    margin-bottom: 14px;
}

.hero-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.metal-tag {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
    letter-spacing: 0.04em;
}

.last-updated {
    font-size: 11px;
    color: var(--text-3);
    font-family: var(--mono);
}

.last-updated-wrap {
    display: flex;
    align-items: center;
    gap: 5px;
}

.live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gain);
    flex-shrink: 0;
    animation: livePulse 1.4s ease-in-out infinite;
}

@keyframes livePulse {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.4;
        transform: scale(0.7);
    }
}


/* ── Price flash ── */
.digit-ticker.flash-up {
    animation: flashUp 0.65s ease forwards;
}

.digit-ticker.flash-down {
    animation: flashDown 0.65s ease forwards;
}

@keyframes flashUp {
    0% {
        filter: drop-shadow(0 0 12px rgba(34, 197, 94, .7));
    }

    40% {
        filter: drop-shadow(0 0 20px rgba(34, 197, 94, .5));
    }

    100% {
        filter: none;
    }
}

@keyframes flashDown {
    0% {
        filter: drop-shadow(0 0 12px rgba(248, 113, 113, .7));
    }

    40% {
        filter: drop-shadow(0 0 20px rgba(248, 113, 113, .5));
    }

    100% {
        filter: none;
    }
}

/* ── Change pill ── */
.price-bottom-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 2px;
}

.change-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    font-family: var(--mono);
}

.change-pill.up {
    background: var(--gain-bg);
    color: var(--gain);
    border: 1px solid var(--gain-border);
}

.change-pill.down {
    background: var(--loss-bg);
    color: var(--loss);
    border: 1px solid var(--loss-border);
}

.pill-pop-enter-active {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.pill-pop-leave-active {
    transition: all 0.2s ease;
}

.pill-pop-enter-from {
    opacity: 0;
    transform: translateY(6px) scale(0.85);
}

.pill-pop-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* ── Orb color shift ── */
.orb.orb-up {
    background: #22C55E !important;
    transition: background 1.8s ease;
}

.orb.orb-down {
    background: #F87171 !important;
    transition: background 1.8s ease;
}

.orb-1 {
    transition: background 1.8s ease;
}

.orb-2 {
    transition: background 1.8s ease;
}

/* ── Button ripple ── */
.refresh-btn {
    overflow: hidden;
}

@keyframes rippleAnim {
    to {
        transform: scale(4);
        opacity: 0;
    }
}


/* ── Purchase card slide-in ── */
.slide-in-card {
    animation: slideInCard 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideInCard {
    from {
        opacity: 0;
        transform: translateX(-18px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.live-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--gain);
    background: var(--gain-bg);
    border: 1px solid var(--gain-border);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: var(--mono);
}

/* ── Summary ── */
.summary {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
}

.sum-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
}

.sum-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
}

.sum-item.gain {
    background: var(--gain-bg);
    border-color: var(--gain-border);
    border-left: 3px solid var(--gain);
}

.sum-item.loss {
    background: var(--loss-bg);
    border-color: var(--loss-border);
    border-left: 3px solid var(--loss);
}

.sum-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sum-val {
    font-size: clamp(12px, 3.5vw, 16px);
    font-weight: 800;
    color: var(--text);
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sum-item.gain .sum-val {
    color: var(--gain);
}

.sum-item.loss .sum-val {
    color: var(--loss);
}

/* ── Liquid portfolio bar ── */
.portfolio-bar {
    height: 6px;
    background: var(--surface3);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 6px;
}

.liquid-fill {
    height: 100%;
    border-radius: 3px;
    position: relative;
    overflow: hidden;
    transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.liquid-fill.gain {
    background: var(--gain);
}

.liquid-fill.loss {
    background: var(--loss);
}

.liquid-fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 40px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: liquidWave 1.6s ease-in-out infinite;
}

@keyframes liquidWave {
    0% {
        transform: translateX(-200%);
    }

    100% {
        transform: translateX(400%);
    }
}

.portfolio-pct {
    font-size: 12px;
    font-weight: 700;
    text-align: right;
    font-family: var(--mono);
}

.portfolio-pct.gain {
    color: var(--gain);
}

.portfolio-pct.loss {
    color: var(--loss);
}

/* ── Empty State ── */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 32px 20px;
    background: var(--surface2);
    border-radius: 12px;
    border: 1.5px dashed var(--border);
}

.empty-icon {
    font-size: 24px;
    color: var(--text-3);
}

.empty-state p {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 500;
    text-align: center;
}

/* ── Footer ── */
.footer {
    text-align: center;
    padding: 20px 16px;
    font-size: 11px;
    color: var(--text-3);
    font-weight: 500;
    border-top: 1px solid var(--border);
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.3s ease;
    overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
    max-height: 700px;
}

/* ── Responsive ── */
@media (min-width: 480px) {
    .main {
        padding: 16px 16px 72px;
    }

    .unit-grid {
        grid-template-columns: repeat(6, 1fr);
    }

    .chips-scroll {
        overflow: visible;
        flex-wrap: wrap;
    }

    .form-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .purchases-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
    }

    .summary .sum-row {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (min-width: 640px) {
    .card {
        padding: 22px 20px;
    }

    .header-inner {
        padding: 12px 20px;
    }
}

/* ── Screensaver ── */
.screensaver {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: #08080F;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
}

.ss-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
}

.ss-orb1 {
    width: 360px;
    height: 360px;
    background: #F5C842;
    opacity: 0.08;
    top: -80px;
    right: -60px;
    animation: ssOrb 12s ease-in-out infinite alternate;
}

.ss-orb2 {
    width: 260px;
    height: 260px;
    background: #A07020;
    opacity: 0.07;
    bottom: -40px;
    left: -40px;
    animation: ssOrb 16s ease-in-out infinite alternate-reverse;
}

.ss-orb3 {
    width: 160px;
    height: 160px;
    background: #F5C842;
    opacity: 0.05;
    bottom: 30%;
    right: 10%;
    animation: ssOrb 20s ease-in-out infinite alternate;
}

@keyframes ssOrb {
    from {
        transform: translate(0, 0) scale(1);
    }

    to {
        transform: translate(24px, 32px) scale(1.15);
    }
}

.ss-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 1;
}

.ss-gem {
    font-size: 28px;
    color: rgba(245, 200, 66, 0.4);
    animation: ssGemPulse 4s ease-in-out infinite;
    margin-bottom: 4px;
}

@keyframes ssGemPulse {

    0%,
    100% {
        opacity: 0.4;
        transform: scale(1);
    }

    50% {
        opacity: 0.8;
        transform: scale(1.08);
    }
}

.ss-time {
    font-size: clamp(56px, 16vw, 96px);
    font-weight: 800;
    color: #F5C842;
    letter-spacing: -3px;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    animation: ssTimePulse 2s ease-in-out infinite;
}

@keyframes ssTimePulse {

    0%,
    100% {
        opacity: 1;
    }

    49% {
        opacity: 1;
    }

    50% {
        opacity: 0.6;
    }

    51% {
        opacity: 1;
    }
}

.ss-price {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-top: 6px;
}

.ss-price-val {
    font-size: clamp(22px, 6vw, 36px);
    font-weight: 800;
    color: rgba(245, 200, 66, 0.85);
    font-family: var(--mono);
    letter-spacing: -1px;
}

.ss-price-unit {
    font-size: 11px;
    color: rgba(245, 200, 66, 0.35);
    font-family: var(--mono);
    letter-spacing: 0.2em;
}

.ss-date {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.2);
    font-family: var(--font);
    margin-top: 4px;
    letter-spacing: 0.04em;
}

.ss-tap {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.12);
    letter-spacing: 0.2em;
    font-family: var(--mono);
    margin-top: 24px;
    animation: ssTapBlink 3s ease-in-out infinite;
}

@keyframes ssTapBlink {

    0%,
    100% {
        opacity: 0.12;
    }

    50% {
        opacity: 0.35;
    }
}

.ss-fade-enter-active {
    transition: opacity 0.5s ease;
}

.ss-fade-leave-active {
    transition: opacity 0.4s ease;
}

.ss-fade-enter-from,
.ss-fade-leave-to {
    opacity: 0;
}

/* ── Confetti Canvas ── */
.confetti-canvas {
    position: fixed;
    inset: 0;
    z-index: 998;
    pointer-events: none;
    display: none;
    width: 100%;
    height: 100%;
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
    .main {
        padding-bottom: calc(72px + env(safe-area-inset-bottom));
    }

    .header {
        padding-top: env(safe-area-inset-top);
    }
}
</style>