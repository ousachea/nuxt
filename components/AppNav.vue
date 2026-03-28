<template>
    <!-- ── Desktop: floating pill ── -->
    <nav class="nav-desk">
        <div class="pill" v-click-outside="closeDropdown">

            <NuxtLink to="/" class="logo">
                <div class="logo-sq">
                    <svg viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="2" width="4" height="4" rx="1" fill="white" opacity="0.9" />
                        <rect x="8" y="2" width="4" height="4" rx="1" fill="white" opacity="0.6" />
                        <rect x="2" y="8" width="4" height="4" rx="1" fill="white" opacity="0.6" />
                        <rect x="8" y="8" width="4" height="4" rx="1" fill="white" opacity="0.3" />
                    </svg>
                </div>
                <span class="logo-name">MyApp</span>
            </NuxtLink>

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
                        @click="dropOpen = !dropOpen">
                        More
                        <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                            <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                                stroke-linejoin="round" />
                        </svg>
                        <span v-if="overflowHasActive" class="more-pip" />
                    </button>

                    <Transition name="drop">
                        <div v-if="dropOpen" class="dropdown">
                            <NuxtLink v-for="r in overflowRoutes" :key="r.path" :to="r.path" class="drop-item"
                                :class="{ active: isActive(r.path) }" @click="dropOpen = false">
                                <span>{{ routeLabel(r.path) }}</span>
                                <span class="drop-path">{{ r.path }}</span>
                            </NuxtLink>
                        </div>
                    </Transition>
                </div>
            </div>

            <!-- Search -->
            <div class="d-search" @click="$emit('search')">
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4" />
                    <path d="M10.5 10.5L13 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                </svg>
                <span>Search</span>
                <kbd>⌘K</kbd>
            </div>
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
defineEmits(['search'])

const router = useRouter()
const route = useRoute()

// ── Route list ──────────────────────────────────────────────────────────────
const allRoutes = computed(() =>
    router.getRoutes().filter(r =>
        r.path !== '/' &&
        !r.path.startsWith('/__') &&
        !/[:[*]/.test(r.path) &&
        r.path.split('/').filter(Boolean).length === 1
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
const isActive = (path: string) => route.path.startsWith(path)
const routeLabel = (path: string) => {
    const s = path.replace('/', '')
    return s.charAt(0).toUpperCase() + s.slice(1)
}

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

// ── Dropdown / sheet state ───────────────────────────────────────────────────
const dropOpen = ref(false)
const sheetOpen = ref(false)

const closeDropdown = () => { dropOpen.value = false }

// Close sheet on route change
watch(() => route.path, () => { sheetOpen.value = false; dropOpen.value = false })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

/* ════════════════════════════════
   DESKTOP
   ════════════════════════════════ */
.nav-desk {
    display: flex;
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.nav-mob {
    display: none;
}

.pill {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 5px 7px;
    background: #fff;
    border: 0.5px solid rgba(0, 0, 0, 0.10);
    border-radius: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.10),
        inset 0 0.5px 0 rgba(255, 255, 255, 0.9);
    white-space: nowrap;
}

/* Logo */
.logo {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 8px 4px 5px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.12s;
}

.logo:hover {
    background: #f5f5f7;
}

.logo-sq {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    background: #7c6bff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.logo-sq svg {
    width: 11px;
    height: 11px;
}

.logo-name {
    font-size: 12.5px;
    font-weight: 600;
    color: #111;
    letter-spacing: -0.01em;
}

.divider {
    width: 1px;
    height: 16px;
    background: rgba(0, 0, 0, 0.08);
    margin: 0 4px;
    flex-shrink: 0;
}

/* Links */
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

/* More button */
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

/* Dropdown */
.dropdown {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    background: #fff;
    border: 0.5px solid rgba(0, 0, 0, 0.10);
    border-radius: 12px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
    padding: 4px;
    min-width: 160px;
    z-index: 10;
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

/* Search */
.d-search {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    margin-left: 3px;
    border-radius: 9px;
    border: 0.5px solid rgba(0, 0, 0, 0.10);
    background: #fafafa;
    font-size: 12.5px;
    color: #999;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    transition: border-color 0.15s, color 0.15s;
}

.d-search:hover {
    border-color: rgba(0, 0, 0, 0.18);
    color: #444;
}

kbd {
    font-family: inherit;
    font-size: 10px;
    color: #ccc;
    border: 0.5px solid rgba(0, 0, 0, 0.10);
    border-radius: 4px;
    padding: 1px 5px;
    background: #fff;
}

/* Dropdown transition */
.drop-enter-active,
.drop-leave-active {
    transition: opacity 0.15s, transform 0.15s;
}

.drop-enter-from,
.drop-leave-to {
    opacity: 0;
    transform: translateY(6px);
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
   MOBILE SHEET (teleported to body)
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
    transition: transform 0.25s cubic-bezier(.32, 1, .22, 1);
}

.sheet-enter-from,
.sheet-leave-to {
    transform: translateY(100%);
}
</style>