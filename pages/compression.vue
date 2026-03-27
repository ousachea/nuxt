<template>
  <div class="app">

    <!-- Header -->
    <header class="header">
      <div class="header-inner">
        <div class="logo">
          <span class="logo-icon">⬡</span>
          <span class="logo-text">COMPRESS</span>
        </div>
        <p class="tagline">Image & PDF size reduction — client-side, zero upload</p>
      </div>
    </header>

    <!-- Tab Switcher -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: mode === 'image' }" @click="switchMode('image')">
        <span class="tab-icon">◈</span> Images
      </button>
      <button class="tab-btn" :class="{ active: mode === 'pdf' }" @click="switchMode('pdf')">
        <span class="tab-icon">◧</span> PDF
      </button>
    </div>

    <main class="main">

      <!-- ════════════════════ IMAGE MODE ════════════════════ -->
      <section v-if="mode === 'image'" class="panel">

        <!-- Presets -->
        <div class="presets-bar">
          <span class="presets-label">Preset</span>
          <button
            v-for="p in imagePresets"
            :key="p.id"
            class="preset-btn"
            :class="{ active: activeImagePreset === p.id }"
            @click="applyImagePreset(p)"
          >
            <span class="preset-name">{{ p.name }}</span>
            <span class="preset-desc">{{ p.desc }}</span>
          </button>
        </div>

        <!-- Drop Zone -->
        <div
          class="drop-zone"
          :class="{ dragging: isDragging, 'has-files': imageFiles.length > 0 }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onImageDrop"
          @click="$refs.imageInput.click()"
        >
          <input ref="imageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple style="display:none" @change="onImageSelect" />
          <div class="drop-content">
            <div class="drop-icon">{{ isDragging ? '↓' : '＋' }}</div>
            <p class="drop-label">Drop images or click to select</p>
            <p class="drop-sub">JPG · PNG · WebP · GIF — multiple files OK</p>
          </div>
        </div>

        <!-- Demo files -->
        <div class="demo-bar">
          <span class="demo-label">Try demo</span>
          <button
            v-for="d in imageDemos"
            :key="d.id"
            class="demo-btn"
            :class="{ loading: d.loading }"
            @click="loadDemoImage(d)"
          >
            <span class="demo-icon">{{ d.icon }}</span>
            <span>{{ d.name }}</span>
            <span class="demo-size">{{ d.approxSize }}</span>
          </button>
        </div>

        <!-- Settings Row -->
        <div class="settings-row">
          <div class="setting-group">
            <label class="setting-label">Quality <span class="val">{{ imageQuality }}%</span></label>
            <input type="range" min="10" max="100" step="5" v-model="imageQuality" class="slider" @input="activeImagePreset = 'custom'" />
          </div>
          <div class="setting-group">
            <label class="setting-label">Max Width <span class="val">{{ maxWidthLabel }}</span></label>
            <input type="range" min="0" max="5" step="1" v-model="maxWidthIdx" class="slider" @input="activeImagePreset = 'custom'" />
          </div>
          <div class="setting-group">
            <label class="setting-label">Output Format</label>
            <div class="btn-group">
              <button
                v-for="fmt in ['original','jpeg','png','webp']"
                :key="fmt"
                class="fmt-btn"
                :class="{ active: imageFormat === fmt }"
                @click="imageFormat = fmt; activeImagePreset = 'custom'"
              >{{ fmt.toUpperCase() }}</button>
            </div>
          </div>
        </div>

        <!-- File List -->
        <div v-if="imageFiles.length > 0" class="file-list">
          <div class="list-header">
            <span>{{ imageFiles.length }} file{{ imageFiles.length > 1 ? 's' : '' }} queued</span>
            <div class="list-actions">
              <button class="ghost-btn" @click="clearImages">✕ Clear all</button>
              <button class="run-btn" :disabled="isCompressingImages" @click="compressAllImages">
                {{ isCompressingImages ? 'Compressing…' : 'Compress All' }}
              </button>
            </div>
          </div>

          <div class="file-items">
            <div v-for="(item, i) in imageFiles" :key="i" class="file-item" :class="item.status">
              <div class="file-thumb" v-if="item.preview">
                <img :src="item.preview" alt="" />
              </div>
              <div class="file-info">
                <p class="file-name">{{ item.file.name }}</p>
                <p class="file-meta">
                  <span class="size-orig">{{ formatSize(item.file.size) }}</span>
                  <template v-if="item.status === 'done'">
                    <span class="arrow">→</span>
                    <span class="size-new">{{ formatSize(item.compressedSize) }}</span>
                    <span class="saving" :class="savingClass(item)">{{ savingPct(item) }}</span>
                  </template>
                  <template v-else-if="item.status === 'compressing'">
                    <span class="status-tag processing">processing…</span>
                  </template>
                  <template v-else-if="item.status === 'error'">
                    <span class="status-tag error">failed</span>
                  </template>
                </p>
              </div>
              <div class="file-actions">
                <button v-if="item.status === 'done'" class="dl-btn" @click="downloadImage(item)">↓ Save</button>
                <button class="rm-btn" @click="removeImage(i)">✕</button>
              </div>
            </div>
          </div>

          <div v-if="imageDoneCount > 1" class="bulk-download">
            <button class="run-btn wide" @click="downloadAllImages">↓ Download All ({{ imageDoneCount }} files)</button>
          </div>
        </div>

      </section>

      <!-- ════════════════════ PDF MODE ════════════════════ -->
      <section v-if="mode === 'pdf'" class="panel">

        <!-- Presets -->
        <div class="presets-bar">
          <span class="presets-label">Preset</span>
          <button
            v-for="p in pdfPresets"
            :key="p.id"
            class="preset-btn"
            :class="{ active: activePdfPreset === p.id }"
            @click="applyPdfPreset(p)"
          >
            <span class="preset-name">{{ p.name }}</span>
            <span class="preset-desc">{{ p.desc }}</span>
          </button>
        </div>

        <!-- Drop Zone -->
        <div
          class="drop-zone"
          :class="{ dragging: isDragging, 'has-files': pdfFile !== null }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onPdfDrop"
          @click="$refs.pdfInput.click()"
        >
          <input ref="pdfInput" type="file" accept="application/pdf" style="display:none" @change="onPdfSelect" />
          <div class="drop-content">
            <div class="drop-icon">{{ isDragging ? '↓' : '＋' }}</div>
            <p class="drop-label">Drop a PDF or click to select</p>
            <p class="drop-sub">Removes metadata, duplicate objects & unused resources</p>
          </div>
        </div>

        <!-- Demo files -->
        <div class="demo-bar">
          <span class="demo-label">Try demo</span>
          <button
            v-for="d in pdfDemos"
            :key="d.id"
            class="demo-btn"
            :class="{ loading: d.loading }"
            @click="loadDemoPdf(d)"
          >
            <span class="demo-icon">{{ d.icon }}</span>
            <span>{{ d.name }}</span>
            <span class="demo-size">{{ d.approxSize }}</span>
          </button>
        </div>

        <div v-if="pdfFile" class="pdf-panel">
          <div class="pdf-info-card">
            <div class="pdf-icon">◧</div>
            <div class="pdf-details">
              <p class="file-name">{{ pdfFile.name }}</p>
              <p class="file-meta">
                <span class="size-orig">{{ formatSize(pdfFile.size) }}</span>
                <template v-if="pdfResult">
                  <span class="arrow">→</span>
                  <span class="size-new">{{ formatSize(pdfResult.size) }}</span>
                  <span class="saving" :class="pdfSavingClass">{{ pdfSavingPct }}</span>
                </template>
              </p>
            </div>
            <button class="rm-btn" @click="clearPdf">✕</button>
          </div>

          <!-- PDF Options -->
          <div class="settings-row">
            <div class="setting-group checkbox-group">
              <label class="check-label">
                <input type="checkbox" v-model="pdfOpts.removeMetadata" class="check" @change="activePdfPreset = 'custom'" />
                <span>Strip metadata</span>
              </label>
              <label class="check-label">
                <input type="checkbox" v-model="pdfOpts.removeForms" class="check" @change="activePdfPreset = 'custom'" />
                <span>Remove form fields</span>
              </label>
              <label class="check-label">
                <input type="checkbox" v-model="pdfOpts.removeAnnotations" class="check" @change="activePdfPreset = 'custom'" />
                <span>Remove annotations</span>
              </label>
            </div>
          </div>

          <div class="action-row">
            <button class="run-btn" :disabled="isCompressingPdf" @click="compressPdf">
              {{ isCompressingPdf ? 'Optimizing…' : 'Optimize PDF' }}
            </button>
            <button v-if="pdfResult" class="dl-btn" @click="downloadPdf">↓ Download</button>
          </div>

          <div v-if="pdfError" class="error-msg">{{ pdfError }}</div>
          <div v-if="pdfResult && pdfResult.size >= pdfFile.size" class="info-msg">
            ℹ PDF is already well-optimized — size unchanged or slightly larger after rewriting.
          </div>
        </div>

      </section>

    </main>

    <footer class="footer">
      <span>All processing happens locally in your browser — no files are uploaded.</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

// ── Mode ──────────────────────────────────────────────────────
const mode = ref('image')
const isDragging = ref(false)
function switchMode(m) { mode.value = m; isDragging.value = false }

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// ═══════════════════════════════════════════════════════════════
//  IMAGE PRESETS
// ═══════════════════════════════════════════════════════════════
const imagePresets = [
  { id: 'web',     name: 'Web',       desc: '80% · 1920px · WebP',  quality: 80, maxWidthIdx: 3, format: 'webp' },
  { id: 'thumb',   name: 'Thumbnail', desc: '70% · 800px · JPEG',   quality: 70, maxWidthIdx: 1, format: 'jpeg' },
  { id: 'social',  name: 'Social',    desc: '85% · 1280px · JPEG',  quality: 85, maxWidthIdx: 2, format: 'jpeg' },
  { id: 'print',   name: 'Print',     desc: '95% · None · PNG',     quality: 95, maxWidthIdx: 0, format: 'png'  },
  { id: 'max',     name: 'Max Crush', desc: '40% · 1280px · WebP',  quality: 40, maxWidthIdx: 2, format: 'webp' },
]
const activeImagePreset = ref('web')

function applyImagePreset(p) {
  activeImagePreset.value = p.id
  imageQuality.value = p.quality
  maxWidthIdx.value  = p.maxWidthIdx
  imageFormat.value  = p.format
}

// ── Image State ──────────────────────────────────────────────
const imageInput = ref(null)
const imageQuality  = ref(80)
const maxWidthIdx   = ref(3)
const imageFormat   = ref('webp')
const imageFiles    = ref([])
const isCompressingImages = ref(false)

const maxWidthOptions = [null, 800, 1280, 1920, 2560, 3840]
const maxWidthLabels  = ['None', '800px', '1280px', '1920px', '2560px', '3840px']
const maxWidthLabel   = computed(() => maxWidthLabels[maxWidthIdx.value])
const imageDoneCount  = computed(() => imageFiles.value.filter(f => f.status === 'done').length)

// ── Demo Images ───────────────────────────────────────────────
// Using picsum.photos which doesn't require auth and serves real high-res images
const imageDemos = reactive([
  {
    id: 'landscape',
    name: 'Landscape',
    approxSize: '~1.5 MB',
    icon: '🏔',
    loading: false,
    url: 'https://picsum.photos/seed/mountain/2400/1600',
    filename: 'demo-landscape.jpg',
  },
  {
    id: 'portrait',
    name: 'Portrait',
    approxSize: '~900 KB',
    icon: '🧑',
    loading: false,
    url: 'https://picsum.photos/seed/person/1200/1600',
    filename: 'demo-portrait.jpg',
  },
  {
    id: 'product',
    name: 'Product',
    approxSize: '~600 KB',
    icon: '📦',
    loading: false,
    url: 'https://picsum.photos/seed/product/1200/1200',
    filename: 'demo-product.jpg',
  },
])

async function loadDemoImage(demo) {
  if (demo.loading) return
  demo.loading = true
  try {
    const res = await fetch(demo.url)
    if (!res.ok) throw new Error('fetch ' + res.status)
    const blob = await res.blob()
    const file = new File([blob], demo.filename, { type: blob.type || 'image/jpeg' })
    await addImageFiles([file])
  } catch (e) {
    console.error('Demo image load failed:', e)
  } finally {
    demo.loading = false
  }
}

function savingPct(item) {
  if (!item.compressedSize) return ''
  const pct = (item.file.size - item.compressedSize) / item.file.size * 100
  return (pct > 0 ? '-' : '+') + Math.abs(pct).toFixed(1) + '%'
}
function savingClass(item) {
  return !item.compressedSize ? '' : item.compressedSize < item.file.size ? 'good' : 'bad'
}

function buildPreview(file) {
  return new Promise(resolve => {
    const r = new FileReader()
    r.onload = e => resolve(e.target.result)
    r.readAsDataURL(file)
  })
}

async function addImageFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const preview = await buildPreview(file)
    imageFiles.value.push({ file, preview, status: 'pending', compressedSize: null, blob: null })
  }
}

function onImageSelect(e) { addImageFiles(e.target.files) }
function onImageDrop(e)   { isDragging.value = false; addImageFiles(e.dataTransfer.files) }
function removeImage(i)   { imageFiles.value.splice(i, 1) }
function clearImages()    { imageFiles.value = [] }

async function compressAllImages() {
  const { default: imageCompression } = await import('browser-image-compression')
  isCompressingImages.value = true

  const mimeMap = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  const fileType = imageFormat.value !== 'original' ? mimeMap[imageFormat.value] : undefined
  const opts = {
    maxSizeMB: 100,
    maxWidthOrHeight: maxWidthOptions[maxWidthIdx.value] || undefined,
    useWebWorker: true,
    initialQuality: imageQuality.value / 100,
    fileType,
  }

  for (const item of imageFiles.value.filter(f => f.status === 'pending' || f.status === 'error')) {
    item.status = 'compressing'
    try {
      const compressed = await imageCompression(item.file, opts)
      item.blob = compressed
      item.compressedSize = compressed.size
      item.status = 'done'
    } catch (err) {
      console.error(err)
      item.status = 'error'
    }
  }
  isCompressingImages.value = false
}

function downloadImage(item) {
  if (!item.blob) return
  const ext = item.blob.type.split('/')[1] || 'jpg'
  const name = item.file.name.replace(/\.[^.]+$/, '') + '_compressed.' + ext
  const url = URL.createObjectURL(item.blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}
function downloadAllImages() {
  imageFiles.value.filter(f => f.status === 'done').forEach(downloadImage)
}

// ═══════════════════════════════════════════════════════════════
//  PDF PRESETS
// ═══════════════════════════════════════════════════════════════
const pdfPresets = [
  { id: 'minimal',  name: 'Minimal',  desc: 'Rewrite only',           removeMetadata: false, removeForms: false, removeAnnotations: false },
  { id: 'clean',    name: 'Clean',    desc: 'Strip metadata',          removeMetadata: true,  removeForms: false, removeAnnotations: false },
  { id: 'sharing',  name: 'Sharing',  desc: 'Metadata + annotations',  removeMetadata: true,  removeForms: false, removeAnnotations: true  },
  { id: 'archive',  name: 'Archive',  desc: 'Remove all extras',       removeMetadata: true,  removeForms: true,  removeAnnotations: true  },
]
const activePdfPreset = ref('clean')

function applyPdfPreset(p) {
  activePdfPreset.value = p.id
  pdfOpts.value.removeMetadata    = p.removeMetadata
  pdfOpts.value.removeForms       = p.removeForms
  pdfOpts.value.removeAnnotations = p.removeAnnotations
}

// ── PDF State ────────────────────────────────────────────────
const pdfInput  = ref(null)
const pdfFile   = ref(null)
const pdfResult = ref(null)
const pdfBlob   = ref(null)
const isCompressingPdf = ref(false)
const pdfError  = ref('')
const pdfOpts   = ref({ removeMetadata: true, removeForms: false, removeAnnotations: false })

const pdfSavingPct = computed(() => {
  if (!pdfResult.value || !pdfFile.value) return ''
  const pct = (pdfFile.value.size - pdfResult.value.size) / pdfFile.value.size * 100
  return (pct > 0 ? '-' : '+') + Math.abs(pct).toFixed(1) + '%'
})
const pdfSavingClass = computed(() => {
  if (!pdfResult.value || !pdfFile.value) return ''
  return pdfResult.value.size < pdfFile.value.size ? 'good' : 'bad'
})

// ── Demo PDFs (generated locally via pdf-lib — no external fetch needed) ──
const pdfDemos = reactive([
  {
    id: 'report',
    name: 'Report',
    approxSize: '~18 KB',
    icon: '📄',
    loading: false,
    pages: 8,
    title: 'Quarterly Business Report',
    subject: 'Q4 Financial Summary',
  },
  {
    id: 'manual',
    name: 'Manual',
    approxSize: '~25 KB',
    icon: '📋',
    loading: false,
    pages: 12,
    title: 'User Manual v2.4',
    subject: 'Product Documentation',
  },
])

async function loadDemoPdf(demo) {
  if (demo.loading) return
  demo.loading = true
  try {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
    const doc = await PDFDocument.create()

    // Embed fonts
    const regular = await doc.embedFont(StandardFonts.Helvetica)
    const bold    = await doc.embedFont(StandardFonts.HelveticaBold)
    const mono    = await doc.embedFont(StandardFonts.Courier)

    // Set metadata (so stripping it shows a real saving)
    doc.setTitle(demo.title)
    doc.setAuthor('Demo Generator v1.0')
    doc.setSubject(demo.subject)
    doc.setKeywords(['demo', 'test', 'compression', 'pdf', 'sample', 'document'])
    doc.setProducer('COMPRESS Demo Tool')
    doc.setCreator('pdf-lib 1.17.1')

    const gray1 = rgb(0.12, 0.12, 0.12)
    const gray2 = rgb(0.45, 0.45, 0.45)
    const gray3 = rgb(0.75, 0.75, 0.75)
    const accent = rgb(0.55, 0.82, 0.12)

    const sectionBlocks = [
      { heading: '1. Overview', lines: [
        'This document was generated to demonstrate PDF compression capabilities.',
        'It contains realistic content across multiple pages with varying structure.',
        'Metadata, fonts, and page content are all included to simulate a real-world file.',
      ]},
      { heading: '2. Key Metrics', lines: [
        'Total pages: ' + demo.pages,
        'Embedded fonts: 3 (Helvetica, Helvetica-Bold, Courier)',
        'Metadata fields: title, author, subject, keywords, producer, creator',
        'Estimated reduction after strip: 5–15% depending on preset',
      ]},
      { heading: '3. Notes', lines: [
        'The "Archive" preset removes the most data and yields the highest savings.',
        'The "Minimal" preset simply rewrites the PDF structure without removing content.',
        'For documents with embedded images, savings would be significantly higher.',
        'Object stream compression (useObjectStreams: true) is always applied.',
      ]},
    ]

    for (let pg = 0; pg < demo.pages; pg++) {
      const page = doc.addPage([595, 842])
      const { width, height } = page.getSize()

      // Header bar
      page.drawRectangle({ x: 0, y: height - 48, width, height: 48, color: rgb(0.08, 0.08, 0.08) })
      page.drawText(demo.title.toUpperCase(), { x: 24, y: height - 30, size: 11, font: bold, color: rgb(0.78, 0.95, 0.2) })
      page.drawText(`Page ${pg + 1} of ${demo.pages}`, { x: width - 90, y: height - 30, size: 9, font: regular, color: gray3 })

      let y = height - 80

      if (pg === 0) {
        // Title page
        page.drawText(demo.title, { x: 40, y: y, size: 24, font: bold, color: gray1 })
        y -= 36
        page.drawText(demo.subject, { x: 40, y, size: 14, font: regular, color: gray2 })
        y -= 48
        page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: gray3 })
        y -= 32

        for (const block of sectionBlocks) {
          page.drawText(block.heading, { x: 40, y, size: 13, font: bold, color: gray1 })
          y -= 22
          for (const line of block.lines) {
            page.drawText(line, { x: 52, y, size: 10, font: regular, color: gray2, maxWidth: width - 92 })
            y -= 16
          }
          y -= 12
        }
      } else {
        // Content pages
        const blockIdx = (pg - 1) % sectionBlocks.length
        const block = sectionBlocks[blockIdx]
        page.drawText(block.heading, { x: 40, y, size: 14, font: bold, color: gray1 })
        y -= 28

        for (let row = 0; row < 18; row++) {
          const lineIdx = row % block.lines.length
          const txt = `${String(row + 1).padStart(2, '0')}.  ${block.lines[lineIdx]}`
          page.drawText(txt, { x: 40, y, size: 10, font: row % 4 === 0 ? mono : regular, color: gray2, maxWidth: width - 80 })
          y -= 18
        }

        // A simple data-like table
        y -= 16
        const cols = ['Field', 'Value', 'Status']
        const colW = [140, 220, 100]
        let cx = 40
        page.drawRectangle({ x: 38, y: y - 2, width: width - 80, height: 20, color: rgb(0.94, 0.97, 0.85) })
        for (let ci = 0; ci < cols.length; ci++) {
          page.drawText(cols[ci], { x: cx + 6, y: y + 4, size: 9, font: bold, color: gray1 })
          cx += colW[ci]
        }
        y -= 20
        for (let row = 0; row < 5; row++) {
          cx = 40
          page.drawText(`item_${pg}_${row}`, { x: cx + 6, y: y + 3, size: 9, font: mono, color: gray2 })
          cx += colW[0]
          page.drawText(`value_${Math.random().toFixed(4)}`, { x: cx + 6, y: y + 3, size: 9, font: regular, color: gray2 })
          cx += colW[1]
          page.drawText(row % 2 === 0 ? 'OK' : 'PENDING', { x: cx + 6, y: y + 3, size: 9, font: bold, color: row % 2 === 0 ? accent : gray2 })
          y -= 16
          page.drawLine({ start: { x: 40, y: y + 12 }, end: { x: width - 40, y: y + 12 }, thickness: 0.3, color: gray3 })
        }
      }

      // Footer
      page.drawLine({ start: { x: 40, y: 36 }, end: { x: width - 40, y: 36 }, thickness: 0.5, color: gray3 })
      page.drawText('Generated by COMPRESS Demo — not a real document', { x: 40, y: 22, size: 8, font: regular, color: gray3 })
    }

    const bytes = await doc.save()
    const blob  = new Blob([bytes], { type: 'application/pdf' })
    const file  = new File([blob], `demo-${demo.id}.pdf`, { type: 'application/pdf' })
    setPdfFile(file)
  } catch (err) {
    console.error('Demo PDF generation failed', err)
  } finally {
    demo.loading = false
  }
}

function setPdfFile(file) {
  if (!file || file.type !== 'application/pdf') return
  pdfFile.value   = file
  pdfResult.value = null
  pdfBlob.value   = null
  pdfError.value  = ''
}

function onPdfSelect(e) { setPdfFile(e.target.files[0]) }
function onPdfDrop(e)   { isDragging.value = false; setPdfFile(e.dataTransfer.files[0]) }
function clearPdf() {
  pdfFile.value = null; pdfResult.value = null
  pdfBlob.value = null; pdfError.value  = ''
}

async function compressPdf() {
  if (!pdfFile.value) return
  isCompressingPdf.value = true
  pdfError.value  = ''
  pdfResult.value = null
  try {
    const { PDFDocument } = await import('pdf-lib')
    const buf    = await pdfFile.value.arrayBuffer()
    const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true })
    const newDoc = await PDFDocument.create()
    const pages  = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices())
    pages.forEach(p => newDoc.addPage(p))
    if (pdfOpts.value.removeMetadata) {
      newDoc.setTitle(''); newDoc.setAuthor(''); newDoc.setSubject('')
      newDoc.setKeywords([]); newDoc.setProducer(''); newDoc.setCreator('')
    }
    const outBytes = await newDoc.save({ useObjectStreams: true, addDefaultPage: false })
    const blob = new Blob([outBytes], { type: 'application/pdf' })
    pdfBlob.value   = blob
    pdfResult.value = { size: blob.size }
  } catch (err) {
    pdfError.value = 'Failed to process PDF: ' + err.message
  } finally {
    isCompressingPdf.value = false
  }
}

function downloadPdf() {
  if (!pdfBlob.value) return
  const name = pdfFile.value.name.replace(/\.pdf$/i, '') + '_optimized.pdf'
  const url  = URL.createObjectURL(pdfBlob.value)
  const a    = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:            #0e0e0e;
  --surface:       #161616;
  --surface2:      #1f1f1f;
  --border:        #2e2e2e;
  --border-bright: #444;
  --accent:        #c8f135;
  --text:          #f0f0f0;
  --text-muted:    #888;
  --text-dim:      #555;
  --red:           #ff4d4d;
  --green:         #4dff91;
  --radius:        2px;
  --mono:          'Space Mono', monospace;
  --sans:          'Syne', sans-serif;
}

html, body { background: var(--bg); color: var(--text); min-height: 100vh; }
.app { min-height: 100vh; display: flex; flex-direction: column; font-family: var(--sans); }

/* ── Header ── */
.header { border-bottom: 1px solid var(--border); padding: 20px 0; }
.header-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { color: var(--accent); font-size: 22px; }
.logo-text { font-family: var(--mono); font-size: 18px; font-weight: 700; letter-spacing: .15em; color: var(--accent); }
.tagline { font-size: 12px; color: var(--text-muted); font-family: var(--mono); }

/* ── Tab Bar ── */
.tab-bar { display: flex; border-bottom: 1px solid var(--border); max-width: 900px; margin: 0 auto; width: 100%; padding: 0 24px; }
.tab-btn { padding: 14px 0; margin-right: 32px; background: none; border: none; color: var(--text-muted); font-family: var(--mono); font-size: 13px; letter-spacing: .08em; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .15s, border-color .15s; display: flex; align-items: center; gap: 7px; }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-btn:hover:not(.active) { color: var(--text); }

/* ── Main ── */
.main { flex: 1; max-width: 900px; margin: 0 auto; width: 100%; padding: 28px 24px; display: flex; flex-direction: column; gap: 14px; }

/* ── Presets ── */
.presets-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.presets-label { font-family: var(--mono); font-size: 10px; color: var(--text-dim); letter-spacing: .12em; text-transform: uppercase; margin-right: 4px; flex-shrink: 0; min-width: 46px; }

.preset-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 8px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: border-color .12s, background .12s; }
.preset-btn:hover { border-color: var(--border-bright); }
.preset-btn.active { border-color: var(--accent); background: #1a1f0d; }
.preset-name { font-family: var(--sans); font-size: 13px; font-weight: 700; color: var(--text); }
.preset-btn.active .preset-name { color: var(--accent); }
.preset-desc { font-family: var(--mono); font-size: 10px; color: var(--text-dim); white-space: nowrap; }

/* ── Demo Bar ── */
.demo-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.demo-label { font-family: var(--mono); font-size: 10px; color: var(--text-dim); letter-spacing: .12em; text-transform: uppercase; margin-right: 4px; flex-shrink: 0; min-width: 46px; }
.demo-btn { display: flex; align-items: center; gap: 7px; padding: 7px 13px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-muted); font-family: var(--mono); font-size: 12px; cursor: pointer; transition: border-color .12s, color .12s; }
.demo-btn:hover:not(.loading) { border-color: var(--border-bright); color: var(--text); }
.demo-btn.loading { opacity: .5; cursor: wait; }
.demo-icon { font-size: 14px; }
.demo-size { color: var(--text-dim); font-size: 10px; }

/* ── Drop Zone ── */
.drop-zone { border: 1.5px dashed var(--border-bright); border-radius: var(--radius); padding: 44px 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--surface); transition: border-color .15s, background .15s; text-align: center; }
.drop-zone:hover, .drop-zone.dragging { border-color: var(--accent); background: #1a1f0d; }
.drop-icon { font-size: 34px; font-weight: 700; color: var(--accent); margin-bottom: 12px; }
.drop-label { font-size: 15px; font-weight: 700; margin-bottom: 5px; }
.drop-sub { font-size: 12px; color: var(--text-muted); font-family: var(--mono); }

/* ── Settings ── */
.settings-row { display: flex; gap: 20px; flex-wrap: wrap; padding: 18px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.setting-group { display: flex; flex-direction: column; gap: 8px; min-width: 130px; flex: 1; }
.setting-label { font-family: var(--mono); font-size: 11px; color: var(--text-muted); letter-spacing: .1em; text-transform: uppercase; display: flex; justify-content: space-between; }
.val { color: var(--accent); }
.slider { -webkit-appearance: none; appearance: none; width: 100%; height: 2px; background: var(--border-bright); outline: none; cursor: pointer; }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; background: var(--accent); border-radius: 50%; cursor: pointer; }
.btn-group { display: flex; gap: 4px; flex-wrap: wrap; }
.fmt-btn { padding: 4px 10px; border: 1px solid var(--border-bright); background: none; color: var(--text-muted); font-family: var(--mono); font-size: 11px; cursor: pointer; border-radius: var(--radius); transition: all .1s; }
.fmt-btn.active { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }
.fmt-btn:hover:not(.active) { color: var(--text); border-color: var(--text-muted); }

/* ── File List ── */
.file-list { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.list-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--surface2); border-bottom: 1px solid var(--border); font-family: var(--mono); font-size: 12px; color: var(--text-muted); }
.list-actions { display: flex; gap: 8px; align-items: center; }
.file-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
.file-item:last-child { border-bottom: none; }
.file-item.done { background: #0f1a05; }
.file-item.error { background: #1a0505; }
.file-item.compressing { opacity: .6; }
.file-thumb { width: 46px; height: 46px; border-radius: var(--radius); overflow: hidden; flex-shrink: 0; border: 1px solid var(--border); background: var(--surface2); }
.file-thumb img { width: 100%; height: 100%; object-fit: cover; }
.file-info { flex: 1; min-width: 0; }
.file-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.file-meta { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
.arrow { color: var(--text-dim); }
.size-new { color: var(--text); }
.saving.good { color: var(--green); font-weight: 700; }
.saving.bad  { color: var(--red);   font-weight: 700; }
.status-tag { font-size: 11px; padding: 2px 6px; border-radius: 2px; }
.status-tag.processing { background: #1a1a00; color: #aaa; }
.status-tag.error      { background: #2a0000; color: var(--red); }
.file-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.bulk-download { padding: 12px 16px; background: var(--surface2); border-top: 1px solid var(--border); }

/* ── PDF Panel ── */
.pdf-panel { display: flex; flex-direction: column; gap: 14px; }
.pdf-info-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.pdf-icon { font-size: 30px; color: var(--accent); flex-shrink: 0; }
.pdf-details { flex: 1; min-width: 0; }
.checkbox-group { flex-direction: row; gap: 16px; flex-wrap: wrap; }
.check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.check { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
.action-row { display: flex; gap: 10px; align-items: center; }
.error-msg { padding: 10px 14px; background: #1a0505; border: 1px solid #5a1010; border-radius: var(--radius); font-family: var(--mono); font-size: 12px; color: var(--red); }
.info-msg  { padding: 10px 14px; background: #0f0f18; border: 1px solid #333355; border-radius: var(--radius); font-family: var(--mono); font-size: 12px; color: #aaa; }

/* ── Buttons ── */
.run-btn { padding: 9px 20px; background: var(--accent); color: #000; border: none; font-family: var(--mono); font-size: 12px; font-weight: 700; letter-spacing: .05em; cursor: pointer; border-radius: var(--radius); transition: opacity .15s; white-space: nowrap; }
.run-btn:hover:not(:disabled) { opacity: .85; }
.run-btn:disabled { opacity: .4; cursor: not-allowed; }
.run-btn.wide { width: 100%; padding: 13px; font-size: 13px; }
.dl-btn { padding: 7px 14px; background: none; border: 1px solid var(--accent); color: var(--accent); font-family: var(--mono); font-size: 12px; cursor: pointer; border-radius: var(--radius); transition: background .1s; white-space: nowrap; }
.dl-btn:hover { background: var(--accent); color: #000; }
.ghost-btn { padding: 6px 12px; background: none; border: 1px solid var(--border-bright); color: var(--text-muted); font-family: var(--mono); font-size: 11px; cursor: pointer; border-radius: var(--radius); white-space: nowrap; }
.ghost-btn:hover { color: var(--text); border-color: var(--text-muted); }
.rm-btn { width: 28px; height: 28px; background: none; border: 1px solid var(--border); color: var(--text-dim); font-size: 13px; cursor: pointer; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rm-btn:hover { border-color: var(--red); color: var(--red); }

/* ── Footer ── */
.footer { border-top: 1px solid var(--border); padding: 16px 24px; text-align: center; font-family: var(--mono); font-size: 11px; color: var(--text-dim); }

/* ── Responsive ── */
@media (max-width: 600px) {
  .preset-btn { padding: 7px 10px; }
  .settings-row { gap: 14px; }
  .setting-group { min-width: 100%; }
  .checkbox-group { flex-direction: column; }
  .header-inner { flex-direction: column; align-items: flex-start; gap: 4px; }
  .tab-bar, .main { padding-left: 16px; padding-right: 16px; }
}
</style>