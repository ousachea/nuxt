<template>
    <div class="editor-root" :class="{ dark: isDark }">
      <!-- Header -->
      <header class="top-bar">
        <div class="top-bar__left">
          <span class="logo">⬡ artists.js</span>
          <span class="stat">{{ artists.length }} artists · {{ totalWorks }} works</span>
        </div>
        <div class="top-bar__right">
          <button class="btn btn--ghost" @click="isDark = !isDark">{{ isDark ? '☀︎' : '⏾' }}</button>
          <button class="btn btn--ghost" @click="showAddModal = true">+ Add</button>
          <button class="btn btn--export" @click="exportJS">Export JS</button>
        </div>
      </header>
  
      <!-- Search + Filter -->
      <div class="toolbar">
        <input
          v-model="search"
          class="search-input"
          placeholder="Search artist or work code…"
          spellcheck="false"
        />
        <div class="sort-tabs">
          <button
            v-for="s in sorts"
            :key="s.value"
            class="sort-tab"
            :class="{ active: sortBy === s.value }"
            @click="sortBy = s.value"
          >{{ s.label }}</button>
        </div>
      </div>
  
      <!-- Grid -->
      <main class="grid-area">
        <div v-if="loading" class="empty-state">Loading artists…</div>
        <div v-else-if="loadError" class="empty-state error-state">⚠ {{ loadError }}</div>
        <TransitionGroup v-else name="card" tag="div" class="artist-grid">
          <div
            v-for="(artist, idx) in filteredArtists"
            :key="artist._id"
            class="a-card"
            :class="{ 'a-card--selected': selected === artist._id }"
            @click="openEdit(artist)"
          >
            <div class="a-card__top">
              <span class="a-card__name">{{ artist.name }}</span>
              <div class="a-card__actions" @click.stop>
                <button class="icon-btn" title="Duplicate" @click="duplicate(artist)">⧉</button>
                <button class="icon-btn icon-btn--del" title="Delete" @click="remove(artist._id)">✕</button>
              </div>
            </div>
            <div class="a-card__counts">
              <span class="chip chip--main">{{ countWorks(artist.mainWorks) }} main</span>
              <span v-if="countWorks(artist.compilations)" class="chip chip--comp">{{ countWorks(artist.compilations) }} comp</span>
              <span v-if="countWorks(artist.vr)" class="chip chip--vr">{{ countWorks(artist.vr) }} VR</span>
            </div>
            <div v-if="artist.cover" class="a-card__cover">cover: <code>{{ artist.cover }}</code></div>
          </div>
        </TransitionGroup>
        <div v-if="filteredArtists.length === 0" class="empty-state">No artists match "{{ search }}"</div>
      </main>
  
      <!-- Edit Drawer -->
      <Transition name="drawer">
        <div v-if="editing" class="drawer-overlay" @click.self="closeEdit">
          <aside class="drawer">
            <div class="drawer__header">
              <h2 class="drawer__title">Edit Artist</h2>
              <button class="icon-btn" @click="closeEdit">✕</button>
            </div>
            <div class="drawer__body">
              <!-- Name -->
              <label class="field-label">Name</label>
              <input v-model="editForm.name" class="field-input" spellcheck="false" />
  
              <!-- Cover -->
              <label class="field-label">Cover Code</label>
              <input v-model="editForm.cover" class="field-input mono" placeholder="e.g. SONE-312" spellcheck="false" />
  
              <!-- Custom URL -->
              <label class="field-label">Custom Cover URL</label>
              <input v-model="editForm.url" class="field-input mono" placeholder="https://…" spellcheck="false" />
  
              <!-- Main Works -->
              <label class="field-label">
                Main Works
                <span class="field-count">{{ editForm.mainWorks.filter(c => c.trim()).length }}</span>
              </label>
              <div class="codes-area">
                <div
                  v-for="(code, i) in editForm.mainWorks"
                  :key="'mw-' + i"
                  class="code-row"
                >
                  <input
                    v-model="editForm.mainWorks[i]"
                    class="code-input mono"
                    :placeholder="'Code ' + (i + 1)"
                    spellcheck="false"
                    @input="autoGrow(editForm.mainWorks, i)"
                  />
                  <button class="icon-btn icon-btn--del" @click="removeCode(editForm.mainWorks, i)">✕</button>
                </div>
                <button class="add-code-btn" @click="editForm.mainWorks.push('')">+ Add code</button>
              </div>
  
              <!-- Compilations -->
              <label class="field-label">
                Compilations
                <span class="field-count">{{ editForm.compilations.filter(c => c.trim()).length }}</span>
              </label>
              <div class="codes-area">
                <div
                  v-for="(code, i) in editForm.compilations"
                  :key="'comp-' + i"
                  class="code-row"
                >
                  <input
                    v-model="editForm.compilations[i]"
                    class="code-input mono"
                    spellcheck="false"
                    @input="autoGrow(editForm.compilations, i)"
                  />
                  <button class="icon-btn icon-btn--del" @click="removeCode(editForm.compilations, i)">✕</button>
                </div>
                <button class="add-code-btn" @click="editForm.compilations.push('')">+ Add</button>
              </div>
  
              <!-- VR -->
              <label class="field-label">
                VR Works
                <span class="field-count">{{ (editForm.vr || []).filter(c => c.trim()).length }}</span>
              </label>
              <div class="codes-area">
                <div
                  v-for="(code, i) in (editForm.vr || [])"
                  :key="'vr-' + i"
                  class="code-row"
                >
                  <input
                    v-model="editForm.vr[i]"
                    class="code-input mono"
                    spellcheck="false"
                  />
                  <button class="icon-btn icon-btn--del" @click="removeCode(editForm.vr, i)">✕</button>
                </div>
                <button class="add-code-btn" @click="editForm.vr ? editForm.vr.push('') : (editForm.vr = [''])">+ Add</button>
              </div>
            </div>
  
            <div class="drawer__footer">
              <button class="btn btn--ghost" @click="closeEdit">Cancel</button>
              <button class="btn btn--save" @click="saveEdit">Save</button>
            </div>
          </aside>
        </div>
      </Transition>
  
      <!-- Add Modal -->
      <Transition name="fade">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal">
            <div class="modal__header">
              <h3>New Artist</h3>
              <button class="icon-btn" @click="showAddModal = false">✕</button>
            </div>
            <div class="modal__body">
              <label class="field-label">Name</label>
              <input v-model="newArtist.name" class="field-input" placeholder="Artist name" spellcheck="false" @keyup.enter="addArtist" />
              <label class="field-label" style="margin-top:12px">Initial Works (comma-separated)</label>
              <input v-model="newArtist.worksRaw" class="field-input mono" placeholder="CODE-001, CODE-002" spellcheck="false" />
            </div>
            <div class="modal__footer">
              <button class="btn btn--ghost" @click="showAddModal = false">Cancel</button>
              <button class="btn btn--save" @click="addArtist">Add Artist</button>
            </div>
          </div>
        </div>
      </Transition>
  
      <!-- Export Modal -->
      <Transition name="fade">
        <div v-if="exportText" class="modal-overlay" @click.self="exportText = ''">
          <div class="modal modal--wide">
            <div class="modal__header">
              <h3>Export — artists.js</h3>
              <div style="display:flex;gap:8px;align-items:center">
                <span v-if="copied" class="copied-badge">Copied!</span>
                <button class="btn btn--save" @click="copyExport">Copy</button>
                <button class="icon-btn" @click="exportText = ''">✕</button>
              </div>
            </div>
            <pre class="export-pre"><code>{{ exportText }}</code></pre>
          </div>
        </div>
      </Transition>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, reactive, onMounted } from 'vue'
  
  // ── Types ──────────────────────────────────────────────────────────────────
  interface Artist {
    _id: string
    name: string
    cover: string
    url: string
    compilations: string[]
    mainWorks: string[]
    vr: string[]
  }
  
  let _id = 0
  const uid = () => String(++_id)
  
  function normalise(a: any): Artist {
    return {
      _id: uid(),
      name: a.name ?? '',
      cover: a.cover ?? '',
      url: a.url ?? '',
      compilations: a.compilations?.length ? [...a.compilations] : [''],
      mainWorks: a.mainWorks?.length ? [...a.mainWorks] : [''],
      vr: a.vr?.length ? [...a.vr] : [''],
    }
  }
  
  // ── State ──────────────────────────────────────────────────────────────────
  const isDark = ref(true)
  const search = ref('')
  const loading = ref(true)
  const loadError = ref('')
  const sortBy = ref<'name' | 'works' | 'added'>('name')
  const sorts = [
    { label: 'A–Z', value: 'name' as const },
    { label: 'Works ↓', value: 'works' as const },
    { label: 'Order', value: 'added' as const },
  ]
  
  const artists = ref<Artist[]>([])
  
  // Load from /data/artists.js via dynamic import
  onMounted(async () => {
    try {
      // dynamic import works for JS modules in the Nuxt project tree
      const mod = await import('~/data/artists.js')
      const raw: any[] = mod.DEFAULT_ARTISTS ?? mod.default ?? []
      artists.value = raw.map(normalise)
    } catch (e: any) {
      loadError.value = e?.message ?? 'Failed to load artists.js'
    } finally {
      loading.value = false
    }
  })
  
  // ── Computed ───────────────────────────────────────────────────────────────
  const totalWorks = computed(() =>
    artists.value.reduce((s, a) => s + countWorks(a.mainWorks), 0)
  )
  
  const filteredArtists = computed(() => {
    const q = search.value.trim().toLowerCase()
    let list = artists.value
    if (q) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.mainWorks.some(w => w.toLowerCase().includes(q)) ||
        a.compilations.some(w => w.toLowerCase().includes(q)) ||
        (a.vr || []).some(w => w.toLowerCase().includes(q))
      )
    }
    if (sortBy.value === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy.value === 'works') return [...list].sort((a, b) => countWorks(b.mainWorks) - countWorks(a.mainWorks))
    return list
  })
  
  // ── Helpers ────────────────────────────────────────────────────────────────
  function countWorks(arr: string[]): number {
    return (arr || []).filter(c => c.trim()).length
  }
  
  function autoGrow(arr: string[], i: number) {
    if (i === arr.length - 1 && arr[i].trim()) arr.push('')
  }
  
  function removeCode(arr: string[], i: number) {
    if (arr.length > 1) arr.splice(i, 1)
    else arr[0] = ''
  }
  
  // ── Edit drawer ────────────────────────────────────────────────────────────
  const editing = ref(false)
  const selected = ref('')
  const editForm = reactive<Artist>({
    _id: '',
    name: '',
    cover: '',
    url: '',
    compilations: [''],
    mainWorks: [''],
    vr: [''],
  })
  
  function openEdit(artist: Artist) {
    Object.assign(editForm, {
      _id: artist._id,
      name: artist.name,
      cover: artist.cover,
      url: artist.url,
      compilations: [...artist.compilations, ''],
      mainWorks: [...artist.mainWorks, ''],
      vr: [...(artist.vr || []), ''],
    })
    selected.value = artist._id
    editing.value = true
  }
  
  function closeEdit() {
    editing.value = false
    selected.value = ''
  }
  
  function saveEdit() {
    const idx = artists.value.findIndex(a => a._id === editForm._id)
    if (idx === -1) return
    artists.value[idx] = {
      _id: editForm._id,
      name: editForm.name.trim(),
      cover: editForm.cover.trim(),
      url: editForm.url.trim(),
      compilations: editForm.compilations.filter(c => c.trim()) || [''],
      mainWorks: editForm.mainWorks.filter(c => c.trim()),
      vr: (editForm.vr || []).filter(c => c.trim()) || [''],
    }
    closeEdit()
  }
  
  function remove(id: string) {
    if (!confirm('Remove this artist?')) return
    artists.value = artists.value.filter(a => a._id !== id)
  }
  
  function duplicate(artist: Artist) {
    const copy: Artist = JSON.parse(JSON.stringify(artist))
    copy._id = uid()
    copy.name = copy.name + ' (copy)'
    artists.value.push(copy)
  }
  
  // ── Add modal ──────────────────────────────────────────────────────────────
  const showAddModal = ref(false)
  const newArtist = reactive({ name: '', worksRaw: '' })
  
  function addArtist() {
    if (!newArtist.name.trim()) return
    const works = newArtist.worksRaw.split(',').map(s => s.trim()).filter(Boolean)
    artists.value.push({
      _id: uid(),
      name: newArtist.name.trim(),
      cover: '',
      url: '',
      compilations: [''],
      mainWorks: works.length ? works : [''],
      vr: [''],
    })
    newArtist.name = ''
    newArtist.worksRaw = ''
    showAddModal.value = false
  }
  
  // ── Export ─────────────────────────────────────────────────────────────────
  const exportText = ref('')
  const copied = ref(false)
  
  function exportJS() {
    const clean = artists.value.map(a => ({
      name: a.name,
      cover: a.cover,
      url: a.url,
      compilations: a.compilations.length ? a.compilations : [''],
      mainWorks: a.mainWorks.length ? a.mainWorks : [''],
      vr: (a.vr || []).length ? a.vr : [''],
    }))
    const json = JSON.stringify(clean, null, 2)
    exportText.value = `export const DEFAULT_ARTISTS = ${json};\n`
  }
  
  async function copyExport() {
    await navigator.clipboard.writeText(exportText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  }
  </script>
  
  <style scoped>
  /* ── Reset & Tokens ────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  .editor-root {
    --bg: #f4f3ef;
    --bg2: #edecea;
    --surface: #ffffff;
    --border: #dddbd6;
    --text: #1a1916;
    --text2: #6b6860;
    --accent: #d4520a;
    --accent2: #1a6b3c;
    --vr: #7340c4;
    --chip-main: #e8f0fe;
    --chip-main-t: #1a4eb5;
    --chip-comp: #fef3e2;
    --chip-comp-t: #8a5000;
    --chip-vr: #f2eafe;
    --chip-vr-t: #5c28a8;
    --mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    --sans: 'DM Sans', 'Outfit', system-ui, sans-serif;
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    transition: background 0.2s, color 0.2s;
  }
  
  .editor-root.dark {
    --bg: #111110;
    --bg2: #1a1917;
    --surface: #1f1e1c;
    --border: #2e2c28;
    --text: #e8e5df;
    --text2: #918e86;
    --chip-main: #1a2640;
    --chip-main-t: #7aaaf0;
    --chip-comp: #2d2010;
    --chip-comp-t: #e8a040;
    --chip-vr: #1e1230;
    --chip-vr-t: #c09af0;
  }
  
  /* ── Top Bar ───────────────────────────────────────────────────────────── */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 52px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .top-bar__left { display: flex; align-items: center; gap: 16px; }
  .top-bar__right { display: flex; align-items: center; gap: 8px; }
  .logo { font-size: 13px; font-weight: 600; letter-spacing: 0.04em; color: var(--accent); font-family: var(--mono); }
  .stat { font-size: 12px; color: var(--text2); }
  
  /* ── Buttons ───────────────────────────────────────────────────────────── */
  .btn {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn--ghost {
    background: transparent;
    border-color: var(--border);
    color: var(--text2);
  }
  .btn--ghost:hover { background: var(--bg2); color: var(--text); }
  .btn--save {
    background: var(--accent);
    color: #fff;
  }
  .btn--save:hover { filter: brightness(1.1); }
  .btn--export {
    background: var(--text);
    color: var(--bg);
    border-color: var(--text);
  }
  .btn--export:hover { filter: brightness(1.15); }
  
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text2);
    font-size: 13px;
    padding: 4px 6px;
    border-radius: 4px;
    transition: background 0.12s, color 0.12s;
    line-height: 1;
  }
  .icon-btn:hover { background: var(--bg2); color: var(--text); }
  .icon-btn--del:hover { background: #fee2e2; color: #c0392b; }
  
  /* ── Toolbar ───────────────────────────────────────────────────────────── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-wrap: wrap;
  }
  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
    font-size: 12.5px;
    outline: none;
  }
  .search-input:focus { border-color: var(--accent); }
  
  .sort-tabs { display: flex; gap: 4px; }
  .sort-tab {
    padding: 5px 12px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text2);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s;
  }
  .sort-tab.active { background: var(--text); color: var(--bg); border-color: var(--text); }
  .sort-tab:not(.active):hover { background: var(--bg2); }
  
  /* ── Grid ──────────────────────────────────────────────────────────────── */
  .grid-area { padding: 20px 24px; }
  .artist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  
  .a-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .a-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .a-card--selected { border-color: var(--accent); background: var(--bg2); }
  
  .a-card__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .a-card__name {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    flex: 1;
    word-break: break-word;
  }
  .a-card__actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.12s; }
  .a-card:hover .a-card__actions { opacity: 1; }
  
  .a-card__counts { display: flex; gap: 5px; flex-wrap: wrap; }
  .chip {
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 99px;
    font-family: var(--mono);
    letter-spacing: 0.01em;
  }
  .chip--main { background: var(--chip-main); color: var(--chip-main-t); }
  .chip--comp { background: var(--chip-comp); color: var(--chip-comp-t); }
  .chip--vr   { background: var(--chip-vr);   color: var(--chip-vr-t); }
  
  .a-card__cover {
    margin-top: 6px;
    font-size: 10.5px;
    color: var(--text2);
  }
  .a-card__cover code { font-family: var(--mono); color: var(--accent); }
  
  .empty-state { text-align: center; color: var(--text2); padding: 60px 0; font-size: 14px; }
  .error-state { color: #c0392b; }
  
  /* ── Drawer ────────────────────────────────────────────────────────────── */
  .drawer-overlay {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0,0,0,0.45);
    display: flex; justify-content: flex-end;
  }
  .drawer {
    width: min(480px, 100vw);
    height: 100%;
    background: var(--surface);
    border-left: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .drawer__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .drawer__title { font-size: 15px; font-weight: 700; }
  .drawer__body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
  .drawer__footer {
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 8px;
    flex-shrink: 0;
  }
  
  .field-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text2);
    margin-top: 14px;
    margin-bottom: 5px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .field-count { font-size: 11px; font-weight: 600; color: var(--accent); background: var(--bg2); padding: 1px 6px; border-radius: 99px; }
  
  .field-input {
    width: 100%;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    outline: none;
    font-family: var(--sans);
  }
  .field-input.mono { font-family: var(--mono); font-size: 12px; }
  .field-input:focus { border-color: var(--accent); }
  
  .codes-area { display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px; }
  .code-row { display: flex; align-items: center; gap: 4px; }
  .code-input {
    flex: 1;
    padding: 5px 8px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
    font-size: 11.5px;
    outline: none;
  }
  .code-input:focus { border-color: var(--accent); }
  
  .add-code-btn {
    background: none;
    border: 1px dashed var(--border);
    border-radius: 5px;
    color: var(--text2);
    font-size: 11.5px;
    padding: 5px 10px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: border-color 0.12s, color 0.12s;
  }
  .add-code-btn:hover { border-color: var(--accent); color: var(--accent); }
  
  /* ── Modal ─────────────────────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 60;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    width: min(420px, 100%);
    overflow: hidden;
  }
  .modal--wide { width: min(720px, 100%); max-height: 80vh; display: flex; flex-direction: column; }
  .modal__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }
  .modal__header h3 { font-size: 14px; font-weight: 700; }
  .modal__body { padding: 16px 20px; }
  .modal__footer { padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }
  
  .export-pre {
    flex: 1;
    overflow: auto;
    padding: 16px 20px;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.6;
    color: var(--text);
    background: var(--bg);
    border: none;
    white-space: pre;
  }
  
  .copied-badge {
    font-size: 11px;
    color: var(--accent2);
    font-weight: 600;
    padding: 2px 8px;
    background: #d1fae5;
    border-radius: 99px;
  }
  
  /* ── Transitions ───────────────────────────────────────────────────────── */
  .drawer-enter-active, .drawer-leave-active { transition: transform 0.22s ease; }
  .drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
  
  .fade-enter-active, .fade-leave-active { transition: opacity 0.18s; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }
  
  .card-move { transition: transform 0.25s ease; }
  .card-enter-active { transition: opacity 0.18s, transform 0.18s; }
  .card-leave-active { transition: opacity 0.15s; position: absolute; }
  .card-enter-from { opacity: 0; transform: translateY(6px); }
  .card-leave-to { opacity: 0; }
  </style>