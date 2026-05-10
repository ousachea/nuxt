<template>
  <div class="app-wrapper">
    <div class="mesh-gradient"></div>

    <div class="container">
      <header class="header">
        <h1 class="title">Workstation Init</h1>
        <p class="subtitle">System configuration script generator</p>
      </header>

      <main class="steps-grid">
        <!-- Steps 1-3 -->
        <section v-for="(step, index) in staticSteps" :key="index" class="step-card fade-in">
          <div class="card-header">
            <span class="step-idx">0{{ index + 1 }}</span>
            <h2 class="step-label">{{ step.title }}</h2>
          </div>
          <div class="code-box">
            <code>{{ step.command }}</code>
            <button @click="copyToClipboard(step.command, index)" class="copy-btn" :class="{ 'copied': copiedIndex === index }">
              {{ copiedIndex === index ? 'Done' : 'Copy' }}
            </button>
          </div>
        </section>

        <!-- Interactive Selection -->
        <section class="step-card main-card fade-in">
          <div class="card-header justify-between">
            <div class="flex-center gap-12">
              <span class="step-idx">04</span>
              <h2 class="step-label">Application Suite</h2>
            </div>
            <div class="actions">
              <button @click="selectAll" class="ghost-btn">Select All</button>
              <button @click="selectedApps = []" class="ghost-btn">Clear</button>
            </div>
          </div>

          <div v-for="(apps, category) in categories" :key="category" class="group">
            <h3 class="group-title">{{ category }}</h3>
            <div class="chip-grid">
              <label 
                v-for="app in apps" 
                :key="app" 
                class="chip" 
                :class="{ 'active': selectedApps.includes(app) }"
                :style="{ 
                  '--app-color': getAppColor(app),
                  '--app-hover': getAppHoverColor(app)
                }"
              >
                <input type="checkbox" :value="app" v-model="selectedApps" class="hidden">
                {{ app }}
              </label>
            </div>
          </div>
          
          <Transition name="slide-up">
            <div v-if="selectedApps.length > 0" class="output-footer">
              <div class="code-box highlight">
                <code class="wrap">{{ generatedBrewCommand }}</code>
                <button @click="copyToClipboard(generatedBrewCommand, 3)" class="copy-btn primary" :class="{ 'copied': copiedIndex === 3 }">
                  {{ copiedIndex === 3 ? 'Copied!' : 'Copy Command' }}
                </button>
              </div>
            </div>
          </Transition>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const staticSteps = [
  { title: 'Homebrew', command: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' },
  { title: 'Oh My Zsh', command: 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"' },
  { title: 'Hushlogin', command: 'touch .hushlogin' }
]

const categories = {
  'Dev & Terminal': ['visual-studio-code', 'figma', 'responsively', 'keycastr', 'nucleo'],
  'Productivity': ['1password', 'google-drive', 'rectangle', 'meetingbar', 'raycast', 'only-switch', 'hiddenbar'],
  'Communication': ['telegram', 'google-chrome'],
  'Utilities': ['folx', 'iina', 'the-unarchiver', '4k-video-downloader', 'ImageOptim', 'pdf-squeezer', 'shottr', 'mylio', 'megasync', 'omnidisksweeper']
}

const allApps = Object.values(categories).flat()
const selectedApps = ref([]) 
const copiedIndex = ref(null)

// Color Generation Logic
const getHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const getAppColor = (appName) => {
  const h = getHash(appName) % 360;
  return `hsla(${h}, 65%, 92%, 1)`; // Soft pastel
}

const getAppHoverColor = (appName) => {
  const h = getHash(appName) % 360;
  return `hsla(${h}, 65%, 85%, 1)`; // Deeper pastel for contrast
}

const selectAll = () => { selectedApps.value = [...allApps] }
const generatedBrewCommand = computed(() => `brew install ${selectedApps.value.join(' ')}`)

const copyToClipboard = (text, index) => {
  navigator.clipboard.writeText(text)
  copiedIndex.value = index
  setTimeout(() => { copiedIndex.value = null }, 2000)
}
</script>

<style scoped>
:global(body) {
  margin: 0;
  background-color: #f8fafc;
  color: #334155;
  font-family: 'Inter', sans-serif;
}

.mesh-gradient {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.08) 0px, transparent 50%),
              radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.08) 0px, transparent 50%),
              radial-gradient(at 50% 100%, rgba(20, 184, 166, 0.05) 0px, transparent 50%);
  z-index: -1;
}

.container { max-width: 720px; margin: 0 auto; padding: 60px 24px; }
.header { text-align: center; margin-bottom: 48px; }
.title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; }
.subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }

.steps-grid { display: flex; flex-direction: column; gap: 16px; }
.step-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
}
.step-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }

.card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.step-idx { font-family: monospace; color: #cbd5e1; font-size: 12px; font-weight: bold; }
.step-label { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }

.code-box {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wrap { white-space: normal; word-break: break-all; }
.highlight { background: #f0fdfa; border: 1px solid #ccfbf1; margin-top: 24px; }

.group-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 20px 0 10px; }
.chip-grid { display: flex; flex-wrap: wrap; gap: 6px; }

/* Dynamic Chip Styling */
.chip {
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 100px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  color: #64748b;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.chip:hover {
  background: var(--app-color);
  border-color: var(--app-hover);
  color: #0f172a;
  transform: translateY(-2px);
}

.chip.active {
  background: var(--app-color);
  border-color: var(--app-hover);
  color: #0f172a;
  font-weight: 600;
  transform: scale(1.05);
  box-shadow: 0 4px 12px -2px var(--app-hover);
}

.copy-btn {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.copy-btn.copied { background: #10b981; border-color: #10b981; color: white; }
.primary { background: #0f172a; color: white; border: none; padding: 10px 18px; }

.ghost-btn { background: none; border: none; color: #94a3b8; font-size: 11px; cursor: pointer; }
.ghost-btn:hover { color: #0f172a; }

.hidden { display: none; }
.flex-center { display: flex; align-items: center; }
.justify-between { justify-content: space-between; }
.gap-12 { gap: 12px; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(10px); }

.fade-in { animation: enter 0.5s ease backwards; }
@keyframes enter { from { opacity: 0; transform: translateY(10px); } }
</style>