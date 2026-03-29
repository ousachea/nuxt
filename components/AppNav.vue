<template>
    <!-- ── Desktop: floating hover-expand pill ── -->
    <nav class="nav-desk">
        <div class="pill-wrap" v-click-outside="closeDropdown" @mouseenter="onEnter" @mouseleave="onLeave">
            <div ref="pillRef" class="pill" :class="{ expanded: isExpanded }" :style="pillStyle">

                <!-- Expandable content -->
                <div ref="pillContentRef" class="pill-content" :class="{ visible: isExpanded }">
                    <span class="logo-name">MyApp</span>
                    <div class="divider" />

                    <!-- Primary links -->
                    <div class="links">
                        <NuxtLink v-for="r in primaryRoutes" :key="r.path" :to="r.path" class="d-item"
                            :class="{ active: isActive(r.path) }">
                            <span class="d-label">{{ routeLabel(r.path) }}</span>
                            <span v-if="isActive(r.path)" class="d-pip" />
                        </NuxtLink>

                        <!-- More dropdown -->
                        <div v-if="overflowRoutes.length" class="more-wrap">
                            <button class="more-btn" :class="{ open: dropOpen, 'has-active': overflowHasActive }"
                                @click.stop="dropOpen = !dropOpen">
                                More
                                <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5"
                                        stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                <span v-if="overflowHasActive" class="more-pip" />
                            </button>

                            <Transition name="drop">
                                <div v-if="dropOpen" class="dropdown">
                                    <NuxtLink v-for="r in overflowRoutes" :key="r.path" :to="r.path"
                                        class="drop-item" :class="{ active: isActive(r.path) }"
                                        @click="dropOpen = false">
                                        <span>{{ routeLabel(r.path) }}</span>
                                        <span class="drop-path">{{ r.path }}</span>
                                    </NuxtLink>
                                </div>
                            </Transition>
                        </div>
                    </div>
                </div>

                <!-- Logo icon — always visible, sits at the right end -->
                <NuxtLink to="/" class="logo-btn">
                    <div class="logo-sq">
                        <svg viewBox="0 0 14 14" fill="none">
                            <rect x="2" y="2" width="4" height="4" rx="1" fill="white" opacity="0.9" />
                            <rect x="8" y="2" width="4" height="4" rx="1" fill="white" opacity="0.6" />
                            <rect x="2" y="8" width="4" height="4" rx="1" fill="white" opacity="0.6" />
                            <rect x="8" y="8" width="4" height="4" rx="1" fill="white" opacity="0.3" />
                        </svg>
                    </div>
                </NuxtLink>
            </div>

            <!-- Hover hint tooltip (only when collapsed) -->
            <Transition name="hint">
                <div v-if="!isExpanded" class="hover-hint">Navigation</div>
            </Transition>
        </div>
    </nav>

    <!-- ── Mobile: tab bar + more sheet ── -->
    <nav class="nav-mob">
        <NuxtLink v-for="r in mobileRoutes" :key="r.path" :to="r.path" class="m-item"
            :class="{ active: isActive(r.path) }">
            <div class="m-icon-wrap" :class="{ active: isActive(r.path) }">
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16" v-html="routeIcon(r.path)" />
            </div>
            <span class="m-label">{{ routeLabel(r.path) }}</span>
        </NuxtLink>

        <!-- More tab -->
        <button v-if="mobileOverflow.length" class="m-item more-tab" :class="{ active: mobileOverflowHasActive }"
            @click="sheetOpen = true">
            <div class="m-icon-wrap" :class="{ active: mobileOverflowHasActive }">
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                    <circle cx="4" cy="8" r="1.3" fill="currentColor" />
                    <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                    <circle cx="12" cy="8" r="1.3" fill="currentColor" />
                </svg>
            </div>
            <span class="m-label">More</span>
        </button>
    </nav>

    <!-- ── Mobile sheet overlay ── -->
    <Teleport to="body">
        <Transition name="sheet-bg">
            <div v-if="sheetOpen" class="sheet-overlay" @click.self="sheetOpen = false">
                <Transition name="sheet">
                    <div v-if="sheetOpen" class="sheet">
                        <div class="sheet-handle" />
                        <p class="sheet-title">More pages</p>
                        <div class="sheet-grid">
                            <NuxtLink v-for="r in mobileOverflow" :key="r.path" :to="r.path" class="sheet-item"
                                :class="{ active: isActive(r.path) }" @click="sheetOpen = false">
                                <div class="sheet-icon" :class="{ active: isActive(r.path) }">
                                    <svg viewBox="0 0 16 16" fill="none" width="18" height="18"
                                        v-html="routeIcon(r.path)" />
                                </div>
                                <span class="sheet-label">{{ routeLabel(r.path) }}</span>
                            </NuxtLink>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">

const router = useRouter()
const route = useRoute()

// ── Refs ───────────────────────────────────────────────────────────────────
const pillRef = ref<HTMLElement | null>(null)
const pillContentRef = ref<HTMLElement | null>(null)
const expandedWidth = ref(44)

// Measure the natural scrollWidth of the content + logo (36px) + padding (14px each side) + divider gap
const measureWidth = () => {
    nextTick(() => {
        if (!pillContentRef.value) return
        // Temporarily make content visible for measurement
        const el = pillContentRef.value
        el.style.opacity = '1'
        el.style.pointerEvents = 'none'
        const contentW = el.scrollWidth
        el.style.opacity = ''
        el.style.pointerEvents = ''
        // 36 (logo) + 4 (logo padding) + 7 (right padding) + 7 (left padding) + content
        expandedWidth.value = 36 + 4 + 7 + 7 + contentW
    })
}

const pillStyle = computed(() => ({
    width: isExpanded.value ? `${expandedWidth.value}px` : '44px'
}))

// ── State ─────────────────────────────────────────────────────────────────
const isExpanded = ref(false)
const dropOpen = ref(false)
const sheetOpen = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

const onEnter = () => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
    isExpanded.value = true
}

const onLeave = () => {
    closeTimer = setTimeout(() => {
        isExpanded.value = false
        dropOpen.value = false
    }, 450)
}

// ── Route list ──────────────────────────────────────────────────────────────
const hiddenRoutes = ['/idol']

const allRoutes = computed(() =>
    router.getRoutes().filter(r =>
        r.path !== '/' &&
        !r.path.startsWith('/__') &&
        !/[:[*]/.test(r.path) &&
        r.path.split('/').filter(Boolean).length === 1 &&
        !hiddenRoutes.includes(r.path)
    )
)

const DESK_LIMIT = 10
const MOB_LIMIT = 4

const primaryRoutes = computed(() => allRoutes.value.slice(0, DESK_LIMIT))
const overflowRoutes = computed(() => allRoutes.value.slice(DESK_LIMIT))
const mobileRoutes = computed(() => allRoutes.value.slice(0, MOB_LIMIT))
const mobileOverflow = computed(() => allRoutes.value.slice(MOB_LIMIT))
const overflowHasActive = computed(() => overflowRoutes.value.some(r => isActive(r.path)))
const mobileOverflowHasActive = computed(() => mobileOverflow.value.some(r => isActive(r.path)))

// ── Helpers ─────────────────────────────────────────────────────────────────
const isActive = (path: string) => route.path === path || route.path.startsWith(path + '/')
const routeLabel = (path: string) => {
    const s = path.replace('/', '')
    return s.charAt(0).toUpperCase() + s.slice(1)
}

const closeDropdown = () => {
    dropOpen.value = false
}

// Close on route change
watch(() => route.path, () => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
    sheetOpen.value = false
    dropOpen.value = false
    isExpanded.value = false
})

// Re-measure when routes are available / change
watch(allRoutes, measureWidth, { immediate: false })
onMounted(measureWidth)

// ── Icons ───────────────────────────────────────────────────────────────────
const icons: Record<string, string> = {
    dashboard: '<path d="M3 9l4-4 3 3 4-5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
    analytics: '<rect x="3" y="8" width="2.5" height="5" rx="1" stroke-width="1.5"/><rect x="7.25" y="5" width="2.5" height="8" rx="1" stroke-width="1.5"/><rect x="11.5" y="2" width="2" height="11" rx="1" stroke-width="1.5"/>',
    products: '<rect x="3" y="3" width="8" height="8" rx="1.5" stroke-width="1.5"/><path d="M7 13h6M10 10v3" stroke-linecap="round" stroke-width="1.5"/>',
    blog: '<path d="M4 6h8M4 9h6M4 12h4" stroke-linecap="round" stroke-width="1.5"/><rect x="3" y="3" width="10" height="11" rx="1.5" stroke-width="1.5"/>',
    settings: '<circle cx="8" cy="8" r="2" stroke-width="1.5"/><path d="M8 3v1M8 12v1M3 8h1M12 8h1M4.93 4.93l.7.7M10.37 10.37l.7.7M4.93 11.07l.7-.7M10.37 5.63l.7-.7" stroke-linecap="round" stroke-width="1.5"/>',
    docs: '<rect x="3" y="2" width="10" height="12" rx="1.5" stroke-width="1.5"/><path d="M5.5 6h5M5.5 9h3" stroke-linecap="round" stroke-width="1.5"/>',
    pricing: '<circle cx="8" cy="8" r="5" stroke-width="1.5"/><path d="M8 5.5v5M6.5 7h2.5a1 1 0 010 2H7" stroke-linecap="round" stroke-width="1.5"/>',
    team: '<circle cx="6" cy="6" r="2.5" stroke-width="1.5"/><circle cx="11" cy="6" r="2" stroke-width="1.5"/><path d="M1.5 13c0-2 2-3.5 4.5-3.5S10.5 11 10.5 13" stroke-linecap="round" stroke-width="1.5"/><path d="M11 9c1.5 0 3 1 3 2.5" stroke-linecap="round" stroke-width="1.5"/>',
    profile: '<circle cx="8" cy="6" r="3" stroke-width="1.5"/><path d="M2.5 14c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4" stroke-linecap="round" stroke-width="1.5"/>',
    contact: '<rect x="2" y="4" width="12" height="9" rx="1.5" stroke-width="1.5"/><path d="M2 5l6 5 6-5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
    about: '<circle cx="8" cy="8" r="5.5" stroke-width="1.5"/><path d="M8 7v5M8 5.5v.5" stroke-linecap="round" stroke-width="1.5"/>',
    home: '<path d="M2.5 8.5L8 3l5.5 5.5M4 7.5V13h3v-3h2v3h3V7.5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>',
}

const routeIcon = (path: string) =>
    icons[path.replace('/', '').toLowerCase()] ??
    '<circle cx="8" cy="8" r="5" stroke-width="1.5"/>'
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

/* ════════════════════════════════
   DESKTOP — floating pill
   ════════════════════════════════ */
.nav-desk {
    display: flex;
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    z-index: 100;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.nav-mob {
    display: none;
}

/* Wrapper holds pill + hint tooltip — padding creates invisible hover buffer */
.pill-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 16px;
    margin: -16px;
}

/* ── Pill shell ── */
.pill {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0;
    height: 44px;
    padding: 4px;
    background: #fff;
    border: 0.5px solid rgba(0, 0, 0, 0.10);
    border-radius: 22px;
    box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 8px 24px rgba(0, 0, 0, 0.10),
        inset 0 0.5px 0 rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    width: 44px;
    transition:
        width 0.32s cubic-bezier(0.4, 0, 0.2, 1),
        padding 0.32s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.18s ease;
    cursor: default;
}

.pill.expanded {
    justify-content: flex-end;
    padding: 4px 7px;
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.06),
        0 12px 32px rgba(0, 0, 0, 0.13),
        inset 0 0.5px 0 rgba(255, 255, 255, 0.9);
}

/* ── Logo button (always visible, last in DOM = rightmost) ── */
.logo-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    text-decoration: none;
}

.pill.expanded .logo-btn {
    margin-left: 0;
}

.logo-sq {
    width: 36px;
    height: 36px;
    min-width: 36px;
    border-radius: 50%;
    background: #7c6bff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-radius 0.2s ease;
    animation: breathe 3s ease-in-out infinite;
}

.pill.expanded .logo-sq {
    border-radius: 50%;
    animation: none;
}

.logo-sq svg {
    width: 14px;
    height: 14px;
}

@keyframes breathe {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(124, 107, 255, 0.35);
    }
    50% {
        transform: scale(1.08);
        box-shadow: 0 0 12px 4px rgba(124, 107, 255, 0.18);
    }
}

/* ── Expandable content (fades in) ── */
.pill-content {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    width: 0;
    overflow: hidden;
    pointer-events: none;
    transition: opacity 0.16s 0.10s ease, width 0s 0.32s;
}

.pill-content.visible {
    opacity: 1;
    width: auto;
    overflow: visible;
    pointer-events: auto;
    transition: opacity 0.16s 0.10s ease;
}

.logo-name {
    font-size: 12.5px;
    font-weight: 600;
    color: #111;
    letter-spacing: -0.01em;
    padding: 0 8px 0 7px;
    flex-shrink: 0;
}

.divider {
    width: 1px;
    height: 16px;
    background: rgba(0, 0, 0, 0.08);
    margin: 0 4px;
    flex-shrink: 0;
}

/* ── Nav links ── */
.links {
    display: flex;
    align-items: center;
    gap: 2px;
}

.d-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 5px 11px;
    border-radius: 9px;
    text-decoration: none;
    transition: background 0.12s;
}

.d-item:hover {
    background: #f5f5f7;
}

.d-item.active {
    background: #f0efff;
}

.d-label {
    font-size: 12.5px;
    font-weight: 500;
    color: #888;
    line-height: 1;
    transition: color 0.12s;
}

.d-item:hover .d-label {
    color: #333;
}

.d-item.active .d-label {
    color: #7c6bff;
    font-weight: 600;
}

.d-pip {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #7c6bff;
}

/* ── More button ── */
.more-wrap {
    position: relative;
}

.more-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 11px;
    border-radius: 9px;
    border: none;
    background: none;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 12.5px;
    font-weight: 500;
    color: #888;
    transition: background 0.12s, color 0.12s;
    position: relative;
}

.more-btn:hover,
.more-btn.open {
    background: #f5f5f7;
    color: #333;
}

.more-btn.has-active {
    color: #7c6bff;
}

.more-pip {
    position: absolute;
    top: 5px;
    right: 7px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #7c6bff;
}

/* ── Dropdown ── */
.dropdown {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: #fff;
    border: 0.5px solid rgba(0, 0, 0, 0.10);
    border-radius: 12px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
    padding: 4px;
    padding-bottom: 4px;
    margin-bottom: 8px;
    min-width: 160px;
    z-index: 10;
}

/* Invisible bridge to prevent hover gap between dropdown and pill */
.dropdown::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 0;
    right: 0;
    height: 12px;
}

.drop-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 13px;
    color: #555;
    transition: background 0.1s, color 0.1s;
}

.drop-item:hover {
    background: #f5f5f7;
    color: #111;
}

.drop-item.active {
    background: #f0efff;
    color: #7c6bff;
    font-weight: 600;
}

.drop-path {
    font-size: 10px;
    color: #ccc;
    font-family: ui-monospace, monospace;
}

.drop-item.active .drop-path {
    color: rgba(124, 107, 255, 0.45);
}

/* ── Hover hint tooltip ── */
.hover-hint {
    position: absolute;
    bottom: calc(100% + 10px);
    right: 0;
    background: rgba(0, 0, 0, 0.68);
    color: #fff;
    font-size: 11px;
    font-weight: 500;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    border-radius: 7px;
    padding: 4px 10px;
    white-space: nowrap;
    pointer-events: none;
    transition: opacity 0.15s 0.6s ease;
}

/* ── Transitions ── */
.drop-enter-active,
.drop-leave-active {
    transition: opacity 0.15s, transform 0.15s;
}

.drop-enter-from,
.drop-leave-to {
    opacity: 0;
    transform: translateY(6px);
}

.hint-enter-active {
    transition: opacity 0.15s 0.8s ease;
}

.hint-leave-active {
    transition: opacity 0.1s ease;
}

.hint-enter-from,
.hint-leave-to {
    opacity: 0;
}

/* ════════════════════════════════
   MOBILE
   ════════════════════════════════ */
@media (max-width: 640px) {
    .nav-desk {
        display: none;
    }

    .nav-mob {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: #fff;
        border-top: 0.5px solid rgba(0, 0, 0, 0.08);
        padding: 6px 4px;
        padding-bottom: max(6px, env(safe-area-inset-bottom));
        gap: 2px;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    .m-item,
    .more-tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 5px 4px;
        border-radius: 10px;
        text-decoration: none;
        cursor: pointer;
        background: none;
        border: none;
        transition: background 0.12s;
        min-width: 0;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    .m-item:hover,
    .more-tab:hover {
        background: #f5f5f7;
    }

    .m-icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
    }

    .m-icon-wrap svg {
        stroke: #aaa;
        transition: stroke 0.15s;
    }

    .m-item:hover .m-icon-wrap svg,
    .more-tab:hover .m-icon-wrap svg {
        stroke: #666;
    }

    .m-icon-wrap.active {
        background: #7c6bff;
    }

    .m-icon-wrap.active svg {
        stroke: #fff;
        fill: none;
    }

    .more-tab .m-icon-wrap svg {
        fill: #aaa;
        stroke: none;
    }

    .more-tab:hover .m-icon-wrap svg {
        fill: #666;
    }

    .more-tab.active .m-icon-wrap svg {
        fill: #fff;
    }

    .m-label {
        font-size: 10px;
        font-weight: 500;
        color: #aaa;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        transition: color 0.12s;
    }

    .m-item:hover .m-label,
    .more-tab:hover .m-label {
        color: #666;
    }

    .m-item.active .m-label,
    .more-tab.active .m-label {
        color: #7c6bff;
        font-weight: 600;
    }
}

/* ════════════════════════════════
   MOBILE SHEET
   ════════════════════════════════ */
.sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: flex-end;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.sheet {
    width: 100%;
    background: #fff;
    border-radius: 20px 20px 0 0;
    border-top: 0.5px solid rgba(0, 0, 0, 0.08);
    padding: 10px 12px max(16px, env(safe-area-inset-bottom));
    box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.12);
}

.sheet-handle {
    width: 36px;
    height: 3px;
    border-radius: 2px;
    background: rgba(0, 0, 0, 0.12);
    margin: 0 auto 14px;
}

.sheet-title {
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 10px;
    padding: 0 4px;
}

.sheet-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
}

.sheet-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border-radius: 12px;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.12s;
}

.sheet-item:hover {
    background: #f5f5f7;
}

.sheet-item.active {
    background: #f0efff;
}

.sheet-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #f5f5f7;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sheet-icon.active {
    background: #7c6bff;
}

.sheet-icon svg {
    stroke: #777;
}

.sheet-icon.active svg {
    stroke: #fff;
}

.sheet-label {
    font-size: 11.5px;
    font-weight: 500;
    color: #555;
}

.sheet-item.active .sheet-label {
    color: #7c6bff;
    font-weight: 600;
}

/* Sheet transitions */
.sheet-bg-enter-active,
.sheet-bg-leave-active {
    transition: background 0.22s;
}

.sheet-bg-enter-from,
.sheet-bg-leave-to {
    background: rgba(0, 0, 0, 0);
}

.sheet-enter-active,
.sheet-leave-active {
    transition: transform 0.25s cubic-bezier(0.32, 1, 0.22, 1);
}

.sheet-enter-from,
.sheet-leave-to {
    transform: translateY(100%);
}
</style>