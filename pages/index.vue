<template>
    <div class="app" :class="{ 'dark': isDark }">
        <!-- Ambient Background -->
        <div class="ambient">
            <div class="orb orb-1" />
            <div class="orb orb-2" />
            <div class="orb orb-3" />
        </div>

        <!-- Header -->
        <header class="header">
            <div class="header-inner">
                <div class="logo">
                    <span class="logo-icon">◈</span>
                    <div>
                        <h1 class="logo-title">{{ t.title }}</h1>
                        <p class="logo-sub">Real-time portfolio tracker</p>
                    </div>
                </div>
                <div class="header-controls">
                    <button class="ctrl-btn" @click="toggleDark" :title="isDark ? 'Light mode' : 'Dark mode'">
                        {{ isDark ? '☀' : '◐' }}
                    </button>
                    <button class="ctrl-btn lang" @click="toggleLang">
                        {{ lang === 'en' ? 'ខ្មែរ' : 'EN' }}
                    </button>
                </div>
            </div>
            <div v-if="!isOnline" class="offline-bar">
                <span>◈</span> {{ t.offlineWarning }}
            </div>
        </header>

        <main class="main">
            <!-- Price Hero -->
            <section class="price-hero">
                <div class="price-tabs">
                    <button v-for="src in ['api', 'custom']" :key="src" class="ptab"
                        :class="{ active: priceSource === src }" @click="priceSource = src">
                        {{ src === 'api' ? '⬡ Live Price' : '✦ Custom' }}
                    </button>
                </div>

                <!-- Live Price Display -->
                <div class="gold-display">
                    <div class="gold-meta">
                        <span class="metal-label">🥇 {{ t.gold }}</span>
                        <span v-if="lastUpdated && priceSource === 'api'" class="update-time">{{ lastUpdated }}</span>
                    </div>
                    <div class="gold-price-row">
                        <transition name="price-flip" mode="out-in">
                            <span class="gold-price-value" :key="goldPrice">
                                {{ goldPrice ? '$' + goldPrice.toFixed(2) : '——' }}
                            </span>
                        </transition>
                        <span class="gold-price-unit">/ troy oz</span>
                    </div>

                    <!-- Per-unit strip -->
                    <div v-if="goldPrice" class="price-strip">
                        <div v-for="u in priceUnits" :key="u.key" class="strip-item">
                            <span class="strip-label">{{ t[u.key] || u.label }}</span>
                            <span class="strip-val">${{ u.price.toFixed(2) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Loading bar -->
                <div v-if="loading" class="load-bar">
                    <div class="load-fill" />
                </div>

                <!-- Success / Error -->
                <transition name="fade">
                    <div v-if="flashMsg" class="flash" :class="flashType">{{ flashMsg }}</div>
                </transition>

                <!-- API Source Panel -->
                <div v-if="priceSource === 'api'" class="api-panel">
                    <div class="api-panel-row">
                        <div class="api-panel-info">
                            <span class="api-badge">gold-api.com</span>
                            <span class="api-desc">Optional API key for higher limits</span>
                        </div>
                        <button class="refresh-btn" @click="fetchPrice" :disabled="loading">
                            <span class="spin-icon" :class="{ spinning: loading }">↻</span>
                            {{ loading ? t.loading : t.refreshNow }}
                        </button>
                    </div>
                    <div class="api-key-row">
                        <input v-model="customApiUrl" class="api-input" type="text"
                            placeholder="Paste API key (optional)…" />
                        <button class="paste-btn" @click="pasteClipboard">📋</button>
                        <button v-if="customApiUrl" class="clear-btn" @click="customApiUrl = ''; save()">✕</button>
                    </div>
                    <p class="api-hint">Live prices via <strong>gold-api.com</strong> (free, no key) · Optional: add a
                        <a href="https://www.goldapi.io/" target="_blank">goldapi.io</a> key as fallback</p>
                </div>

                <!-- Custom Price Panel -->
                <div v-if="priceSource === 'custom'" class="custom-panel">
                    <div class="method-tabs">
                        <button v-for="m in ['troyOz', 'damlung', 'chi']" :key="m" class="mtab"
                            :class="{ active: priceMethod === m }" @click="switchMethod(m)">
                            {{ m === 'troyOz' ? t.troyOunce : t[m] }}
                        </button>
                    </div>
                    <div class="custom-input-row">
                        <span class="input-prefix">$</span>
                        <input v-model.number="customPrice" class="custom-price-input" type="text" inputmode="decimal"
                            :placeholder="'Price per ' + (priceMethod === 'troyOz' ? 'Troy Oz' : priceMethod === 'damlung' ? 'Damlung' : 'Chi')"
                            @input="applyCustomPrice" />
                    </div>
                    <div v-if="goldPrice" class="custom-preview">
                        <div v-for="u in priceUnits" :key="u.key" class="prev-row">
                            <span>{{ t[u.key] || u.label }}</span>
                            <span>${{ u.price.toFixed(2) }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Converter -->
            <section class="section">
                <h2 class="section-title">{{ t.unitConverter }}</h2>
                <div class="conv-tabs">
                    <button v-for="u in converterUnits" :key="u" class="ctab" :class="{ active: activeConv === u }"
                        @click="activeConv = u">
                        {{ t[u] || u }}
                    </button>
                </div>
                <div class="conv-body">
                    <div class="conv-input-wrap">
                        <span class="conv-unit-badge">{{ t[activeConv] }}</span>
                        <input v-model.number="convInput" class="conv-input" type="text" inputmode="decimal"
                            :placeholder="'Enter ' + (t[activeConv] || activeConv)" />
                    </div>
                    <div class="conv-results">
                        <div v-for="u in converterUnits.filter(x => x !== activeConv)" :key="u" class="conv-row">
                            <span class="conv-label">{{ t[u] }}</span>
                            <span class="conv-val">{{ convertUnit(convInput || 0, activeConv, u) }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Price Grid -->
            <section class="section">
                <h2 class="section-title">{{ t.priceByUnit }}</h2>
                <div v-if="goldPrice" class="unit-grid">
                    <div v-for="u in allUnits" :key="u.key" class="unit-tile">
                        <span class="tile-name">{{ t[u.key] || u.label }}</span>
                        <span class="tile-price">${{ u.price.toFixed(2) }}</span>
                        <span class="tile-gram">{{ u.gram }}</span>
                    </div>
                </div>
                <div v-else class="empty-state">
                    <span class="empty-icon">◈</span>
                    <p>{{ t.fetchPriceFirst }}</p>
                </div>
            </section>

            <!-- Purchases -->
            <section class="section">
                <div class="section-header">
                    <h2 class="section-title">{{ t.myPurchases }}</h2>
                    <div class="header-actions">
                        <div class="io-row">
                            <button class="io-btn export" @click="exportCSV">↓ {{ t.exportCSV }}</button>
                            <button class="io-btn import" @click="csvInput.click()">↑ {{ t.importCSV }}</button>
                            <input ref="csvInput" type="file" accept=".csv" hidden @change="importCSV" />
                        </div>
                        <button class="add-btn" @click="showForm = !showForm">
                            {{ showForm ? t.cancel : t.addPurchase }}
                        </button>
                    </div>
                </div>

                <!-- Add Form -->
                <transition name="slide-down">
                    <div v-if="showForm" class="purchase-form">
                        <div class="form-grid">
                            <div class="fg">
                                <label>{{ t.weight }}</label>
                                <input v-model.number="draft.weight" type="text" inputmode="decimal"
                                    :placeholder="t.enterWeight" />
                            </div>
                            <div class="fg">
                                <label>{{ t.unit }}</label>
                                <select v-model="draft.unit">
                                    <option v-for="u in converterUnits" :key="u" :value="u">{{ t[u] || u }}</option>
                                </select>
                            </div>
                            <div class="fg">
                                <label>{{ t.pricePaid }} (USD)</label>
                                <input v-model.number="draft.price" type="text" inputmode="decimal"
                                    :placeholder="t.enterPrice" />
                            </div>
                            <div class="fg">
                                <label>{{ t.date }}</label>
                                <input v-model="draft.date" type="date" />
                            </div>
                        </div>
                        <button class="submit-btn" @click="addPurchase">✦ {{ t.save }}</button>
                    </div>
                </transition>

                <!-- Cards -->
                <div v-if="purchases.length" class="purchases-grid">
                    <div v-for="(p, i) in purchases" :key="p.id" class="p-card" :class="gainClass(p)">
                        <template v-if="editIdx !== i">
                            <div class="pcard-top">
                                <div class="pcard-weight">🥇 {{ p.weight }} {{ t[p.unit] || p.unit }}</div>
                                <div class="pcard-actions">
                                    <button class="icon-btn" @click="startEdit(i)">✎</button>
                                    <button class="icon-btn danger" @click="removePurchase(i)">✕</button>
                                </div>
                            </div>
                            <div class="pcard-rows">
                                <div class="pcard-row">
                                    <span>{{ t.paid }}</span>
                                    <span>${{ p.price.toFixed(2) }}</span>
                                </div>
                                <div class="pcard-row">
                                    <span>{{ t.current }}</span>
                                    <span class="current-val" :class="gainClass(p)">${{ currentValue(p).toFixed(2) }}</span>
                                </div>
                                <div class="pcard-row highlight" :class="gainClass(p)">
                                    <span>{{ t.gainLoss }}</span>
                                    <span>
                                        {{ gainLoss(p) >= 0 ? '+' : '' }}${{ gainLoss(p).toFixed(2) }}
                                    </span>
                                </div>
                            </div>
                            <span class="pcard-date">{{ formatDate(p.date) }}</span>
                        </template>
                        <template v-else>
                            <div class="edit-form">
                                <div class="form-grid">
                                    <div class="fg">
                                        <label>{{ t.weight }}</label>
                                        <input v-model.number="editDraft.weight" type="text" inputmode="decimal" />
                                    </div>
                                    <div class="fg">
                                        <label>{{ t.unit }}</label>
                                        <select v-model="editDraft.unit">
                                            <option v-for="u in converterUnits" :key="u" :value="u">{{ t[u] || u }}
                                            </option>
                                        </select>
                                    </div>
                                    <div class="fg">
                                        <label>{{ t.pricePaid }}</label>
                                        <input v-model.number="editDraft.price" type="text" inputmode="decimal" />
                                    </div>
                                    <div class="fg">
                                        <label>{{ t.date }}</label>
                                        <input v-model="editDraft.date" type="date" />
                                    </div>
                                </div>
                                <div class="edit-actions">
                                    <button class="submit-btn" @click="saveEdit">{{ t.save }}</button>
                                    <button class="cancel-edit-btn" @click="editIdx = null">{{ t.cancel }}</button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Portfolio Summary -->
                <div v-if="purchases.length" class="summary">
                    <h3>{{ t.portfolioSummary }}</h3>
                    <div class="summary-grid">
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
                            <span class="sum-val">
                                {{ totalGL >= 0 ? '+' : '' }}${{ totalGL.toFixed(2) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div v-else-if="!showForm" class="empty-state">
                    <span class="empty-icon">◈</span>
                    <p>No purchases yet. Add your first one above.</p>
                </div>
            </section>
        </main>

        <footer class="footer">
            <p>Gold Tracker · Built with Nuxt 3 · Prices in USD</p>
        </footer>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// ─── Constants ───────────────────────────────────────────────────────────────
const TROY = 31.1035
const DAMLUNG = 37.5
const CHI = 3.75
const HUN = 0.375
const LI = 0.0375

const converterUnits = ['li', 'hun', 'chi', 'gram', 'damlung', 'troyOz']

// ─── State ───────────────────────────────────────────────────────────────────
const lang = ref('en')
const isDark = ref(false)
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
const activeConv = ref('gram')
const convInput = ref(1)
const showForm = ref(false)
const purchases = ref([])
const draft = ref({ weight: '', unit: 'chi', price: '', date: today() })
const editIdx = ref(null)
const editDraft = ref({})
const csvInput = ref(null)

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
    en: {
        title: 'Gold Tracker',
        gold: 'Gold',
        currentPrice: 'Current Prices',
        refreshNow: 'Refresh',
        loading: 'Loading…',
        pricesUpdated: '✓ Prices updated',
        perTroyOz: '/ troy oz',
        lastUpdated: 'Updated',
        priceByUnit: 'Price by Unit',
        unitConverter: 'Unit Converter',
        from: 'From',
        myPurchases: 'My Purchases',
        addPurchase: '+ Add',
        cancel: 'Cancel',
        weight: 'Weight',
        unit: 'Unit',
        pricePaid: 'Price Paid',
        date: 'Date',
        save: 'Save',
        paid: 'Paid',
        current: 'Current',
        gainLoss: 'Gain / Loss',
        portfolioSummary: 'Portfolio Summary',
        totalInvested: 'Total Invested',
        currentValue: 'Current Value',
        totalGainLoss: 'Total G/L',
        exportCSV: 'Export CSV',
        importCSV: 'Import CSV',
        enterWeight: 'e.g. 2',
        enterPrice: 'e.g. 240',
        gram: 'Gram', li: 'Li', hun: 'Hun', chi: 'Chi',
        damlung: 'Damlung', troyOunce: 'Troy Oz', troyOz: 'Troy Oz',
        fetchPriceFirst: 'Fetch price first',
        offlineWarning: 'You are offline. Prices may be outdated.',
    },
    km: {
        title: 'តាមដានមាស',
        gold: 'មាស',
        currentPrice: 'តម្លៃបច្ចុប្បន្ន',
        refreshNow: 'ធ្វើបច្ចុប្បន្នភាព',
        loading: 'កំពុងផ្ទុក…',
        pricesUpdated: '✓ បានធ្វើបច្ចុប្បន្នភាព',
        perTroyOz: '/ ត្រយ អោន',
        lastUpdated: 'ធ្វើបច្ចុប្បន្នភាព',
        priceByUnit: 'តម្លៃតាមឯកតា',
        unitConverter: 'បម្លែងឯកតា',
        from: 'ពី',
        myPurchases: 'ការទិញរបស់ខ្ញុំ',
        addPurchase: '+ បន្ថែម',
        cancel: 'បោះបង់',
        weight: 'ទម្ងន់',
        unit: 'ឯកតា',
        pricePaid: 'តម្លៃបង់',
        date: 'កាលបរិច្ឆេទ',
        save: 'រក្សា',
        paid: 'បង់',
        current: 'បច្ចុប្បន្ន',
        gainLoss: 'ចំណេញ/ខាត',
        portfolioSummary: 'សង្ខេប',
        totalInvested: 'វិនិយោគសរុប',
        currentValue: 'តម្លៃបច្ចុប្បន្ន',
        totalGainLoss: 'ចំណេញ/ខាតសរុប',
        exportCSV: 'នាំចេញ CSV',
        importCSV: 'នាំចូល CSV',
        enterWeight: 'ឧ. ២',
        enterPrice: 'ឧ. ២៤០',
        gram: 'ក្រាម', li: 'លី', hun: 'ហុន', chi: 'ជី',
        damlung: 'ដំឡឹង', troyOunce: 'ត្រយ អោន', troyOz: 'ត្រយ អោន',
        fetchPriceFirst: 'សូមទាញតម្លៃជាមុន',
        offlineWarning: '⚠ អ្នកស្ថិតក្រៅបណ្តាញ',
    }
}

const t = computed(() => translations[lang.value])

// ─── Price computations ───────────────────────────────────────────────────────
const pricePerGram = computed(() => goldPrice.value ? goldPrice.value / TROY : 0)
const priceLi = computed(() => pricePerGram.value * LI)
const priceHun = computed(() => pricePerGram.value * HUN)
const priceChi = computed(() => pricePerGram.value * CHI)
const priceDamlung = computed(() => pricePerGram.value * DAMLUNG)

const priceUnits = computed(() => [
    { key: 'li', label: 'Li', price: priceLi.value },
    { key: 'hun', label: 'Hun', price: priceHun.value },
    { key: 'chi', label: 'Chi', price: priceChi.value },
    { key: 'gram', label: 'Gram', price: pricePerGram.value },
    { key: 'damlung', label: 'Damlung', price: priceDamlung.value },
    { key: 'troyOz', label: 'Troy Oz', price: goldPrice.value || 0 },
])

const allUnits = computed(() => [
    { key: 'li', label: 'Li', price: priceLi.value, gram: '0.0375g' },
    { key: 'hun', label: 'Hun', price: priceHun.value, gram: '0.375g' },
    { key: 'chi', label: 'Chi', price: priceChi.value, gram: '3.75g' },
    { key: 'gram', label: 'Gram', price: pricePerGram.value, gram: '1g' },
    { key: 'damlung', label: 'Damlung', price: priceDamlung.value, gram: '37.5g' },
    { key: 'troyOz', label: 'Troy Oz', price: goldPrice.value || 0, gram: '31.1g' },
])

// ─── Portfolio computations ───────────────────────────────────────────────────
const totalInvested = computed(() => purchases.value.reduce((s, p) => s + p.price, 0))
const totalCurrent = computed(() => purchases.value.reduce((s, p) => s + currentValue(p), 0))
const totalGL = computed(() => totalCurrent.value - totalInvested.value)

// ─── Methods ──────────────────────────────────────────────────────────────────
function today() {
    return new Date().toISOString().split('T')[0]
}

function toggleLang() {
    lang.value = lang.value === 'en' ? 'km' : 'en'
    save()
}

function toggleDark() {
    isDark.value = !isDark.value
    save()
}

function toGrams(weight, unit) {
    const map = { li: LI, hun: HUN, chi: CHI, gram: 1, damlung: DAMLUNG, troyOz: TROY }
    return weight * (map[unit] || 1)
}

function fromGrams(grams, unit) {
    const map = { li: LI, hun: HUN, chi: CHI, gram: 1, damlung: DAMLUNG, troyOz: TROY }
    return grams / (map[unit] || 1)
}

function convertUnit(val, from, to) {
    return fromGrams(toGrams(val, from), to).toFixed(4)
}

function currentValue(p) {
    if (!goldPrice.value) return 0
    return pricePerGram.value * toGrams(p.weight, p.unit)
}

function gainLoss(p) {
    return currentValue(p) - p.price
}

function gainClass(p) {
    return gainLoss(p) >= 0 ? 'gain' : 'loss'
}

function formatDate(d) {
    return new Date(d).toLocaleDateString()
}

function flash(msg, type = 'success') {
    flashMsg.value = msg
    flashType.value = type
    setTimeout(() => flashMsg.value = '', 3000)
}

function switchMethod(m) {
    priceMethod.value = m
    customPrice.value = null
    goldPrice.value = null
    save()
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
    } catch {
        flash('Allow clipboard access or paste manually (Ctrl+V)', 'error')
    }
}

async function fetchPrice() {
    loading.value = true
    let ok = false
    const errors = []

    // 1. gold-api.com — free, no key, CORS enabled, no rate limit
    if (!ok) {
        try {
            const r = await fetch('https://api.gold-api.com/price/XAU', { mode: 'cors' })
            if (r.ok) {
                const d = await r.json()
                const p = d?.price ?? d?.ask ?? d?.bid
                if (p && !isNaN(p)) { goldPrice.value = parseFloat(p); ok = true }
                else errors.push('gold-api.com: unexpected shape — ' + JSON.stringify(d).slice(0, 80))
            } else {
                errors.push('gold-api.com: HTTP ' + r.status)
            }
        } catch (e) {
            errors.push('gold-api.com: ' + e.message)
        }
    }

    // 2. goldapi.io — requires user-supplied API key
    if (!ok && customApiUrl.value?.trim()) {
        try {
            const r = await fetch('https://www.goldapi.io/api/XAU/USD', {
                headers: { 'x-access-token': customApiUrl.value.trim(), 'Accept': 'application/json' },
                mode: 'cors'
            })
            if (r.ok) {
                const d = await r.json()
                if (d?.price) { goldPrice.value = parseFloat(d.price); ok = true }
                else errors.push('goldapi.io: unexpected shape — ' + JSON.stringify(d).slice(0, 80))
            } else {
                errors.push('goldapi.io: HTTP ' + r.status)
            }
        } catch (e) {
            errors.push('goldapi.io: ' + e.message)
        }
    }

    if (ok) {
        lastUpdated.value = new Date().toLocaleTimeString()
        save()
        flash(t.value.pricesUpdated)
    } else {
        console.warn('[GoldTracker] fetchPrice failed:', errors)
        const cached = load()?.goldPrice
        if (cached) {
            goldPrice.value = cached
            lastUpdated.value = (load()?.lastUpdated || '') + ' (cached)'
            flash('Using cached price — live fetch failed', 'error')
        } else {
            flash('Could not fetch price. Try Custom mode or paste a goldapi.io key.', 'error')
        }
    }
    loading.value = false
}

// ─── Purchases ────────────────────────────────────────────────────────────────
function addPurchase() {
    if (!draft.value.weight || !draft.value.price) {
        flash('Please fill in weight and price', 'error'); return
    }
    purchases.value.push({ ...draft.value, id: Date.now() })
    draft.value = { weight: '', unit: 'chi', price: '', date: today() }
    showForm.value = false
    save()
}

function startEdit(i) {
    editIdx.value = i
    editDraft.value = { ...purchases.value[i] }
}

function saveEdit() {
    if (!editDraft.value.weight || !editDraft.value.price) {
        flash('Fill in weight and price', 'error'); return
    }
    purchases.value[editIdx.value] = { ...editDraft.value }
    editIdx.value = null
    save()
}

function removePurchase(i) {
    if (confirm('Delete this purchase?')) {
        purchases.value.splice(i, 1)
        save()
    }
}

function exportCSV() {
    const hdr = ['Weight', 'Unit', 'Paid', 'Date']
    const rows = purchases.value.map(p => [
        p.weight, p.unit, p.price.toFixed(2), p.date
    ])
    const csv = [hdr, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `gold-${today()}.csv`
    a.click()
}

function importCSV(e) {
    const file = e.target?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
        try {
            const text = evt.target.result
            const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
            if (lines.length < 2) { flash('CSV is empty or has no data rows', 'error'); return }

            // Parse header to find column indices
            const hdr = lines[0].split(',').map(h => h.trim().toLowerCase())
            const wi = hdr.indexOf('weight')
            const ui = hdr.indexOf('unit')
            const pi = hdr.indexOf('paid')
            const di = hdr.indexOf('date')

            if (wi === -1 || pi === -1) {
                flash('CSV must have "Weight" and "Paid" columns', 'error'); return
            }

            let added = 0
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim())
                const weight = parseFloat(cols[wi])
                const price = parseFloat(cols[pi])
                if (isNaN(weight) || isNaN(price)) continue

                const unit = (ui !== -1 && converterUnits.includes(cols[ui])) ? cols[ui] : 'chi'
                const date = (di !== -1 && cols[di]) ? cols[di] : today()

                purchases.value.push({ weight, unit, price, date, id: Date.now() + i })
                added++
            }

            if (added > 0) {
                save()
                flash(`✓ Imported ${added} purchase${added > 1 ? 's' : ''}`)
            } else {
                flash('No valid rows found in CSV', 'error')
            }
        } catch {
            flash('Failed to parse CSV file', 'error')
        }
    }
    reader.readAsText(file)
    // Reset input so the same file can be re-imported
    e.target.value = ''
}

// ─── Storage ──────────────────────────────────────────────────────────────────
function save() {
    try {
        localStorage.setItem('gt3', JSON.stringify({
            lang: lang.value, isDark: isDark.value,
            goldPrice: goldPrice.value, lastUpdated: lastUpdated.value,
            purchases: purchases.value,
            priceMethod: priceMethod.value, customPrice: customPrice.value,
            customApiUrl: customApiUrl.value, priceSource: priceSource.value,
        }))
    } catch { }
}

function load() {
    try { return JSON.parse(localStorage.getItem('gt3') || 'null') } catch { return null }
}

// ─── Network ──────────────────────────────────────────────────────────────────
function handleOnline() { isOnline.value = true; fetchPrice() }
function handleOffline() { isOnline.value = false }

onMounted(() => {
    const d = load()
    if (d) {
        lang.value = d.lang || 'en'
        isDark.value = d.isDark || false
        goldPrice.value = d.goldPrice || null
        lastUpdated.value = d.lastUpdated || ''
        purchases.value = d.purchases || []
        priceMethod.value = d.priceMethod || 'troyOz'
        customPrice.value = d.customPrice || null
        customApiUrl.value = d.customApiUrl || ''
        priceSource.value = d.priceSource || 'api'
    }
    if (priceSource.value === 'api') fetchPrice()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
})

onBeforeUnmount(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

*,
*::before,
*::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

:root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #18181f;
    --surface3: #1e1e28;
    --border: rgba(255, 255, 255, 0.08);
    --border-hi: rgba(255, 200, 60, 0.3);
    --text: #f0ede8;
    --text-2: #a09a90;
    --text-3: #6a6460;
    --gold: #f5c842;
    --gold-dim: #c9971a;
    --gold-glow: rgba(245, 200, 66, 0.15);
    --gain: #22c55e;
    --loss: #ef4444;
    --card-gain-bg: rgba(34, 197, 94, 0.06);
    --card-loss-bg: rgba(239, 68, 68, 0.06);
    --radius: 14px;
    --font-head: 'Plus Jakarta Sans', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, monospace;

    /* ── Primary button tokens ── */
    --btn-primary-bg: #f5c842;
    --btn-primary-text: #1a1400;
    --btn-primary-hover: #ffd94a;
}

.app.dark {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #18181f;
    --surface3: #1e1e28;
    --border: rgba(255, 255, 255, 0.08);
    --text: #f4f1ec;
    --text-2: #b8b0a4;
    --text-3: #7a7268;
    --btn-primary-bg: #f5c842;
    --btn-primary-text: #1a1400;
    --btn-primary-hover: #ffd94a;
    --card-gain-bg: rgba(34, 197, 94, 0.08);
    --card-loss-bg: rgba(239, 68, 68, 0.08);
}

.app:not(.dark) {
    --bg: #f5f2ec;
    --surface: #ffffff;
    --surface2: #f8f5ef;
    --surface3: #ece9e0;
    --border: rgba(0, 0, 0, 0.1);
    --border-hi: rgba(180, 130, 0, 0.3);
    --text: #141210;
    --text-2: #52504a;
    --text-3: #888077;
    --gold-glow: rgba(200, 150, 0, 0.1);

    /* ── Light-mode buttons: darker amber for contrast ── */
    --btn-primary-bg: #b8860b;
    --btn-primary-text: #ffffff;
    --btn-primary-hover: #d49a0e;
    --card-gain-bg: rgba(34, 197, 94, 0.1);
    --card-loss-bg: rgba(239, 68, 68, 0.1);
}

html,
body {
    height: 100%;
}

.app {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-head);
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    position: relative;
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
    filter: blur(80px);
    opacity: 0.18;
}

.orb-1 {
    width: 500px;
    height: 500px;
    background: #f5c842;
    top: -150px;
    right: -100px;
    animation: drift 12s ease-in-out infinite alternate;
}

.orb-2 {
    width: 350px;
    height: 350px;
    background: #a07820;
    bottom: 30%;
    left: -80px;
    animation: drift 16s ease-in-out infinite alternate-reverse;
}

.orb-3 {
    width: 200px;
    height: 200px;
    background: #c0902a;
    bottom: 10%;
    right: 10%;
    animation: drift 9s ease-in-out infinite alternate;
}

@keyframes drift {
    from {
        transform: translateY(0) scale(1);
    }

    to {
        transform: translateY(40px) scale(1.1);
    }
}

.app:not(.dark) .orb {
    opacity: 0.12;
}

/* ── Header ── */
.header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10, 10, 15, 0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
}

.app:not(.dark) .header {
    background: rgba(245, 242, 236, 0.92);
}

.header-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    display: flex;
    gap: 12px;
    align-items: center;
}

.logo-icon {
    font-size: 28px;
    color: var(--gold);
    line-height: 1;
}

.logo-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.3px;
    line-height: 1.2;
}

.logo-sub {
    font-size: 12px;
    color: var(--text-2);
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
    margin-top: 2px;
}

.header-controls {
    display: flex;
    gap: 8px;
}

.ctrl-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 14px;
    font-family: var(--font-head);
    cursor: pointer;
    transition: all 0.2s;
    min-height: 38px;
}

.ctrl-btn:hover {
    border-color: var(--gold);
    color: var(--gold);
}

.ctrl-btn.lang {
    font-size: 12px;
}

.offline-bar {
    text-align: center;
    padding: 8px;
    font-size: 13px;
    background: rgba(245, 200, 66, 0.15);
    color: var(--gold);
    border-top: 1px solid var(--border-hi);
    font-family: var(--font-head);
    font-weight: 600;
}

/* ── Main ── */
.main {
    position: relative;
    z-index: 1;
    max-width: 900px;
    margin: 0 auto;
    padding: 24px 16px 48px;
}

/* ── Price Hero ── */
.price-hero {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
}

.price-hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.price-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 24px;
}

.ptab {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-2);
    font-family: var(--font-head);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 40px;
}

.ptab.active {
    background: var(--gold-glow);
    border-color: var(--border-hi);
    color: var(--gold);
    font-weight: 500;
}

.gold-display {
    margin-bottom: 20px;
}

.gold-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.metal-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
    letter-spacing: 0.04em;
}

.update-time {
    font-size: 12px;
    color: var(--text-3);
    font-family: var(--font-mono);
}

.gold-price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.gold-price-value {
    font-size: clamp(36px, 8vw, 68px);
    font-weight: 800;
    color: var(--gold);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -1px;
}

.gold-price-unit {
    font-size: 14px;
    color: var(--text-3);
    font-family: var(--font-mono);
}

.price-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

@media (min-width: 480px) {
    .price-strip {
        grid-template-columns: repeat(6, 1fr);
    }
}

.strip-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: var(--surface2);
    border: 1px solid var(--border);
    padding: 10px 12px;
    border-radius: 8px;
}

.strip-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.strip-val {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    font-family: var(--font-mono);
}

/* ── Load Bar ── */
.load-bar {
    height: 3px;
    background: var(--surface3);
    border-radius: 2px;
    overflow: hidden;
    margin: 12px 0;
}

.load-fill {
    height: 100%;
    background: var(--gold);
    animation: loadAnim 1.5s ease-in-out infinite;
}

@keyframes loadAnim {
    0% {
        width: 0;
        margin-left: 0;
    }

    50% {
        width: 60%;
        margin-left: 20%;
    }

    100% {
        width: 0;
        margin-left: 100%;
    }
}

/* ── Flash ── */
.flash {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-family: var(--font-head);
    font-weight: 500;
    margin-top: 12px;
}

.flash.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #22c55e;
}

.flash.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
}

/* ── API Panel ── */
.api-panel {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
}

.api-panel-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
}

.api-panel-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.api-badge {
    font-size: 11px;
    font-family: var(--font-head);
    font-weight: 700;
    background: var(--gold-glow);
    border: 1px solid var(--border-hi);
    color: var(--gold);
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-block;
    width: fit-content;
}

.api-desc {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 500;
}

/* ── Refresh Button — uses token vars ── */
.refresh-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    border: none;
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-head);
    cursor: pointer;
    transition: all 0.2s;
    min-height: 40px;
    white-space: nowrap;
}

.refresh-btn:hover:not(:disabled) {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
}

.refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.spin-icon {
    display: inline-block;
    transition: transform 0.3s;
}

.spin-icon.spinning {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.api-key-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}

.api-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 10px 14px;
    transition: border 0.2s;
    min-height: 42px;
}

.api-input:focus {
    outline: none;
    border-color: var(--border-hi);
}

.paste-btn,
.clear-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: 8px;
    padding: 0 14px;
    font-size: 16px;
    cursor: pointer;
    min-height: 42px;
    transition: all 0.2s;
}

.paste-btn:hover {
    border-color: var(--border-hi);
}

.clear-btn:hover {
    color: var(--loss);
    border-color: rgba(239, 68, 68, 0.3);
}

.api-hint {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-3);
    font-family: var(--font-head);
}

.api-hint a {
    color: var(--gold);
    text-decoration: none;
}

.api-hint a:hover {
    text-decoration: underline;
}

/* ── Custom Panel ── */
.custom-panel {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
}

.method-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
}

.mtab {
    flex: 1;
    padding: 9px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-2);
    font-family: var(--font-head);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 38px;
}

.mtab.active {
    background: var(--gold-glow);
    border-color: var(--border-hi);
    color: var(--gold);
}

.custom-input-row {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 16px;
}

.input-prefix {
    background: var(--surface3);
    border: 1px solid var(--border);
    border-right: none;
    border-radius: 8px 0 0 8px;
    padding: 0 14px;
    font-size: 18px;
    color: var(--gold);
    font-family: var(--font-mono);
    line-height: 1;
    display: flex;
    align-items: center;
    height: 48px;
}

.custom-price-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-left: none;
    border-radius: 0 8px 8px 0;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 18px;
    padding: 0 16px;
    height: 48px;
    transition: border 0.2s;
}

.custom-price-input:focus {
    outline: none;
    border-color: var(--border-hi);
}

.custom-preview {
    background: var(--surface2);
    border-radius: 10px;
    border: 1px solid var(--border);
    overflow: hidden;
}

.prev-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
}

.prev-row:last-child {
    border-bottom: none;
}

.prev-row span:first-child {
    color: var(--text-2);
    font-weight: 500;
    font-family: var(--font-head);
    font-size: 14px;
}

.prev-row span:last-child {
    color: var(--text);
    font-weight: 600;
    font-family: var(--font-mono);
}

/* ── Sections ── */
.section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px 24px 28px;
    margin-bottom: 20px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 10px;
    flex-wrap: wrap;
}

.header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
}

.section-title {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.2px;
    color: var(--text);
    line-height: 1.3;
}

.section-title::before {
    content: '◈ ';
    color: var(--gold);
    font-size: 12px;
}

/* ── Converter ── */
.conv-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.conv-tabs::-webkit-scrollbar {
    display: none;
}

.ctab {
    padding: 8px 14px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-2);
    font-family: var(--font-head);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 36px;
}

.ctab.active {
    background: var(--gold-glow);
    border-color: var(--border-hi);
    color: var(--gold);
}

.conv-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.conv-input-wrap {
    display: flex;
    align-items: stretch;
}

.conv-unit-badge {
    background: var(--gold-glow);
    border: 1px solid var(--border-hi);
    border-right: none;
    border-radius: 8px 0 0 8px;
    padding: 0 14px;
    color: var(--gold);
    font-family: var(--font-head);
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    white-space: nowrap;
    height: 48px;
    flex-shrink: 0;
}

.conv-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-left: none;
    border-radius: 0 8px 8px 0;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 18px;
    padding: 12px 16px;
    height: 48px;
}

.conv-input:focus {
    outline: none;
    border-color: var(--border-hi);
}

.conv-results {
    background: var(--surface2);
    border-radius: 10px;
    border: 1px solid var(--border);
    overflow: hidden;
}

.conv-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
}

.conv-row:last-child {
    border-bottom: none;
}

.conv-label {
    font-size: 14px;
    font-family: var(--font-head);
    color: var(--text-2);
    font-weight: 500;
}

.conv-val {
    font-size: 14px;
    font-family: var(--font-mono);
    color: var(--text);
    font-weight: 600;
}

/* ── Unit Grid ── */
.unit-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.unit-tile {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transition: border-color 0.2s;
    min-height: 80px;
}

.unit-tile:hover {
    border-color: var(--border-hi);
}

.tile-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.tile-price {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
}

.tile-gram {
    font-size: 11px;
    color: var(--text-3);
    font-family: var(--font-mono);
    margin-top: auto;
    padding-top: 2px;
}

/* ── Purchases ── */
.add-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 9px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-family: var(--font-head);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 38px;
}

.add-btn:hover {
    border-color: var(--gold);
    color: var(--gold);
}

.purchase-form {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    width: 100%;
    box-sizing: border-box;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 14px;
}

.fg {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.fg label {
    font-size: 12px;
    font-family: var(--font-head);
    font-weight: 600;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.fg input,
.fg select {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--font-head);
    font-size: 15px;
    font-weight: 500;
    padding: 10px 12px;
    min-height: 44px;
    transition: border 0.2s;
    -webkit-appearance: none;
    width: 100%;
    box-sizing: border-box;
}

.fg input:focus,
.fg select:focus {
    outline: none;
    border-color: var(--border-hi);
}

/* ── Save / Submit Button — uses token vars ── */
.submit-btn {
    width: 100%;
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    border: none;
    border-radius: 8px;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-head);
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px;
}

.submit-btn:hover {
    background: var(--btn-primary-hover);
    transform: translateY(-1px);
}

.purchases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    margin-top: 16px;
    margin-bottom: 20px;
}

.p-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    transition: border-color 0.2s;
}

.p-card:hover {
    border-color: var(--border-hi);
}

.pcard-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}

.pcard-weight {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.3;
}

.pcard-actions {
    display: flex;
    gap: 6px;
}

.icon-btn {
    background: var(--surface3);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: 6px;
    padding: 6px 11px;
    font-size: 14px;
    cursor: pointer;
    min-height: 36px;
    min-width: 36px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.icon-btn:hover {
    border-color: var(--gold);
    color: var(--gold);
}

.icon-btn.danger:hover {
    border-color: rgba(239, 68, 68, 0.4);
    color: var(--loss);
}

.pcard-rows {
    display: flex;
    flex-direction: column;
    margin-bottom: 4px;
}

.pcard-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
}

.pcard-row:last-child {
    border: none;
}

.pcard-row span:first-child {
    color: var(--text-2);
    font-size: 13px;
    font-family: var(--font-head);
    font-weight: 500;
}

.pcard-row span:last-child {
    color: var(--text);
    font-size: 14px;
    font-family: var(--font-mono);
    font-weight: 600;
}

/* ── Gain / Loss colors — purchase cards ── */
.pcard-row.highlight.gain {
    background: rgba(34, 197, 94, 0.08);
    border-radius: 6px;
    padding: 8px 10px;
    margin: 4px -10px 0;
}

.pcard-row.highlight.loss {
    background: rgba(239, 68, 68, 0.08);
    border-radius: 6px;
    padding: 8px 10px;
    margin: 4px -10px 0;
}

.pcard-row.highlight.gain span:last-child {
    color: var(--gain) !important;
    font-weight: 700;
    font-size: 15px;
}

.pcard-row.highlight.loss span:last-child {
    color: var(--loss) !important;
    font-weight: 700;
    font-size: 15px;
}

.pcard-row.highlight.gain span:first-child {
    color: var(--gain);
    font-weight: 600;
}

.pcard-row.highlight.loss span:first-child {
    color: var(--loss);
    font-weight: 600;
}

.pcard-date {
    font-size: 10px;
    color: var(--text-3);
    font-family: var(--font-mono);
}

.edit-form .form-grid {
    margin-bottom: 12px;
}

.edit-actions {
    display: flex;
    gap: 8px;
}

.cancel-edit-btn {
    flex: 1;
    background: var(--surface3);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: 8px;
    padding: 12px;
    font-size: 14px;
    font-family: var(--font-head);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px;
}

.cancel-edit-btn:hover {
    border-color: var(--loss);
    color: var(--loss);
}

.edit-actions .submit-btn {
    flex: 1;
}

/* ── Summary ── */
.summary {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
}

.summary h3 {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 16px;
    color: var(--text-2);
    font-family: var(--font-head);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 16px;
}

.sum-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 12px;
}

.sum-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
    font-family: var(--font-head);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.sum-val {
    font-size: 17px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text);
    line-height: 1.3;
}

/* ── Gain / Loss colors — summary ── */
.sum-item.gain {
    background: var(--card-gain-bg);
    border-color: rgba(34, 197, 94, 0.4);
    border-left: 3px solid var(--gain);
}

.sum-item.gain .sum-val {
    color: var(--gain) !important;
    font-size: 19px;
}

.sum-item.gain .sum-label {
    color: var(--gain);
    opacity: 0.8;
}

.sum-item.loss {
    background: var(--card-loss-bg);
    border-color: rgba(239, 68, 68, 0.4);
    border-left: 3px solid var(--loss);
}

.sum-item.loss .sum-val {
    color: var(--loss) !important;
    font-size: 19px;
}

.sum-item.loss .sum-label {
    color: var(--loss);
    opacity: 0.8;
}

.io-row {
    display: flex;
    gap: 4px;
}

.io-btn {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-head);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    min-height: 38px;
}

.io-btn.export:hover {
    border-color: var(--gold);
    color: var(--gold);
}

.io-btn.import:hover {
    border-color: var(--gain);
    color: var(--gain);
}

/* ── Card gain/loss accent — bold & visible ── */
.p-card.gain {
    border-color: rgba(34, 197, 94, 0.5);
    border-left: 3px solid var(--gain);
    background: var(--card-gain-bg);
}

.p-card.loss {
    border-color: rgba(239, 68, 68, 0.5);
    border-left: 3px solid var(--loss);
    background: var(--card-loss-bg);
}

.p-card.gain:hover {
    border-color: rgba(34, 197, 94, 0.7);
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.12);
}

.p-card.loss:hover {
    border-color: rgba(239, 68, 68, 0.7);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.12);
}

/* ── Current value color ── */
.current-val.gain {
    color: var(--gain) !important;
    font-weight: 700;
}

.current-val.loss {
    color: var(--loss) !important;
    font-weight: 700;
}

/* ── Empty State ── */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 40px 20px;
    background: var(--surface2);
    border-radius: 12px;
    border: 1px dashed var(--border);
}

.empty-icon {
    font-size: 28px;
    color: var(--text-3);
}

.empty-state p {
    font-size: 14px;
    color: var(--text-2);
    font-family: var(--font-head);
    font-weight: 500;
    text-align: center;
}

/* ── Footer ── */
.footer {
    text-align: center;
    padding: 24px 16px;
    font-size: 12px;
    color: var(--text-3);
    font-family: var(--font-head);
    font-weight: 500;
    border-top: 1px solid var(--border);
}

/* ── Transitions ── */
.price-flip-enter-active,
.price-flip-leave-active {
    transition: all 0.3s ease;
}

.price-flip-enter-from {
    opacity: 0;
    transform: translateY(-12px);
}

.price-flip-leave-to {
    opacity: 0;
    transform: translateY(12px);
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
    transform: translateY(-12px);
    max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
    max-height: 500px;
}

/* ── Mobile ── */
@media (max-width: 430px) {
    .header-inner {
        padding: 12px 14px;
    }

    .logo-title {
        font-size: 17px;
    }

    .logo-sub {
        display: none;
    }

    .main {
        padding: 12px 10px 40px;
    }

    .price-hero {
        padding: 16px 14px;
    }

    .section {
        padding: 16px 14px 20px;
    }

    .price-tabs {
        gap: 6px;
        margin-bottom: 16px;
    }

    .ptab {
        font-size: 12px;
        padding: 9px 8px;
    }

    .gold-price-value {
        font-size: 40px;
        letter-spacing: 0;
    }

    .gold-price-unit {
        font-size: 13px;
    }

    .gold-meta {
        margin-bottom: 6px;
    }

    .price-strip {
        gap: 6px;
        margin-top: 4px;
    }

    .strip-item {
        padding: 8px 8px;
    }

    .strip-label {
        font-size: 10px;
    }

    .strip-val {
        font-size: 13px;
    }

    .api-panel-row {
        flex-direction: column;
        align-items: stretch;
    }

    .refresh-btn {
        width: 100%;
        justify-content: center;
    }

    .method-tabs {
        gap: 4px;
    }

    .mtab {
        font-size: 12px;
        padding: 8px 6px;
    }

    .form-grid {
        gap: 10px;
    }

    .unit-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .unit-tile {
        padding: 12px 10px;
    }

    .tile-price {
        font-size: 15px;
    }

    .summary-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }

    .sum-item {
        padding: 12px 10px;
    }

    .sum-val {
        font-size: 15px;
    }

    .purchases-grid {
        grid-template-columns: 1fr;
    }

    .conv-tabs {
        gap: 4px;
    }

    .ctab {
        padding: 7px 10px;
        font-size: 12px;
    }

    .section-title {
        font-size: 16px;
    }

    .section-header {
        margin-bottom: 14px;
    }
}

@media (min-width: 431px) and (max-width: 640px) {
    .main {
        padding: 16px 14px 40px;
    }

    .price-hero,
    .section {
        padding: 20px 18px;
    }

    .gold-price-value {
        font-size: 52px;
    }

    .unit-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    .summary-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    .api-panel-row {
        flex-direction: column;
        align-items: stretch;
    }

    .refresh-btn {
        width: 100%;
        justify-content: center;
    }
}

@media (min-width: 641px) {
    .unit-grid {
        grid-template-columns: repeat(6, 1fr);
    }

    .summary-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    .price-strip {
        grid-template-columns: repeat(6, 1fr);
    }
}
</style>