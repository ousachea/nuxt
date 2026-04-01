<template>
    <div class="app" :class="{ dark: isDark }">
        <!-- Ambient Background -->
        <div class="ambient" aria-hidden="true">
            <div class="orb orb-1" />
            <div class="orb orb-2" />
        </div>

        <!-- Header -->
        <header class="header">
            <div class="header-inner">
                <div class="logo">
                    <span class="logo-gem">◈</span>
                    <div class="logo-text">
                        <span class="logo-title">{{ t.title }}</span>
                        <span class="logo-sub">gold portfolio tracker</span>
                    </div>
                </div>
                <div class="header-controls">
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

        <!-- Sticky Price Pill (visible when scrolled) -->
        <div class="sticky-price" :class="{ visible: showStickyPrice && goldPrice }">
            <span class="sticky-gem">◈</span>
            <span class="sticky-val">${{ goldPrice?.toFixed(2) ?? '——' }}</span>
            <span class="sticky-unit">/ oz</span>
            <button class="sticky-refresh" @click="fetchPrice" :disabled="loading">↻</button>
        </div>

        <main class="main">

            <!-- ── PRICE SECTION ── -->
            <section class="card price-hero">
                <div class="card-accent" />

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
                        <span v-if="lastUpdated && priceSource === 'api'" class="last-updated">{{ lastUpdated }}</span>
                    </div>
                    <transition name="price-flip" mode="out-in">
                        <div class="hero-price" :key="goldPrice?.toFixed(0) ?? 'null'">
                            <span class="price-dollar">$</span>
                            <span class="price-int">{{ goldPrice ? Math.floor(goldPrice).toLocaleString() : '——'
                                }}</span>
                            <span v-if="goldPrice" class="price-dec">.{{ (goldPrice % 1).toFixed(2).slice(2) }}</span>
                        </div>
                    </transition>
                    <span class="price-unit-label">{{ t.perTroyOz }}</span>
                </div>

                <!-- Per-unit chips -->
                <div v-if="goldPrice" class="chips-scroll">
                    <div v-for="u in priceUnits" :key="u.key" class="chip">
                        <span class="chip-label">{{ t[u.key] || u.label }}</span>
                        <span class="chip-price">${{ u.price < 1 ? u.price.toFixed(4) : u.price.toFixed(2) }}</span>
                    </div>
                </div>

                <!-- Loading -->
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
                        <button class="primary-btn refresh-btn" @click="fetchPrice" :disabled="loading">
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

                <!-- FAB-style Add Button -->
                <button class="add-purchase-btn" @click="showForm = !showForm">
                    <span class="add-icon">{{ showForm ? '✕' : '+' }}</span>
                    <span>{{ showForm ? t.cancel : t.addPurchase }}</span>
                </button>

                <!-- Add Form -->
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

                <!-- Purchase Cards -->
                <div v-if="purchases.length" class="purchases-list">
                    <div v-for="(p, i) in purchases" :key="p.id" class="p-card" :style="{
        borderLeftColor: gainLoss(p) >= 0 ? 'var(--gain)' : 'var(--loss)',
        borderColor: gainLoss(p) >= 0 ? 'var(--gain-border)' : 'var(--loss-border)',
        background: gainLoss(p) >= 0 ? 'var(--gain-bg)' : 'var(--loss-bg)'
    }">
                        <template v-if="editIdx !== i">
                            <!-- Card Header -->
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
                            <!-- GL Bar -->
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
                        </template>

                        <!-- Edit Form -->
                        <template v-else>
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
                        </template>
                    </div>
                </div>

                <!-- Portfolio Summary -->
                <div v-if="purchases.length" class="summary">
                    <div class="sum-row">
                        <div class="sum-item">
                            <span class="sum-label">{{ t.totalInvested }}</span>
                            <span class="sum-val">${{ totalInvested.toFixed(2) }}</span>
                        </div>
                        <div class="sum-item" :class="totalGL >= 0 ? 'gain' : 'loss'">
                            <span class="sum-label">{{ t.currentValue }}</span>
                            <span class="sum-val">${{ totalCurrent.toFixed(2) }}</span>
                        </div>
                        <div class="sum-item" :class="totalGL >= 0 ? 'gain' : 'loss'">
                            <span class="sum-label">{{ t.totalGainLoss }}</span>
                            <span class="sum-val">{{ totalGL >= 0 ? '+' : '' }}${{ totalGL.toFixed(2) }}</span>
                        </div>
                    </div>
                    <!-- Mini progress bar showing gain/loss ratio -->
                    <div v-if="totalInvested > 0" class="portfolio-bar">
                        <div class="portfolio-fill" :class="totalGL >= 0 ? 'gain' : 'loss'"
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// ─── Constants ────────────────────────────────────────────────────────────────
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

// ─── i18n ────────────────────────────────────────────────────────────────────
const translations = {
    en: {
        title: 'Gold Tracker',
        gold: 'Gold',
        live: 'Live',
        custom: 'Custom',
        refresh: 'Refresh',
        loading: 'Loading…',
        pricesUpdated: '✓ Updated',
        perTroyOz: '/ troy oz',
        priceByUnit: 'Price by Unit',
        unitConverter: 'Unit Converter',
        myPurchases: 'My Purchases',
        addPurchase: 'Add Purchase',
        cancel: 'Cancel',
        weight: 'Weight',
        unit: 'Unit',
        pricePaid: 'Price Paid',
        date: 'Date',
        save: 'Save',
        edit: 'Edit',
        delete: 'Delete',
        paid: 'Paid',
        current: 'Current',
        gainLoss: 'G / L',
        portfolioSummary: 'Portfolio',
        totalInvested: 'Invested',
        currentValue: 'Value Now',
        totalGainLoss: 'Total G/L',
        exportCSV: 'Export',
        importCSV: 'Import',
        enterWeight: 'e.g. 2',
        enterPrice: 'e.g. 240',
        enterPriceFor: 'Price per',
        apiHint: 'Optional API key for higher rate limits',
        apiKeyPlaceholder: 'Paste goldapi.io key (optional)…',
        freeNoKey: 'Free, no key needed',
        asBackup: 'key as fallback',
        paste: 'Paste',
        clear: 'Clear',
        gram: 'Gram', li: 'Li', hun: 'Hun', chi: 'Chi',
        damlung: 'Damlung', troyOunce: 'Troy Oz', troyOz: 'Troy Oz',
        fetchPriceFirst: 'Fetch a price first',
        offlineWarning: 'You are offline — prices may be outdated',
        noPurchases: 'No purchases yet. Tap + Add above.',
    },
    km: {
        title: 'តាមដានមាស',
        gold: 'មាស',
        live: 'បន្តផ្ទាល់',
        custom: 'កំណត់ផ្ទាល់',
        refresh: 'ធ្វើបច្ចុប្បន្នភាព',
        loading: 'កំពុងផ្ទុក…',
        pricesUpdated: '✓ បានធ្វើបច្ចុប្បន្នភាព',
        perTroyOz: '/ ត្រយ អោន',
        priceByUnit: 'តម្លៃតាមឯកតា',
        unitConverter: 'បម្លែងឯកតា',
        myPurchases: 'ការទិញរបស់ខ្ញុំ',
        addPurchase: 'បន្ថែម',
        cancel: 'បោះបង់',
        weight: 'ទម្ងន់',
        unit: 'ឯកតា',
        pricePaid: 'តម្លៃបង់',
        date: 'កាលបរិច្ឆេទ',
        save: 'រក្សាទុក',
        edit: 'កែ',
        delete: 'លុប',
        paid: 'បង់',
        current: 'បច្ចុប្បន្ន',
        gainLoss: 'ចំណេញ/ខាត',
        portfolioSummary: 'សង្ខេប',
        totalInvested: 'វិនិយោគ',
        currentValue: 'តម្លៃ',
        totalGainLoss: 'ចំណេញ/ខាត',
        exportCSV: 'នាំចេញ',
        importCSV: 'នាំចូល',
        enterWeight: 'ឧ. ២',
        enterPrice: 'ឧ. ២៤០',
        enterPriceFor: 'តម្លៃ',
        apiHint: 'ស្រេចចិត្ត API key',
        apiKeyPlaceholder: 'បិទភ្ជាប់ goldapi.io key…',
        freeNoKey: 'ឥតគិតថ្លៃ',
        asBackup: 'key ជាបម្រុង',
        paste: 'បិទភ្ជាប់',
        clear: 'លុប',
        gram: 'ក្រាម', li: 'លី', hun: 'ហុន', chi: 'ជី',
        damlung: 'ដំឡឹង', troyOunce: 'ត្រយ អោន', troyOz: 'ត្រយ អោន',
        fetchPriceFirst: 'សូមទាញតម្លៃជាមុន',
        offlineWarning: '⚠ ក្រៅបណ្តាញ',
        noPurchases: 'មិនទាន់មានការទិញ។ ចុច + បន្ថែម',
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

// ─── Methods ─────────────────────────────────────────────────────────────────
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
function gainClass(p) { return gainLoss(p) >= 0 ? 'gain' : 'loss' }
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

async function fetchPrice() {
    loading.value = true
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
        lastUpdated.value = new Date().toLocaleTimeString()
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

function handleScroll() {
    // Show sticky price after scrolling past ~100px
    showStickyPrice.value = window.scrollY > 100
}

onMounted(() => {
    const d = load()
    if (d) {
        lang.value = d.lang || 'en'; isDark.value = d.isDark ?? true
        goldPrice.value = d.goldPrice || null; lastUpdated.value = d.lastUpdated || ''
        purchases.value = d.purchases || []; priceMethod.value = d.priceMethod || 'troyOz'
        customPrice.value = d.customPrice || null; customApiUrl.value = d.customApiUrl || ''
        priceSource.value = d.priceSource || 'api'
    }
    if (priceSource.value === 'api') fetchPrice()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('scroll', handleScroll, { passive: true })
})
onBeforeUnmount(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('scroll', handleScroll)
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

/* ── Design Tokens ── */
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

/* ── Dark theme (default) ── */
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

/* ── Light theme ── */
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

/* ── Base ── */
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

/* ── Ambient ── */
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

.app:not(.dark) .orb {
    opacity: 0.08;
}

@keyframes drift {
    from {
        transform: translate(0, 0) scale(1);
    }

    to {
        transform: translate(20px, 30px) scale(1.08);
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

.logo-gem {
    font-size: 22px;
    color: var(--gold);
    flex-shrink: 0;
    line-height: 1;
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

.sticky-gem {
    font-size: 12px;
    color: var(--gold);
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

.card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

/* ── Segmented Control ── */
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
    padding: 12px 12px;
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

/* ── Hero Price ── */
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

.hero-price {
    display: flex;
    align-items: baseline;
    gap: 2px;
    line-height: 1;
    margin-bottom: 4px;
    perspective: 400px;
}

.price-dollar {
    font-size: 28px;
    font-weight: 800;
    color: var(--gold);
    align-self: flex-start;
    margin-top: 4px;
}

.price-int {
    font-size: clamp(44px, 12vw, 72px);
    font-weight: 800;
    color: var(--gold);
    letter-spacing: -2px;
    font-variant-numeric: tabular-nums;
}

.price-dec {
    font-size: 22px;
    font-weight: 700;
    color: var(--gold-dim);
    letter-spacing: 0;
}

.price-unit-label {
    font-size: 12px;
    color: var(--text-3);
    font-family: var(--mono);
}

/* ── Chips ── */
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
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: var(--gain);
}

.flash.error {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
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
    padding: 14px 14px;
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

/* ── Shared Inputs ── */
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
    padding: 14px 14px;
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

.p-card.gain {
    border-color: var(--gain-border);
    background: var(--gain-bg);
    border-left-color: var(--gain);
}

.p-card.loss {
    border-color: var(--loss-border);
    background: var(--loss-bg);
    border-left-color: var(--loss);
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

/* GL Row — 3-column layout */
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
    padding: 10px 10px;
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

.portfolio-bar {
    height: 4px;
    background: var(--surface3);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
}

.portfolio-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.6s ease;
}

.portfolio-fill.gain {
    background: var(--gain);
}

.portfolio-fill.loss {
    background: var(--loss);
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
@keyframes priceFlipOut {
    to {
        opacity: 0;
        transform: translateY(10px) rotateX(20deg);
    }
}

@keyframes priceFlipIn {
    from {
        opacity: 0;
        transform: translateY(-10px) rotateX(-20deg);
    }

    to {
        opacity: 1;
        transform: translateY(0) rotateX(0);
    }
}

.price-flip-leave-active {
    animation: priceFlipOut 0.18s ease-in forwards;
}

.price-flip-enter-active {
    animation: priceFlipIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

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

/* ── Safe area (iPhone notch/home bar) ── */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
    .main {
        padding-bottom: calc(72px + env(safe-area-inset-bottom));
    }

    .header {
        padding-top: env(safe-area-inset-top);
    }
}
</style>