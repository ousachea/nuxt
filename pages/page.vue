<script setup>
const pageFiles = import.meta.glob('~/pages/**/*.vue')
const route = useRoute()

const HIDDEN = [
  // Add routes you want to hide from the nav
  // '/secret',
  // '/admin',
  '/idol',
  '/js',
]

const pages = computed(() => {
  return Object.keys(pageFiles)
    .map(filePath => {
      let path = filePath
        .replace(/^.*\/pages/, '')
        .replace(/\.vue$/, '')
        .replace(/\/index$/, '') || '/'

      const isDynamic = /\[.*\]/.test(path)

      const segments = path.split('/').filter(Boolean)
      const last = segments[segments.length - 1] || 'Home'
      const label = last
        .replace(/\[|\]/g, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

      return { path: path || '/', label, isDynamic, segments }
    })
    .filter(p => p.path !== '/index')
    .filter(p => !HIDDEN.includes(p.path))
    .sort((a, b) => a.path.localeCompare(b.path))
})

const total = computed(() => pages.value.length)
</script>

<template>
  <div class="root">
    <div class="container">

      <header class="header">
        <div class="header-meta">
          <span class="badge">sitemap</span>
          <span class="count">{{ total }} pages</span>
        </div>
        <h1 class="headline">Navigation</h1>
      </header>

      <nav class="nav">
        <ul class="list">
          <li
            v-for="(page, i) in pages"
            :key="page.path"
            class="item"
            :style="{ '--i': i }"
          >
            <NuxtLink
              v-if="!page.isDynamic"
              :to="page.path"
              class="link"
              :class="{ 'link--active': route.path === page.path }"
            >
              <span class="link-left">
                <span class="index">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="name">{{ page.label }}</span>
              </span>
              <span class="link-right">
                <span class="path">{{ page.path }}</span>
                <span class="chevron">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </span>
            </NuxtLink>

            <div v-else class="link link--muted">
              <span class="link-left">
                <span class="index">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="name">{{ page.label }}</span>
              </span>
              <span class="link-right">
                <span class="path">{{ page.path }}</span>
                <span class="tag">dynamic</span>
              </span>
            </div>
          </li>
        </ul>

        <div v-if="pages.length === 0" class="empty">
          No pages found in <code>pages/</code>
        </div>
      </nav>

      <footer class="footer">
        <span>Nuxt 3</span>
        <span class="dot">·</span>
        <span>Auto-generated</span>
      </footer>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.root {
  --bg: #f9f8f6;
  --border: #e8e6e1;
  --text-primary: #1a1814;
  --text-secondary: #9a9590;
  --text-muted: #c5c2bc;
  --mono: 'DM Mono', monospace;
  --serif: 'Instrument Serif', serif;

  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 24px 120px;
}

.container {
  width: 100%;
  max-width: 620px;
}

/* ── Header ── */
.header { margin-bottom: 52px; }

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.badge {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: var(--border);
  padding: 3px 8px;
  border-radius: 100px;
}

.count {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-muted);
}

.headline {
  font-family: var(--serif);
  font-size: clamp(40px, 8vw, 64px);
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.02em;
}

/* ── List ── */
.list {
  list-style: none;
  border-top: 1px solid var(--border);
}

.item {
  border-bottom: 1px solid var(--border);
  animation: fadeUp 0.4s ease both;
  animation-delay: calc(var(--i) * 40ms);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Link ── */
.link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 0;
  text-decoration: none;
  color: var(--text-primary);
  cursor: pointer;
  position: relative;
}

a.link::after {
  content: '';
  position: absolute;
  inset: 0 -16px;
  border-radius: 6px;
  background: transparent;
  transition: background 0.15s;
  z-index: -1;
}

a.link:hover::after { background: rgba(0, 0, 0, 0.03); }

a.link:hover .chevron {
  opacity: 1;
  transform: translateX(0);
}

.link--active .name { font-style: italic; }

.link--muted {
  opacity: 0.35;
  cursor: default;
}

/* ── Link internals ── */
.link-left {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.link-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.index {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-muted);
  width: 22px;
  flex-shrink: 0;
}

.name {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 400;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.path {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.chevron {
  color: var(--text-secondary);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.15s, transform 0.15s;
  display: flex;
  align-items: center;
}

.tag {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 4px;
}

/* ── Empty ── */
.empty {
  padding: 48px 0;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

.empty code { color: var(--text-secondary); }

/* ── Footer ── */
.footer {
  margin-top: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-muted);
}

.dot { color: var(--border); }

/* ── Mobile ── */
@media (max-width: 480px) {
  .root { padding: 48px 20px 80px; }
  .path { display: none; }
  .name { font-size: 17px; }
}
</style>