<template>
  <Transition name="app-load">
    <div v-if="!appReady" class="app-loading">
      <div class="loading-logo">W</div>
      <div class="loading-bar"><div class="loading-fill"></div></div>
    </div>
  </Transition>

  <div v-if="appReady" class="app" :class="{ dark: darkMode }" @touchstart="onAppTouchStart" @touchend="onAppTouchEnd">
    <header class="bar">
      <div class="bar-left">
        <button v-if="currentView !== 'artists'" @click="goBack" class="btn-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div v-if="currentView === 'artists'" class="stats">
          <span class="stat"><b>{{ artists.length }}</b> artists</span>
          <span class="stat-sep">/</span>
          <span class="stat"><b>{{ totalCount }}</b> works</span>
          <span class="stat-sep">/</span>
          <span class="stat"><b>{{ viewedWorks.length }}</b> viewed</span>
        </div>
        <div v-if="currentView === 'works' && currentArtist" class="bar-artist">
          <div class="bar-avatar">
            <img v-if="getProgressiveImage(currentArtist).full" :src="getProgressiveImage(currentArtist).full" @error="onImgError" />
            <span v-else>{{ currentArtist.name.charAt(0) }}</span>
          </div>
          <span class="bar-title">{{ currentArtist.name }}</span>
          <span class="bar-work-badge">
            <span class="bar-viewed-count">{{ getArtistViewedCount(currentArtist) }}</span>
            <span class="bar-total-sep">/</span>
            <span class="bar-total-count">{{ getArtistWorkCount(currentArtist) }}</span>
          </span>
        </div>
        <div v-if="currentView === 'detail' && currentArtist" class="bar-artist">
          <div class="bar-avatar">
            <img v-if="getProgressiveImage(currentArtist).full" :src="getProgressiveImage(currentArtist).full" @error="onImgError" />
            <span v-else>{{ currentArtist.name.charAt(0) }}</span>
          </div>
          <span class="bar-title bar-title--dim">{{ currentArtist.name }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="breadcrumb-arrow"><path d="M9 18l6-6-6-6"/></svg>
          <span v-if="currentWork" class="bar-title bar-title--mono">{{ currentWork.code }}</span>
        </div>
      </div>
      <div class="bar-right">
        <div class="search-box">
          <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input ref="searchInputRef" v-model="searchQuery" type="text" :placeholder="currentView === 'works' ? 'Filter works...' : 'Search...'" />
          <button v-if="searchQuery" @click="searchQuery = ''" class="search-x">&times;</button>
        </div>
        <button v-if="(currentView === 'works' || currentView === 'artists') && !isMobile"
          @click="cycleViewFilter" class="btn-filter" :class="{ active: viewFilter !== 'all' }">
          {{ viewFilter === 'all' ? 'All' : viewFilter === 'unviewed' ? 'New' : 'Seen' }}
        </button>
        <button v-if="currentView === 'works' && !isMobile" @click="compactWorks = !compactWorks"
          class="btn-icon" :class="{ active: compactWorks }" title="Compact view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </button>
        <button @click="toggleDarkMode" class="btn-icon" title="Toggle dark mode">
          <svg v-if="!darkMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
        <button v-if="(currentView === 'works' || currentView === 'artists') && isMobile"
          @click="showBottomSheet = true" class="btn-icon" :class="{ active: viewFilter !== 'all' || workSortBy !== 'default' }">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        </button>
        <div class="menu-wrap">
          <button @click="showMenu = !showMenu" class="btn-menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          <Transition name="drop">
            <div v-if="showMenu" class="menu-drop" @click="showMenu = false">
              <button @click="openAddArtistModal">Add artist</button>
              <button @click="exportData">Export data</button>
              <button @click="triggerImport">Import data</button>
              <button @click="clearViewHistory">Clear history</button>
              <button @click="hardRefresh" class="menu-danger">Reset all</button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <div v-if="showMenu" class="menu-backdrop" @click="showMenu = false"></div>
    <input ref="fileInputRef" type="file" accept=".json" hidden @change="importData" />

    <Transition :name="viewTransition" mode="out-in">

      <!-- ARTISTS VIEW -->
      <main v-if="currentView === 'artists'" key="artists" class="page"
        @touchstart="onPullStart" @touchmove="onPullMove" @touchend="onPullEnd">

        <div class="ptr-indicator" :style="{ height: pullDistance + 'px', opacity: pullOpacity }">
          <svg :style="{ transform: `rotate(${pullRotation}deg)` }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </div>

        <div v-if="alphabeticalGroups.length > 3" class="alpha-rail">
          <button v-for="letter in allLetters" :key="letter" @click="scrollToLetter(letter)"
            :class="{ active: alphabeticalGroups.includes(letter) }"
            :disabled="!alphabeticalGroups.includes(letter)">{{ letter }}</button>
        </div>

        <div v-for="letter in alphabeticalGroups" :key="letter" :ref="el => { if (el) groupRefs[letter] = el }" class="group">
          <div class="group-head">
            <span class="letter">{{ letter }}</span>
            <span class="group-n">{{ groupedArtists[letter].length }}</span>
          </div>
          <div class="grid-artists">
            <div v-for="artist in groupedArtists[letter]" :key="artist.name" class="a-card"
              :class="{ 'a-card--dim': viewedArtists.includes(artist.name) && viewFilter === 'all' }"
              @click="selectArtist(artist.name)"
              @mouseenter="preloadArtistImage(artist)">
              <div class="a-img">
                <div class="skeleton" :class="{ 'skeleton--hidden': !getProgressiveImage(artist).full }"></div>
                <img v-if="getProgressiveImage(artist).full" :src="getProgressiveImage(artist).full"
                  :alt="artist.name" loading="lazy" class="fade-img" @load="onImgLoad" @error="onImgError" />
                <div v-else class="a-ph">{{ artist.name.charAt(0) }}</div>
                <div class="a-overlay">
                  <span class="a-name">{{ artist.name }}</span>
                  <span class="a-count">{{ getArtistViewedCount(artist) }}/{{ getArtistWorkCount(artist) }}</span>
                </div>
                <div v-if="getArtistWorkCount(artist) > 0" class="progress-bar">
                  <div class="progress-fill" :style="{ width: getArtistProgress(artist) + '%' }"></div>
                </div>
                <span v-if="getArtistProgress(artist) === 100" class="badge-check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredArtists.length === 0" class="empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6"/></svg>
          <p>No artists found</p>
        </div>
      </main>

      <!-- WORKS VIEW -->
      <main v-else-if="currentView === 'works'" key="works" class="page">
        <div class="works-top">
          <div class="works-info">
            <div class="chips">
              <span v-if="currentArtist?.mainWorks?.length" class="chip">{{ currentArtist.mainWorks.length }} main</span>
              <span v-if="currentArtist?.compilations?.length" class="chip">{{ currentArtist.compilations.length }} comp</span>
              <span class="chip chip--progress">{{ getArtistProgress(currentArtist) }}% viewed</span>
              <a v-if="currentArtist?.url" :href="currentArtist.url" target="_blank" rel="noopener noreferrer" class="chip chip--url">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Profile
              </a>
            </div>
          </div>
          <div class="works-actions">
            <select v-if="!isMobile" v-model="workSortBy" class="sort-select">
              <option value="default">Default</option>
              <option value="codeAsc">Code A-Z</option>
              <option value="codeDesc">Code Z-A</option>
              <option value="newest">Newest</option>
              <option value="unviewed">Unviewed first</option>
            </select>
            <button @click="openAddWorkModal" class="btn-add">+ Add</button>
          </div>
        </div>
        <div v-for="section in workSections" :key="section.key">
          <div v-if="section.items.length" class="w-section">
            <div class="w-head">
              <span class="w-label">{{ section.label }}</span>
              <span class="w-n">{{ section.items.length }}</span>
            </div>
            <div class="grid-works" :class="{ 'grid-works--compact': compactWorks }">
              <div v-for="work in section.items" :key="work.code" class="w-card"
                :class="{ 'w-card--dim': viewedWorks.includes(work.code) && viewFilter === 'all' }"
                @click="openWorkView(work)">
                <div class="w-img">
                  <div class="skeleton" :class="{ 'skeleton--hidden': !getProgressiveWorkImage(work).full }"></div>
                  <img :src="getProgressiveWorkImage(work).full" :alt="work.code" loading="lazy"
                    class="fade-img" @load="onImgLoad" @error="onImgError" />
                  <span v-if="isCoverWork(currentArtist.name, work.code)" class="badge-star">*</span>
                  <span v-if="viewedWorks.includes(work.code)" class="badge-check badge-check--tl">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                </div>
                <span class="w-code">{{ work.code }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="filteredMainWorks.length === 0 && filteredCompilations.length === 0" class="empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
          <p>{{ searchQuery || viewFilter !== 'all' ? 'No matches' : 'No works yet' }}</p>
        </div>
      </main>

      <!-- DETAIL VIEW -->
      <main v-else-if="currentView === 'detail'" key="detail" class="page"
        @touchstart="onDetailTouchStart" @touchend="onDetailTouchEnd">
        <div class="detail">
          <div class="detail-left">
            <div class="big-img" @click="openLightbox(currentWork, 0)">
              <div class="skeleton"></div>
              <img :src="getProgressiveWorkImage(currentWork).full" :alt="currentWork.code" class="fade-img" @load="onImgLoad" @error="onImgError" />
            </div>
            <div class="actions">
              <div class="act-group">
                <button @click="setCoverWork(currentArtist.name, currentWork.code)" class="act" :class="{ 'act--on': isCoverWork(currentArtist.name, currentWork.code) }">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  {{ isCoverWork(currentArtist.name, currentWork.code) ? 'Cover' : 'Set cover' }}
                </button>
                <button @click="openUploadModal(currentWork.code)" class="act">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {{ hasCustomImage(currentWork.code) ? 'Update img' : 'Add image' }}
                </button>
              </div>
              <div class="act-group">
                <button @click="copyToClipboard(currentWork.code)" class="act act--copy">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  Copy code
                </button>
              </div>
            </div>
          </div>
          <div class="detail-right">
            <h1 class="d-code">{{ currentWork.code }}</h1>
            <a v-if="currentArtist?.url" :href="currentArtist.url" target="_blank" rel="noopener noreferrer" class="artist-url-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              {{ currentArtist.url }}
            </a>
            <div class="detail-section">
              <div class="section-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Watch on
              </div>
              <div class="link-grid">
                <button v-for="link in externalLinks" :key="link.key" @click="openExternalLink(currentWork.code, link.key)" class="link-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  {{ link.label }}
                </button>
              </div>
            </div>
            <div v-if="currentWorkList.length > 1" class="nav-row">
              <button @click="navigateWork(-1)" :disabled="!canNavigateWork(-1)" class="nav-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span class="nav-pos">{{ currentWorkIndex + 1 }} <small>of {{ currentWorkList.length }}</small></span>
              <button @click="navigateWork(1)" :disabled="!canNavigateWork(1)" class="nav-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            <div class="detail-section">
              <div class="section-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Gallery
                <button @click="preloadAllGallery" class="btn-sm" :disabled="isPreloading">{{ isPreloading ? '...' : 'Load all' }}</button>
              </div>
              <div class="gallery" v-if="!galleryAllFailed">
                <div v-for="i in 20" :key="i" class="thumb" @click="openLightbox(currentWork, i)" v-show="!galleryFailed.includes(i)">
                  <div class="skeleton"></div>
                  <img :src="getImageUrl(currentWork.code, 'jp-' + i)" loading="lazy"
                    class="fade-img" @load="onGalleryImgLoad($event, i)" @error="onGalleryImgError($event, i)" />
                  <span class="t-n">{{ i }}</span>
                </div>
              </div>
              <div v-if="galleryAllFailed" class="gallery-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>No gallery images available</p>
              </div>
            </div>
          </div>
        </div>
      </main>

    </Transition>

    <!-- Add Work Modal -->
    <Transition name="m">
      <div v-if="showAddWorkModal" class="overlay" @click.self="closeAddWorkModal">
        <div class="modal">
          <div class="m-head"><h3>Add work</h3><button @click="closeAddWorkModal" class="m-x">&times;</button></div>
          <div class="m-body">
            <label class="field"><span>Artist</span>
              <select v-model="newWork.artist">
                <option value="">Select...</option>
                <option v-for="a in artists" :key="a.name" :value="a.name">{{ a.name }}</option>
              </select>
            </label>
            <label class="field"><span>Code</span><input v-model="newWork.code" placeholder="e.g. ABC-123" /></label>
            <div class="radios">
              <label class="radio"><input v-model="newWork.type" type="radio" value="mainWorks" /><span>Main</span></label>
              <label class="radio"><input v-model="newWork.type" type="radio" value="compilations" /><span>Compilation</span></label>
            </div>
          </div>
          <div class="m-foot">
            <button @click="closeAddWorkModal" class="btn-flat">Cancel</button>
            <button @click="addNewWork" class="btn-fill">Add</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add Artist Modal -->
    <Transition name="m">
      <div v-if="showAddArtistModal" class="overlay" @click.self="showAddArtistModal = false">
        <div class="modal">
          <div class="m-head"><h3>Add artist</h3><button @click="showAddArtistModal = false" class="m-x">&times;</button></div>
          <div class="m-body">
            <label class="field"><span>Name</span><input v-model="newArtistName" placeholder="Artist name" @keyup.enter="addNewArtist" /></label>
            <label class="field">
              <span>Profile URL <em style="font-style:normal;font-weight:400;text-transform:none;letter-spacing:0">(optional)</em></span>
              <input v-model="newArtistUrl" placeholder="https://..." />
            </label>
          </div>
          <div class="m-foot">
            <button @click="showAddArtistModal = false" class="btn-flat">Cancel</button>
            <button @click="addNewArtist" class="btn-fill">Add</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Upload Modal -->
    <Transition name="m">
      <div v-if="showUploadModal" class="overlay" @click.self="closeUploadModal">
        <div class="modal">
          <div class="m-head"><h3>Custom image</h3><button @click="closeUploadModal" class="m-x">&times;</button></div>
          <div class="m-body">
            <p class="m-sub">{{ uploadingWork }}</p>
            <label class="field"><span>Image URL</span><input v-model="customImageUrl" placeholder="https://..." @keyup.enter="handleCustomImageUrl" /></label>
            <p class="hint">Leave empty to remove</p>
          </div>
          <div class="m-foot">
            <button @click="closeUploadModal" class="btn-flat">Cancel</button>
            <button @click="handleCustomImageUrl" class="btn-fill">{{ customImageUrl.trim() ? 'Save' : 'Remove' }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Lightbox -->
    <Transition name="fade">
      <div v-if="lightbox.show" class="lb" @click.self="closeLightbox">
        <button class="lb-close" @click="closeLightbox">&times;</button>
        <button v-if="lightbox.images.length > 1" class="lb-arr lb-arr--left" @click="prevImage" :disabled="lightbox.currentIndex === 0">&lt;</button>
        <div class="lb-main"><img :src="lightbox.images[lightbox.currentIndex]" @error="onImgError" /></div>
        <button v-if="lightbox.images.length > 1" class="lb-arr lb-arr--right" @click="nextImage" :disabled="lightbox.currentIndex === lightbox.images.length - 1">&gt;</button>
        <span class="lb-count">{{ lightbox.currentIndex + 1 }} / {{ lightbox.images.length }}</span>
      </div>
    </Transition>

    <!-- Mobile Bottom Sheet -->
    <Transition name="sheet">
      <div v-if="showBottomSheet" class="sheet-backdrop" @click="showBottomSheet = false">
        <div class="bottom-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <div class="sheet-title">Filter & Sort</div>
          <div class="sheet-section">
            <div class="sheet-label">Show</div>
            <div class="sheet-pills">
              <button v-for="opt in [['all','All'],['unviewed','New'],['viewed','Seen']]" :key="opt[0]"
                @click="viewFilter = opt[0]" class="pill" :class="{ 'pill--active': viewFilter === opt[0] }">{{ opt[1] }}</button>
            </div>
          </div>
          <div v-if="currentView === 'works'" class="sheet-section">
            <div class="sheet-label">Sort by</div>
            <div class="sheet-pills">
              <button v-for="opt in [['default','Default'],['codeAsc','A→Z'],['codeDesc','Z→A'],['newest','Newest'],['unviewed','Unviewed']]" :key="opt[0]"
                @click="workSortBy = opt[0]" class="pill" :class="{ 'pill--active': workSortBy === opt[0] }">{{ opt[1] }}</button>
            </div>
          </div>
          <div class="sheet-section">
            <div class="sheet-label">Density</div>
            <div class="sheet-pills">
              <button @click="compactWorks = false" class="pill" :class="{ 'pill--active': !compactWorks }">Normal</button>
              <button @click="compactWorks = true" class="pill" :class="{ 'pill--active': compactWorks }">Compact</button>
            </div>
          </div>
          <button @click="showBottomSheet = false" class="sheet-done">Done</button>
        </div>
      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">{{ toast.message }}</div>
    </Transition>

    <div class="shortcut-hint" :class="{ 'shortcut-hint--visible': showShortcutHint }">
      <kbd>/</kbd> to search
    </div>
  </div>
</template>

<script setup>
import { DEFAULT_ARTISTS } from '~/data/artists.js'
import { normalizeArtists } from '~/utils/artistHelpers.js'

const codeCache = new Map()
function parseCode(code) {
  if (!code) return null
  if (codeCache.has(code)) return codeCache.get(code)
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const m = clean.match(/^([A-Z]+)(\d+)$/)
  const r = m
    ? { full: clean, prefix: m[1].toLowerCase(), number: m[2], rawNumber: parseInt(m[2], 10) }
    : { full: clean, prefix: clean.toLowerCase(), number: '001', rawNumber: 1 }
  codeCache.set(code, r)
  return r
}

class ImageDB {
  constructor() { this.dbName = 'WorksTrackerDB'; this.storeName = 'customImages'; this.db = null }
  init() {
    return new Promise(res => {
      if (!window.indexedDB) return res(false)
      const req = indexedDB.open(this.dbName, 1)
      req.onerror = () => res(false)
      req.onsuccess = () => { this.db = req.result; res(true) }
      req.onupgradeneeded = e => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName, { keyPath: 'code' })
      }
    })
  }
  getAll() {
    if (!this.db) return Promise.resolve({})
    return new Promise(res => {
      const t = this.db.transaction([this.storeName], 'readonly').objectStore(this.storeName).getAll()
      t.onsuccess = () => { const r = {}; t.result.forEach(i => r[i.code] = i.data); res(r) }
      t.onerror = () => res({})
    })
  }
  set(code, data) {
    if (!this.db) return Promise.resolve(false)
    return new Promise(res => {
      const t = this.db.transaction([this.storeName], 'readwrite').objectStore(this.storeName).put({ code, data })
      t.onsuccess = () => res(true); t.onerror = () => res(false)
    })
  }
  clear() {
    if (!this.db) return Promise.resolve(false)
    return new Promise(res => {
      const t = this.db.transaction([this.storeName], 'readwrite').objectStore(this.storeName).clear()
      t.onsuccess = () => res(true); t.onerror = () => res(false)
    })
  }
}

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const EXTERNAL_LINKS = [
  { key: 'njav', label: 'NJAV' },
  { key: 'missav', label: 'MissAV' },
  { key: '24av', label: '24AV' },
  { key: 'javtrailers', label: 'JavTrailers' }
]
const PULL_THRESHOLD = 70

const appReady = ref(false)
const darkMode = ref(false)
const isMobile = ref(false)
const currentView = ref('artists')
const viewTransition = ref('slide-right')
const activeTab = ref('')
const searchQuery = ref('')
const artistSortBy = ref('nameAsc')
const workSortBy = ref('default')
const viewFilter = ref('all')
const compactWorks = ref(false)
const artists = ref(normalizeArtists(JSON.parse(JSON.stringify(DEFAULT_ARTISTS))))
const currentWork = ref(null)
const currentWorkList = ref([])
const currentWorkIndex = ref(0)
const customImages = ref({})
const viewedArtists = ref([])
const viewedWorks = ref([])
const showAddWorkModal = ref(false)
const showUploadModal = ref(false)
const showAddArtistModal = ref(false)
const showBottomSheet = ref(false)
const showMenu = ref(false)
const newWork = ref({ artist: '', code: '', type: 'mainWorks' })
const newArtistName = ref('')
const newArtistUrl = ref('')
const uploadingWork = ref(null)
const customImageUrl = ref('')
const lightbox = ref({ show: false, images: [], currentIndex: 0, code: '' })
const toast = ref({ show: false, message: '', type: 'success' })
const isPreloading = ref(false)
const imageDB = ref(null)
const useLocalStorageFallback = ref(false)
const customImagesLoaded = ref(false)
const scrollPositions = ref({})
const touchStartX = ref(0); const touchStartY = ref(0)
const touchEndX = ref(0); const touchEndY = ref(0)
const detailTouchStartX = ref(0); const detailTouchStartY = ref(0)
const appTouchStartX = ref(0); const appTouchStartY = ref(0)
const allLetters = ALL_LETTERS
const externalLinks = EXTERNAL_LINKS
const galleryFailed = ref([])
const galleryLoadedCount = ref(0)
const showShortcutHint = ref(false)
const searchInputRef = ref(null)
const fileInputRef = ref(null)
const groupRefs = ref({})
let lightboxTouchStart = null
let lightboxTouchEnd = null
const pullStartY = ref(0)
const pullDistance = ref(0)
const isPullRefreshing = ref(false)

const totalCount = computed(() =>
  artists.value.reduce((s, a) => s + (a.mainWorks?.length || 0) + (a.compilations?.length || 0), 0)
)
const currentArtist = computed(() => artists.value.find(a => a.name === activeTab.value))
const sortedArtists = computed(() => {
  const arr = [...artists.value]
  const sorts = {
    nameAsc: (a, b) => a.name.localeCompare(b.name),
    nameDesc: (a, b) => b.name.localeCompare(a.name),
    mostWorks: (a, b) => getArtistWorkCount(b) - getArtistWorkCount(a),
    leastWorks: (a, b) => getArtistWorkCount(a) - getArtistWorkCount(b)
  }
  return arr.sort(sorts[artistSortBy.value] || sorts.nameAsc)
})
const filteredArtists = computed(() => {
  let list = sortedArtists.value
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }
  if (viewFilter.value === 'unviewed') list = list.filter(a => !viewedArtists.value.includes(a.name))
  else if (viewFilter.value === 'viewed') list = list.filter(a => viewedArtists.value.includes(a.name))
  return list
})
const groupedArtists = computed(() => {
  const g = {}
  filteredArtists.value.forEach(a => {
    const l = a.name.charAt(0).toUpperCase()
    if (!g[l]) g[l] = []
    g[l].push(a)
  })
  return g
})
const alphabeticalGroups = computed(() => Object.keys(groupedArtists.value).sort())
const filteredMainWorks = computed(() => {
  if (!currentArtist.value?.mainWorks) return []
  return applySortAndFilter([...currentArtist.value.mainWorks])
})
const filteredCompilations = computed(() => {
  if (!currentArtist.value?.compilations) return []
  return applySortAndFilter([...currentArtist.value.compilations])
})
const workSections = computed(() => [
  { key: 'main', label: 'Main Works', items: filteredMainWorks.value },
  { key: 'comp', label: 'Compilations', items: filteredCompilations.value }
])
const galleryAllFailed = computed(() => galleryFailed.value.length >= 20)
const pullOpacity = computed(() => Math.min(pullDistance.value / PULL_THRESHOLD, 1))
const pullRotation = computed(() => isPullRefreshing.value ? 360 : (pullDistance.value / PULL_THRESHOLD) * 180)

watch(artists, v => { if (import.meta.client) try { localStorage.setItem('artists', JSON.stringify(v)) } catch {} }, { deep: true })
watch(customImages, v => saveCustomImagesToDB(v), { deep: true })
watch(viewedArtists, v => { if (import.meta.client) localStorage.setItem('viewedArtists', JSON.stringify(v)) }, { deep: true })
watch(viewedWorks, v => { if (import.meta.client) localStorage.setItem('viewedWorks', JSON.stringify(v)) }, { deep: true })
watch(artistSortBy, v => { if (import.meta.client) localStorage.setItem('artistSortBy', v) })
watch(darkMode, v => {
  if (import.meta.client) {
    localStorage.setItem('darkMode', v ? '1' : '0')
    document.documentElement.classList.toggle('dark', v)
  }
})
watch(compactWorks, v => { if (import.meta.client) localStorage.setItem('compactWorks', v ? '1' : '0') })
watch(currentWork, () => { galleryFailed.value = []; galleryLoadedCount.value = 0 })

onMounted(() => {
  imageDB.value = new ImageDB()
  isMobile.value = window.innerWidth <= 768
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 }, { passive: true })
  initializeApp()
  setupKeyboardShortcuts()
})
onBeforeUnmount(() => {
  if (window._worksTrackerKeydown) document.removeEventListener('keydown', window._worksTrackerKeydown)
})

function onPullStart(e) {
  if (window.scrollY > 0) return
  pullStartY.value = e.touches[0].clientY
}
function onPullMove(e) {
  if (isPullRefreshing.value || window.scrollY > 0) { pullDistance.value = 0; return }
  const dy = e.touches[0].clientY - pullStartY.value
  if (dy < 0) { pullDistance.value = 0; return }
  pullDistance.value = Math.min(dy * 0.5, PULL_THRESHOLD + 20)
}
function onPullEnd() {
  if (pullDistance.value >= PULL_THRESHOLD && !isPullRefreshing.value) {
    isPullRefreshing.value = true
    pullDistance.value = 40
    setTimeout(() => {
      try {
        const s = localStorage.getItem('artists')
        if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) artists.value = normalizeArtists(p) }
        const va = localStorage.getItem('viewedArtists'); if (va) viewedArtists.value = JSON.parse(va)
        const vw = localStorage.getItem('viewedWorks'); if (vw) viewedWorks.value = JSON.parse(vw)
      } catch {}
      pullDistance.value = 0
      isPullRefreshing.value = false
      showToast('Refreshed')
    }, 800)
  } else {
    pullDistance.value = 0
  }
}

function preloadArtistImage(artist) {
  const img = getProgressiveImage(artist)
  if (img.full) { const i = new Image(); i.src = img.full }
}

function toggleDarkMode() { darkMode.value = !darkMode.value }

function applySortAndFilter(list) {
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(w => w.code.toLowerCase().includes(q))
  }
  if (viewFilter.value === 'unviewed') list = list.filter(w => !viewedWorks.value.includes(w.code))
  else if (viewFilter.value === 'viewed') list = list.filter(w => viewedWorks.value.includes(w.code))
  if (workSortBy.value === 'codeAsc') list.sort((a, b) => a.code.localeCompare(b.code))
  else if (workSortBy.value === 'codeDesc') list.sort((a, b) => b.code.localeCompare(a.code))
  else if (workSortBy.value === 'newest') list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
  else if (workSortBy.value === 'unviewed') list.sort((a, b) =>
    (viewedWorks.value.includes(a.code) ? 1 : 0) - (viewedWorks.value.includes(b.code) ? 1 : 0)
  )
  return list
}

function initializeApp() {
  imageDB.value.init().then(ok => {
    if (ok) return imageDB.value.getAll().then(imgs => { customImages.value = imgs || {} })
    useLocalStorageFallback.value = true
    const s = localStorage.getItem('customImages'); if (s) customImages.value = JSON.parse(s)
  }).catch(() => {
    useLocalStorageFallback.value = true
    try { const s = localStorage.getItem('customImages'); if (s) customImages.value = JSON.parse(s) } catch {}
  }).then(() => {
    customImagesLoaded.value = true
    const loads = [
      ['artists', v => { const p = JSON.parse(v); if (Array.isArray(p) && p.length) artists.value = normalizeArtists(p) }],
      ['viewedArtists', v => { viewedArtists.value = JSON.parse(v) }],
      ['viewedWorks', v => { viewedWorks.value = JSON.parse(v) }],
      ['artistSortBy', v => { artistSortBy.value = v }],
      ['darkMode', v => { darkMode.value = v === '1'; document.documentElement.classList.toggle('dark', darkMode.value) }],
      ['compactWorks', v => { compactWorks.value = v === '1' }]
    ]
    loads.forEach(([key, fn]) => { try { const v = localStorage.getItem(key); if (v !== null) fn(v) } catch {} })
    setTimeout(() => { appReady.value = true }, 80)
  })
}

function setupKeyboardShortcuts() {
  const handler = e => {
    const tag = document.activeElement?.tagName
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    if (e.key === '/' && !isInput) { e.preventDefault(); searchInputRef.value?.focus(); searchInputRef.value?.select(); return }
    if (e.key === 'Escape') {
      if (showMenu.value) { showMenu.value = false; return }
      if (showBottomSheet.value) { showBottomSheet.value = false; return }
      if (lightbox.value.show) { closeLightbox(); return }
      if (showAddWorkModal.value) { closeAddWorkModal(); return }
      if (showAddArtistModal.value) { showAddArtistModal.value = false; return }
      if (showUploadModal.value) { closeUploadModal(); return }
      if (currentView.value === 'detail') { backToWorks(); return }
      if (currentView.value === 'works') backToArtists()
    }
    if (lightbox.value.show) { if (e.key === 'ArrowLeft') prevImage(); if (e.key === 'ArrowRight') nextImage() }
    if (currentView.value === 'detail' && !lightbox.value.show) {
      if (e.key === 'ArrowLeft' && canNavigateWork(-1)) navigateWork(-1)
      if (e.key === 'ArrowRight' && canNavigateWork(1)) navigateWork(1)
    }
  }
  window._worksTrackerKeydown = handler
  document.addEventListener('keydown', handler)
  setTimeout(() => {
    if (currentView.value === 'artists') {
      showShortcutHint.value = true
      setTimeout(() => showShortcutHint.value = false, 3000)
    }
  }, 1500)
}

function cycleViewFilter() {
  viewFilter.value = viewFilter.value === 'all' ? 'unviewed' : viewFilter.value === 'unviewed' ? 'viewed' : 'all'
}
function onImgLoad(e) { e.target.classList.add('loaded'); const sk = e.target.parentElement?.querySelector('.skeleton'); if (sk) sk.style.display = 'none' }
function onImgError(e) { e.target.style.display = 'none'; const sk = e.target.parentElement?.querySelector('.skeleton'); if (sk) sk.style.display = 'none' }
function onGalleryImgLoad(e, index) { e.target.classList.add('loaded'); galleryLoadedCount.value++ }
function onGalleryImgError(e, index) {
  e.target.style.display = 'none'
  const thumb = e.target.parentElement
  if (thumb) { const sk = thumb.querySelector('.skeleton'); if (sk) sk.style.display = 'none' }
  if (!galleryFailed.value.includes(index)) galleryFailed.value.push(index)
}
function goBack() { viewTransition.value = 'slide-left'; currentView.value === 'detail' ? backToWorks() : backToArtists() }
function getArtistWorkCount(a) { return (a?.mainWorks?.length || 0) + (a?.compilations?.length || 0) }
function getArtistViewedCount(artist) {
  if (!artist) return 0
  return [...(artist.mainWorks || []), ...(artist.compilations || [])].filter(w => viewedWorks.value.includes(w.code)).length
}
function getArtistProgress(artist) {
  if (!artist) return 0
  const total = getArtistWorkCount(artist)
  return total === 0 ? 0 : Math.round((getArtistViewedCount(artist) / total) * 100)
}
function getProgressiveImage(artist) { const cw = getCoverWork(artist); return cw ? getProgressiveWorkImage(cw) : { full: null } }
function getProgressiveWorkImage(work) {
  if (!work) return { full: null }
  if (customImages.value[work.code]) return { full: customImages.value[work.code] }
  const p = parseCode(work.code); if (!p) return { full: null }
  const id = p.prefix + ('00000' + p.number).slice(-5); if (id.length < 3) return { full: null }
  return { thumb: `https://pics.dmm.co.jp/digital/video/${id}/${id}ps.jpg`, full: `https://pics.dmm.co.jp/digital/video/${id}/${id}pl.jpg` }
}
function getImageUrl(code, quality) {
  if (!quality) quality = 'pl'
  if (quality === 'pl' && customImages.value[code]) return customImages.value[code]
  const p = parseCode(code); if (!p) return null
  const id = p.prefix + ('00000' + p.number).slice(-5); if (id.length < 3) return null
  if (quality !== 'pl') { const n = quality.split('-')[1] || '1'; return `https://pics.dmm.co.jp/digital/video/${id}/${id}jp-${n}.jpg` }
  return `https://pics.dmm.co.jp/digital/video/${id}/${id}pl.jpg`
}
function hasCustomImage(code) { return !!customImages.value[code] }
function getCoverWork(artist) {
  if (artist.cover) {
    const all = [...(artist.mainWorks || []), ...(artist.compilations || [])]
    const f = all.find(w => w.code === artist.cover); if (f) return f
  }
  return artist.mainWorks?.[0] || artist.compilations?.[0] || null
}
function scrollToLetter(letter) { const el = groupRefs.value[letter]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
function selectArtist(name) {
  viewTransition.value = 'slide-right'; saveScrollPosition('artists')
  if (!viewedArtists.value.includes(name)) viewedArtists.value.push(name)
  activeTab.value = name; currentView.value = 'works'; searchQuery.value = ''; workSortBy.value = 'default'; viewFilter.value = 'all'
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}
function backToArtists() {
  viewTransition.value = 'slide-left'
  currentView.value = 'artists'; activeTab.value = ''; searchQuery.value = ''; viewFilter.value = 'all'
  nextTick(() => setTimeout(() => restoreScrollPosition('artists'), 220))
}
function openWorkView(work) {
  viewTransition.value = 'slide-right'; saveScrollPosition('works')
  if (!viewedWorks.value.includes(work.code)) viewedWorks.value.push(work.code)
  const isMain = currentArtist.value?.mainWorks?.find(w => w.code === work.code)
  currentWorkList.value = isMain ? filteredMainWorks.value : filteredCompilations.value
  currentWorkIndex.value = currentWorkList.value.findIndex(w => w.code === work.code)
  currentWork.value = work; currentView.value = 'detail'
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}
function backToWorks() {
  viewTransition.value = 'slide-left'; currentWork.value = null; currentView.value = 'works'
  nextTick(() => setTimeout(() => restoreScrollPosition('works'), 220))
}
function saveScrollPosition(v) { if (import.meta.client) scrollPositions.value[v] = window.scrollY || 0 }
function restoreScrollPosition(v) {
  const pos = scrollPositions.value[v] || 0
  if (import.meta.client) requestAnimationFrame(() => window.scrollTo({ top: pos, behavior: 'instant' }))
}
function navigateWork(dir) {
  const i = currentWorkIndex.value + dir
  if (i >= 0 && i < currentWorkList.value.length) {
    currentWorkIndex.value = i; currentWork.value = currentWorkList.value[i]
    if (!viewedWorks.value.includes(currentWork.value.code)) viewedWorks.value.push(currentWork.value.code)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
function canNavigateWork(dir) { const i = currentWorkIndex.value + dir; return i >= 0 && i < currentWorkList.value.length }
function onDetailTouchStart(e) { detailTouchStartX.value = e.changedTouches[0].screenX; detailTouchStartY.value = e.changedTouches[0].screenY }
function onDetailTouchEnd(e) {
  const dx = e.changedTouches[0].screenX - detailTouchStartX.value
  const dy = e.changedTouches[0].screenY - detailTouchStartY.value
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
    if (dx > 0 && canNavigateWork(-1)) navigateWork(-1); else if (dx < 0 && canNavigateWork(1)) navigateWork(1)
  }
}
function onAppTouchStart(e) { appTouchStartX.value = e.changedTouches[0].screenX; appTouchStartY.value = e.changedTouches[0].screenY }
function onAppTouchEnd(e) {
  if (currentView.value !== 'works') return
  if (showAddWorkModal.value || showUploadModal.value || showAddArtistModal.value || lightbox.value.show) return
  const dx = e.changedTouches[0].screenX - appTouchStartX.value
  const dy = e.changedTouches[0].screenY - appTouchStartY.value
  if (dx > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) goBack()
}
function isCoverWork(name, code) { const a = artists.value.find(x => x.name === name); return a && a.cover === code }
function setCoverWork(name, code) {
  const a = artists.value.find(x => x.name === name)
  if (a) { a.cover = code; artists.value = [...artists.value] }
  showToast('Cover updated')
}
function openAddArtistModal() { newArtistName.value = ''; newArtistUrl.value = ''; showAddArtistModal.value = true }
function addNewArtist() {
  const name = newArtistName.value.trim()
  if (!name) return showToast('Name required', 'error')
  if (artists.value.find(a => a.name.toLowerCase() === name.toLowerCase())) return showToast('Artist exists', 'error')
  artists.value = [...artists.value, { name, url: newArtistUrl.value.trim(), mainWorks: [], compilations: [], cover: '' }]
  showAddArtistModal.value = false; showToast('Added ' + name)
}
function openAddWorkModal() { newWork.value = { artist: activeTab.value || '', code: '', type: 'mainWorks' }; showAddWorkModal.value = true }
function closeAddWorkModal() { showAddWorkModal.value = false }
function addNewWork() {
  if (!newWork.value.artist || !newWork.value.code) return showToast('Required fields', 'error')
  const code = newWork.value.code.toUpperCase()
  const exists = artists.value.some(a => (a.mainWorks || []).some(w => w.code === code) || (a.compilations || []).some(w => w.code === code))
  if (exists) return showToast('Code exists', 'error')
  const artist = artists.value.find(a => a.name === newWork.value.artist)
  if (!artist) return showToast('Artist not found', 'error')
  if (!artist[newWork.value.type]) artist[newWork.value.type] = []
  artist[newWork.value.type].push({ code, addedAt: Date.now() })
  artists.value = [...artists.value]; closeAddWorkModal(); showToast('Added ' + code)
}
function openUploadModal(code) { uploadingWork.value = code; customImageUrl.value = customImages.value[code] || ''; showUploadModal.value = true }
function closeUploadModal() { showUploadModal.value = false; uploadingWork.value = null; customImageUrl.value = '' }
function handleCustomImageUrl() {
  const url = customImageUrl.value.trim()
  if (!url) {
    const n = { ...customImages.value }; delete n[uploadingWork.value]; customImages.value = n
    showToast('Image removed'); closeUploadModal(); return
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) return showToast('Must start with http(s)://', 'error')
  const img = new Image(); const to = setTimeout(() => showToast('Timeout', 'error'), 10000)
  img.onload = () => { clearTimeout(to); customImages.value = { ...customImages.value, [uploadingWork.value]: url }; showToast('Image added'); closeUploadModal() }
  img.onerror = () => { clearTimeout(to); showToast('Load failed', 'error') }
  img.src = url
}
function openLightbox(work, startIndex = 0) {
  const allImgs = [{ url: getImageUrl(work.code), index: 0 }]
  for (let i = 1; i <= 20; i++) {
    if (!galleryFailed.value.includes(i)) allImgs.push({ url: getImageUrl(work.code, 'jp-' + i), index: i })
  }
  const imgs = allImgs.map(x => x.url)
  const mappedIndex = startIndex === 0 ? 0 : allImgs.findIndex(x => x.index === startIndex)
  lightbox.value = { show: true, images: imgs, currentIndex: Math.max(0, mappedIndex), code: work.code }
  document.body.style.overflow = 'hidden'; nextTick(() => setupSwipeGestures())
}
function closeLightbox() { lightbox.value.show = false; document.body.style.overflow = ''; cleanupSwipeGestures() }
function setupSwipeGestures() {
  const el = document.querySelector('.lb'); if (!el) return
  lightboxTouchStart = e => { touchStartX.value = e.changedTouches[0].screenX; touchStartY.value = e.changedTouches[0].screenY }
  lightboxTouchEnd = e => { touchEndX.value = e.changedTouches[0].screenX; touchEndY.value = e.changedTouches[0].screenY; handleSwipe() }
  el.addEventListener('touchstart', lightboxTouchStart, { passive: true }); el.addEventListener('touchend', lightboxTouchEnd, { passive: true })
}
function cleanupSwipeGestures() {
  const el = document.querySelector('.lb'); if (!el) return
  if (lightboxTouchStart) el.removeEventListener('touchstart', lightboxTouchStart)
  if (lightboxTouchEnd) el.removeEventListener('touchend', lightboxTouchEnd)
}
function handleSwipe() {
  const dx = touchEndX.value - touchStartX.value; const dy = touchEndY.value - touchStartY.value
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) dx > 0 ? prevImage() : nextImage()
}
function nextImage() { if (lightbox.value.currentIndex < lightbox.value.images.length - 1) lightbox.value.currentIndex++ }
function prevImage() { if (lightbox.value.currentIndex > 0) lightbox.value.currentIndex-- }
function preloadAllGallery() {
  if (!currentWork.value) return; isPreloading.value = true
  const promises = []
  for (let i = 1; i <= 20; i++) promises.push(new Promise(res => { const img = new Image(); img.onload = img.onerror = res; img.src = getImageUrl(currentWork.value.code, 'jp-' + i) }))
  Promise.all(promises).then(() => { isPreloading.value = false; showToast('Gallery loaded') })
}
function copyToClipboard(code) { navigator.clipboard.writeText(code).then(() => showToast('Copied: ' + code)).catch(() => showToast('Copy failed', 'error')) }
function openExternalLink(code, type) {
  const c = code.toLowerCase()
  const p = parseCode(code)
  const javId = p ? p.prefix + ('00000' + p.rawNumber).slice(-5) : c.replace('-', '')
  const urls = { missav: `https://missav.ws/en/${c}`, '24av': `https://24av.net/en/v/${c}`, javtrailers: `https://javtrailers.com/video/${javId}`, njav: `https://www.njav.com/en/xvideos/${c}` }
  window.open(urls[type] || urls.njav, '_blank', 'noopener,noreferrer')
}
function clearViewHistory() {
  if (!confirm('Clear all viewing history?')) return
  viewedArtists.value = []; viewedWorks.value = []
  localStorage.removeItem('viewedArtists'); localStorage.removeItem('viewedWorks'); showToast('History cleared')
}
function showToast(msg, type = 'success') {
  toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 2500)
}
function saveCustomImagesToDB(images) {
  if (!customImagesLoaded.value) return
  if (useLocalStorageFallback.value) { try { localStorage.setItem('customImages', JSON.stringify(images)) } catch {} }
  else { imageDB.value.clear().then(() => { let chain = Promise.resolve(); Object.keys(images).forEach(code => { chain = chain.then(() => imageDB.value.set(code, images[code])) }); return chain }).catch(() => {}) }
}
function exportData() {
  try {
    const arr = artists.value.map(a => ({ name: a.name, cover: a.cover || '', url: a.url || '', compilations: (a.compilations || []).map(w => w.code).sort(), mainWorks: (a.mainWorks || []).map(w => w.code).sort() })).sort((a, b) => a.name.localeCompare(b.name))
    let s = 'export const DEFAULT_ARTISTS = [\n'
    arr.forEach((a, i) => { s += `  {\n    name: '${a.name}',\n    cover: '${a.cover}',\n    url: '${a.url}',\n    compilations: [${a.compilations.map(c => `'${c}'`).join(', ')}],\n    mainWorks: [${a.mainWorks.map(w => `'${w}'`).join(', ')}]\n  }${i < arr.length - 1 ? ',' : ''}\n` })
    s += ']'
    const blob = new Blob([s], { type: 'text/javascript' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `artists-${new Date().toISOString().split('T')[0]}.js`; a.click(); URL.revokeObjectURL(url); showToast('Exported')
  } catch { showToast('Export failed', 'error') }
}
function triggerImport() { fileInputRef.value?.click() }
function importData(event) {
  try {
    const file = event.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const data = JSON.parse(e.target.result)
      if (!data.artists || !Array.isArray(data.artists)) return showToast('Invalid format', 'error')
      artists.value = normalizeArtists(data.artists); customImages.value = data.customImages || {}
      localStorage.setItem('artists', JSON.stringify(artists.value)); showToast('Imported')
    }
    reader.readAsText(file); event.target.value = ''
  } catch { showToast('Import failed', 'error') }
}
function hardRefresh() {
  if (!confirm('Reset everything? Cannot be undone.')) return
  ;['artists', 'viewedArtists', 'viewedWorks', 'artistSortBy', 'customImages'].forEach(k => localStorage.removeItem(k))
  const p = imageDB.value ? imageDB.value.clear() : Promise.resolve()
  p.then(() => {
    artists.value = normalizeArtists(JSON.parse(JSON.stringify(DEFAULT_ARTISTS)))
    currentView.value = 'artists'; activeTab.value = ''; customImages.value = {}
    viewedArtists.value = []; viewedWorks.value = []; artistSortBy.value = 'nameAsc'
    localStorage.setItem('artists', JSON.stringify(artists.value)); showToast('Reset complete')
  })
}
</script>

<style scoped>
/* ─── Design tokens ─── */
/* CSS custom properties defined on :root are global by design.
   We keep them in a non-scoped global block below so dark-mode
   toggling via the .dark class on the app root still works. */

/* ─── Base ─── */
.app {
  min-height: 100vh;
  font-family: var(--sans);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

/* ─── Loading screen ─── */
.app-loading {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  z-index: 9999;
}
.loading-logo {
  width: 56px;
  height: 56px;
  border: 3px solid var(--ink);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 700 28px var(--mono);
  color: var(--ink);
  animation: wt-pulse 1s ease-in-out infinite alternate;
}
.loading-bar {
  width: 120px;
  height: 3px;
  background: var(--line);
  border-radius: 2px;
  overflow: hidden;
}
.loading-fill {
  height: 100%;
  background: var(--warm);
  border-radius: 2px;
  animation: wt-loadbar 1s ease-in-out infinite;
}

/* ─── Bar ─── */
.bar {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  height: 54px;
  z-index: 100;
  background: var(--surface);
  border-block-end: 2px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 20px;
  gap: 12px;
  transition: background var(--t-color);
}
.bar-left,
.bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar-right { flex-shrink: 0; }

.stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--ink2);
}
.stats b { color: var(--ink); font-weight: 700; }
.stat-sep { color: var(--line2); margin-inline: 2px; }

.bar-artist {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.bar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--line);
  border: 1.5px solid var(--line2);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink3);
}
.bar-avatar img { width: 100%; height: 100%; object-fit: cover; }

.bar-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.bar-title--mono {
  font-family: var(--mono);
  font-size: 14px;
  letter-spacing: 0;
  max-width: 140px;
}
.bar-title--dim {
  color: var(--ink3);
  max-width: 110px;
  font-size: 13px;
}
.breadcrumb-arrow {
  color: var(--ink3);
  flex-shrink: 0;
}

.bar-work-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 8px;
  border-radius: 20px;
  background: var(--warm-bg);
  border: 1.5px solid var(--warm);
  flex-shrink: 0;
}
.bar-viewed-count { font: 700 11px var(--mono); color: var(--warm-dark); }
.bar-total-sep    { font: 400 11px var(--mono); color: var(--warm); margin-inline: 1px; }
.bar-total-count  { font: 500 11px var(--mono); color: var(--warm); }

/* ─── Search ─── */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-ico {
  position: absolute;
  inset-inline-start: 10px;
  color: var(--ink3);
  pointer-events: none;
}
.search-box input {
  width: 160px;
  padding: 8px 28px 8px 30px;
  border: 2px solid var(--line);
  border-radius: var(--r);
  background: var(--bg);
  font: 13px var(--sans);
  color: var(--ink);
  transition: border-color var(--t), background var(--t-color);
}
.search-box input:focus { outline: none; border-color: var(--ink); }
.search-box input::placeholder { color: var(--ink3); }
.search-x {
  position: absolute;
  inset-inline-end: 6px;
  width: 20px;
  height: 20px;
  background: var(--line);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  color: var(--ink2);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─── Shared button primitives ─── */
.btn-back {
  width: 32px;
  height: 32px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  transition: background var(--t), color var(--t);
  flex-shrink: 0;
}
.btn-back:hover { background: var(--ink); color: var(--surface); }

.btn-filter {
  padding: 5px 11px;
  border: 1.5px solid var(--line2);
  border-radius: 20px;
  background: var(--surface);
  font: 600 11px var(--sans);
  color: var(--ink2);
  cursor: pointer;
  transition: border-color var(--t), color var(--t), background var(--t);
  white-space: nowrap;
}
.btn-filter:hover { border-color: var(--ink); color: var(--ink); background: var(--bg); }
.btn-filter.active { background: var(--warm); border-color: var(--warm); color: #fff; }

.btn-icon {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--line2);
  border-radius: 6px;
  background: var(--surface);
  cursor: pointer;
  color: var(--ink2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--t), color var(--t), background var(--t);
  flex-shrink: 0;
}
.btn-icon:hover { border-color: var(--ink); color: var(--ink); }
.btn-icon.active { background: var(--warm-bg); border-color: var(--warm); color: var(--warm-dark); }

/* ─── Menu ─── */
.menu-wrap { position: relative; }
.btn-menu {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--line2);
  border-radius: 6px;
  background: var(--surface);
  cursor: pointer;
  color: var(--ink2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--t), color var(--t);
}
.btn-menu:hover { border-color: var(--ink); color: var(--ink); }

.menu-drop {
  position: absolute;
  inset-block-start: 42px;
  inset-inline-end: 0;
  min-width: 160px;
  background: var(--surface);
  border: 2px solid var(--ink);
  border-radius: var(--r);
  overflow: hidden;
  z-index: 200;
}
.menu-drop button {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  font: 500 13px var(--sans);
  color: var(--ink);
  text-align: start;
  cursor: pointer;
  transition: background var(--t);
}
.menu-drop button:hover { background: var(--bg); }
.menu-drop .menu-danger { color: #c44; }
.menu-drop .menu-danger:hover { background: #fef0f0; }

.menu-backdrop { position: fixed; inset: 0; z-index: 99; }

/* ─── Page ─── */
.page { padding: 74px 24px 48px; }

/* ─── Pull-to-refresh ─── */
.ptr-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.15s ease;
  color: var(--ink3);
}

/* ─── Skeleton / image fade ─── */
.skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--line) 25%, var(--line2) 50%, var(--line) 75%);
  background-size: 200% 100%;
  animation: wt-shimmer 1.5s infinite;
  border-radius: inherit;
}
.skeleton--hidden { display: none; }

.fade-img {
  opacity: 0;
  transition: opacity 0.3s ease;
  position: relative;
  z-index: 1;
}
.fade-img.loaded { opacity: 1; }

/* ─── Alpha rail ─── */
.alpha-rail {
  position: fixed;
  inset-inline-end: 6px;
  inset-block: 54px 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-block: 8px;
}
.alpha-rail button {
  display: block;
  padding: 1px 4px;
  border: none;
  background: none;
  font: 600 9px var(--mono);
  color: var(--ink3);
  cursor: pointer;
  line-height: 1.4;
  transition: color var(--t);
}
.alpha-rail button.active { color: var(--ink); }
.alpha-rail button:disabled { opacity: 0.25; cursor: default; }
.alpha-rail button:hover:not(:disabled) { color: var(--warm); }

/* ─── Artist groups ─── */
.group { margin-block-end: 36px; }

.group-head {
  position: sticky;
  inset-block-start: 54px;
  z-index: 50;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-block: 10px;
  margin-block-end: 16px;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-block-end: 2px solid var(--ink);
  transition: background var(--t-color);
}
.letter { font-size: 28px; font-weight: 700; letter-spacing: -1.5px; line-height: 1; }
.group-n { font-size: 13px; color: var(--ink3); font-weight: 600; }

/* ─── Grids ─── */
.grid-artists {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding-inline-end: 36px;
}
.grid-works {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}
.grid-works--compact {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

/* ─── Artist card ─── */
.a-card {
  position: relative;
  cursor: pointer;
  border-radius: var(--r);
  overflow: hidden;
  transition: opacity var(--t), transform var(--t);
}
.a-card:hover { transform: translateY(-2px); }
.a-card--dim { opacity: 0.35; }
.a-card--dim:hover { opacity: 0.6; }
.a-card:not(.a-card--dim) .a-img { border-color: var(--warm); }
.a-card:hover .a-img { border-color: var(--ink) !important; }
.a-card:hover .a-img img { transform: scale(1.04); transition: transform 0.3s ease; }

.a-img {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  background: var(--line);
  overflow: hidden;
  border: 2px solid var(--line);
  border-radius: var(--r);
  transition: border-color var(--t);
}
.a-img img { width: 100%; height: 100%; object-fit: cover; }

.a-ph {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: var(--line2);
  background: var(--bg);
}
.a-overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 2;
  padding: 24px 12px 10px;
  background: linear-gradient(transparent, rgba(0,0,0,.7));
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.a-name {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,.4);
}
.a-count {
  font-size: 11px;
  font-family: var(--mono);
  color: rgba(255,255,255,.9);
  font-weight: 600;
}

.progress-bar {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  height: 3px;
  background: rgba(0,0,0,.3);
  z-index: 3;
}
.progress-fill {
  height: 100%;
  background: var(--warm);
  transition: width 0.3s ease;
  border-end-end-radius: 2px;
}

.badge-check {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-start: 8px;
  z-index: 4;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--warm);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge-check--tl {
  inset-block-start: 6px;
  inset-inline-start: 6px;
  width: 20px;
  height: 20px;
}

/* ─── Works top bar ─── */
.works-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: 24px;
  gap: 12px;
  flex-wrap: wrap;
}
.works-info { flex: 1; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.chip {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--mono);
  border: 1.5px solid var(--line2);
  color: var(--ink2);
  background: var(--surface);
}
.chip--progress {
  border-color: var(--warm);
  color: var(--warm-dark);
  background: var(--warm-bg);
}
.chip--url {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: border-color var(--t), color var(--t), background var(--t);
}
.chip--url:hover {
  border-color: var(--warm);
  color: var(--warm-dark);
  background: var(--warm-bg);
}

.works-actions { display: flex; gap: 8px; align-items: center; }
.sort-select {
  padding: 6px 10px;
  border: 1.5px solid var(--line2);
  border-radius: 6px;
  font: 500 12px var(--sans);
  color: var(--ink2);
  background: var(--surface);
  cursor: pointer;
  height: 32px;
  transition: background var(--t-color);
}
.sort-select:focus { outline: none; border-color: var(--ink); }

.btn-add {
  padding-inline: 16px;
  height: 32px;
  background: var(--ink);
  color: var(--surface);
  border: 2px solid var(--ink);
  border-radius: 6px;
  font: 600 12px var(--sans);
  cursor: pointer;
  white-space: nowrap;
  transition: opacity var(--t);
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-add:hover { opacity: 0.8; }

/* ─── Work section ─── */
.w-section { margin-block-end: 40px; }
.w-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-block-end: 16px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1.5px solid var(--line2);
  border-radius: var(--r);
}
.w-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--ink);
}
.w-n {
  font-size: 12px;
  color: var(--ink3);
  font-family: var(--mono);
  margin-inline-start: auto;
}

/* ─── Work card ─── */
.w-card {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease, opacity var(--t);
}
.w-card:hover { transform: translateY(-3px); }
.w-card--dim { opacity: 0.4; }
.w-card--dim:hover { opacity: 0.6; }
.w-card:hover .w-img { border-color: var(--ink); }
.w-card:hover .w-img img { transform: scale(1.04); transition: transform 0.3s ease; }

.w-img {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  border: 2px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  background: var(--bg);
  margin-block-end: 8px;
  transition: border-color var(--t);
}
.w-img img { width: 100%; height: 100%; object-fit: cover; }

.badge-star {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-end: 6px;
  z-index: 2;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--warm);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.w-code { font: 600 12px var(--mono); color: var(--ink); display: block; padding-inline: 2px; }

/* ─── Detail ─── */
.detail { display: grid; grid-template-columns: 1fr 420px; gap: 32px; }
.detail-left { display: flex; flex-direction: column; gap: 12px; }
.detail-right { display: flex; flex-direction: column; gap: 12px; }

.big-img {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  border: 2px solid var(--ink);
  border-radius: var(--r);
  overflow: hidden;
  cursor: pointer;
  background: var(--bg);
}
.big-img img { width: 100%; height: 100%; object-fit: contain; }

.actions {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1.5px solid var(--line2);
  border-radius: var(--r);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  white-space: nowrap;
}
.act-group { display: inline-flex; align-items: center; flex-shrink: 0; }
.act-group + .act-group { border-inline-start: 1.5px solid var(--line2); }

.act {
  padding-inline: 14px;
  height: 40px;
  border: none;
  border-inline-end: 1.5px solid var(--line2);
  background: transparent;
  font: 600 12px var(--sans);
  color: var(--ink2);
  cursor: pointer;
  transition: background var(--t), color var(--t);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.act:last-child { border-inline-end: none; }
.act:hover { background: var(--bg); color: var(--ink); }
.act--on { background: var(--warm-bg); color: var(--warm-dark); }
.act--on svg { color: var(--warm); }
.act--copy { color: var(--ink); font-weight: 700; }
.act--copy:hover { background: var(--ink); color: var(--surface); }

.d-code {
  font: 700 24px var(--mono);
  letter-spacing: -0.5px;
  word-break: break-all;
  padding: 14px 18px;
  border: 2px solid var(--ink);
  border-radius: var(--r);
  background: var(--surface);
}

.artist-url-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font: 500 11px var(--mono);
  color: var(--warm-dark);
  text-decoration: none;
  background: var(--warm-bg);
  border: 1.5px solid var(--warm);
  border-radius: var(--r);
  transition: background var(--t), color var(--t);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.artist-url-row svg { color: var(--warm); flex-shrink: 0; }
.artist-url-row:hover { background: var(--warm); color: #fff; }
.artist-url-row:hover svg { color: #fff; }

.detail-section {
  background: var(--surface);
  border: 1.5px solid var(--line2);
  border-radius: var(--r);
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  font: 700 11px var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--ink2);
  background: var(--bg);
  border-block-end: 1.5px solid var(--line2);
  transition: background var(--t-color);
}
.section-header svg { color: var(--ink3); flex-shrink: 0; }
.section-header .btn-sm { margin-inline-start: auto; }

.link-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--line2);
}
.link-btn {
  padding-inline: 14px;
  height: 44px;
  border: none;
  background: var(--surface);
  font: 600 12px var(--sans);
  color: var(--ink);
  cursor: pointer;
  transition: background var(--t), color var(--t);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.link-btn:hover { background: var(--warm-bg); color: var(--warm-dark); }
.link-btn:hover svg { color: var(--warm); }

.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1.5px solid var(--line2);
  border-radius: var(--r);
  background: var(--surface);
}
.nav-btn {
  width: 36px;
  height: 36px;
  border: 1.5px solid var(--line2);
  border-radius: 6px;
  background: var(--bg);
  cursor: pointer;
  color: var(--ink);
  transition: background var(--t), color var(--t), border-color var(--t);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-btn:hover:not(:disabled) { background: var(--ink); color: var(--surface); border-color: var(--ink); }
.nav-btn:disabled { opacity: 0.2; cursor: not-allowed; }
.nav-pos { font: 700 15px var(--mono); }
.nav-pos small { font-weight: 400; color: var(--ink3); }

.btn-sm {
  padding: 3px 10px;
  border: 1.5px solid var(--line2);
  border-radius: 20px;
  background: var(--surface);
  font: 600 11px var(--sans);
  color: var(--ink2);
  cursor: pointer;
  transition: border-color var(--t), color var(--t);
}
.btn-sm:hover:not(:disabled) { border-color: var(--ink); color: var(--ink); }
.btn-sm:disabled { opacity: 0.35; }

/* ─── Gallery ─── */
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 14px 16px;
}
.thumb {
  position: relative;
  aspect-ratio: 3 / 2;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg);
  border: 1.5px solid var(--line);
  transition: transform var(--t), border-color var(--t);
}
.thumb:hover { transform: scale(1.04); border-color: var(--warm); }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.t-n {
  position: absolute;
  inset-block-end: 4px;
  inset-inline-end: 6px;
  font: 700 10px var(--mono);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,.7);
  z-index: 2;
}
.gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 0 20px;
  color: var(--ink3);
  font-size: 13px;
}

/* ─── Modals ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 2px solid var(--ink);
  border-radius: var(--r);
  overflow: hidden;
}
.m-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-block-end: 2px solid var(--ink);
}
.m-head h3 { font-size: 16px; font-weight: 700; }
.m-x {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--ink2);
}
.m-body { padding: 20px; }
.m-sub { font: 500 13px var(--mono); color: var(--ink2); margin-block-end: 16px; }
.m-foot {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-block-start: 2px solid var(--line);
  background: var(--bg);
}
.hint { font-size: 11px; color: var(--ink3); margin-block-start: -8px; }

.field { display: block; margin-block-end: 16px; }
.field span {
  display: block;
  font: 600 11px var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ink2);
  margin-block-end: 6px;
}
.field input,
.field select {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--line);
  border-radius: var(--r);
  font: 14px var(--sans);
  color: var(--ink);
  background: var(--bg);
  transition: border-color var(--t), background var(--t-color);
}
.field input:focus,
.field select:focus { outline: none; border-color: var(--ink); }

.radios { display: flex; gap: 8px; }
.radio {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 2px solid var(--line);
  border-radius: var(--r);
  cursor: pointer;
  transition: border-color var(--t);
}
.radio:hover { border-color: var(--line2); }
.radio input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--warm); }
.radio span { font: 500 13px var(--sans); }

.btn-flat,
.btn-fill {
  flex: 1;
  padding-block: 10px;
  border-radius: 6px;
  font: 600 13px var(--sans);
  cursor: pointer;
  transition: border-color var(--t), color var(--t), background var(--t), opacity var(--t);
  border: 1.5px solid;
}
.btn-flat { background: var(--surface); color: var(--ink2); border-color: var(--line); }
.btn-flat:hover { border-color: var(--ink); color: var(--ink); }
.btn-fill { background: var(--ink); color: var(--surface); border-color: var(--ink); }
.btn-fill:hover { opacity: 0.85; }

/* ─── Bottom Sheet ─── */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  height: 100dvh;
}
.bottom-sheet {
  width: 100%;
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 36px;
  padding-block-end: max(36px, env(safe-area-inset-bottom, 36px));
  border-block-start: 2px solid var(--ink);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 85vh;
  overflow-y: auto;
}
.sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--line2);
  border-radius: 2px;
  margin: 0 auto 4px;
}
.sheet-title { font: 700 16px var(--sans); }
.sheet-section { display: flex; flex-direction: column; gap: 10px; }
.sheet-label {
  font: 600 11px var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--ink3);
}
.sheet-pills { display: flex; flex-wrap: wrap; gap: 8px; }

.pill {
  padding: 7px 16px;
  border: 1.5px solid var(--line2);
  border-radius: 20px;
  background: var(--surface);
  font: 600 13px var(--sans);
  color: var(--ink2);
  cursor: pointer;
  transition: background var(--t), border-color var(--t), color var(--t);
}
.pill--active { background: var(--warm); border-color: var(--warm); color: #fff; }

.sheet-done {
  padding-block: 14px;
  background: var(--ink);
  color: var(--surface);
  border: none;
  border-radius: var(--r);
  font: 700 15px var(--sans);
  cursor: pointer;
  transition: opacity var(--t);
}
.sheet-done:hover { opacity: 0.85; }

/* ─── Lightbox ─── */
.lb {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
  touch-action: pan-y pinch-zoom;
}
.lb-close {
  position: fixed;
  inset-block-start: 16px;
  inset-inline-end: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t);
}
.lb-close:hover { background: rgba(255,255,255,.15); }

.lb-main { max-width: 90%; max-height: 90%; }
.lb-main img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: var(--r);
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}
.lb-arr {
  position: fixed;
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t);
}
.lb-arr:hover:not(:disabled) { background: rgba(255,255,255,.15); }
.lb-arr:disabled { opacity: 0.2; cursor: not-allowed; }
.lb-arr--left  { inset-inline-start: 20px; }
.lb-arr--right { inset-inline-end: 20px; }

.lb-count {
  position: fixed;
  inset-block-end: 24px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 20px;
  color: #fff;
  font: 600 13px var(--mono);
}

/* ─── Toast ─── */
.toast {
  position: fixed;
  inset-block-end: 28px;
  inset-inline-end: 28px;
  padding: 12px 20px;
  border-radius: var(--r);
  border: 2px solid;
  font: 600 13px var(--sans);
  z-index: 500;
  background: var(--surface);
}
.toast--success { border-color: var(--warm); color: var(--warm-dark); }
.toast--error   { border-color: #c44; color: #a33; }
.toast--info    { border-color: var(--ink); color: var(--ink); }

/* ─── Misc ─── */
.empty {
  padding-block: 80px;
  text-align: center;
  color: var(--ink3);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.shortcut-hint {
  position: fixed;
  inset-block-end: 28px;
  inset-inline-start: 50%;
  transform: translateX(-50%) translateY(12px);
  padding: 8px 14px;
  background: var(--surface);
  border: 2px solid var(--line2);
  border-radius: 20px;
  font: 500 12px var(--sans);
  color: var(--ink3);
  z-index: 50;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
  white-space: nowrap;
}
.shortcut-hint--visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.shortcut-hint kbd {
  display: inline-block;
  padding: 1px 6px;
  background: var(--bg);
  border: 1.5px solid var(--line2);
  border-radius: 4px;
  font: 700 11px var(--mono);
  color: var(--ink2);
  margin-inline-end: 4px;
}

/* ─── Vue transition classes (must use :deep() in scoped) ─── */
:deep(.app-load-leave-active) { transition: opacity 0.25s ease; }
:deep(.app-load-leave-to)     { opacity: 0; }

:deep(.fade-enter-active),
:deep(.fade-leave-active)  { transition: opacity 0.2s; }
:deep(.fade-enter-from),
:deep(.fade-leave-to)      { opacity: 0; }

:deep(.m-enter-active) { transition: opacity 0.25s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1); }
:deep(.m-leave-active) { transition: opacity 0.15s, transform 0.15s; }
:deep(.m-enter-from)   { opacity: 0; transform: scale(.97); }
:deep(.m-leave-to)     { opacity: 0; }

:deep(.toast-enter-active),
:deep(.toast-leave-active) { transition: opacity 0.25s ease, transform 0.25s ease; }
:deep(.toast-enter-from),
:deep(.toast-leave-to)     { opacity: 0; transform: translateY(12px); }

:deep(.drop-enter-active)  { transition: opacity 0.15s ease, transform 0.15s ease; }
:deep(.drop-leave-active)  { transition: opacity 0.1s ease, transform 0.1s ease; }
:deep(.drop-enter-from)    { opacity: 0; transform: translateY(-4px); }
:deep(.drop-leave-to)      { opacity: 0; }

:deep(.sheet-enter-active) { transition: transform 0.3s cubic-bezier(.32,0,.67,0); }
:deep(.sheet-leave-active) { transition: transform 0.2s ease; }
:deep(.sheet-enter-from),
:deep(.sheet-leave-to)     { transform: translateY(100%); }

:deep(.slide-right-enter-active),
:deep(.slide-right-leave-active),
:deep(.slide-left-enter-active),
:deep(.slide-left-leave-active) { transition: opacity 0.2s ease, transform 0.2s ease; }
:deep(.slide-right-enter-from)  { opacity: 0; transform: translateX(24px); }
:deep(.slide-right-leave-to)    { opacity: 0; transform: translateX(-24px); }
:deep(.slide-left-enter-from)   { opacity: 0; transform: translateX(-24px); }
:deep(.slide-left-leave-to)     { opacity: 0; transform: translateX(24px); }

/* ─── Animations (keyframes must be global or :deep to render) ─── */
@keyframes wt-pulse {
  from { opacity: 0.5; transform: scale(.95); }
  to   { opacity: 1;   transform: scale(1);   }
}
@keyframes wt-loadbar {
  0%   { width: 0;   margin-inline-start: 0; }
  50%  { width: 60%; margin-inline-start: 20%; }
  100% { width: 0;   margin-inline-start: 100%; }
}
@keyframes wt-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Responsive ─── */
@media (max-width: 1200px) {
  .detail { grid-template-columns: 1fr; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .search-box input { width: 130px; }
  .grid-artists { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
  .grid-works   { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
}
@media (max-width: 768px) {
  .bar { padding-inline: 14px; height: 50px; gap: 8px; }
  .stats { font-size: 12px; }
  .search-box input { width: 110px; font-size: 12px; }
  .page { padding: 66px 14px 36px; }
  .group-head { inset-block-start: 50px; }
  .letter { font-size: 24px; }
  .grid-artists { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .grid-works   { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 6px; }
  .gallery { grid-template-columns: repeat(4, 1fr); }
  .alpha-rail { inset-inline-end: 2px; }
  .alpha-rail button { font-size: 8px; padding: 1px 3px; }
  .bar-work-badge { display: none; }
}
@media (max-width: 640px) {
  .stats { display: none; }
  .bar-title { max-width: 120px; }
  .search-box input { width: 90px; }
  .page { padding: 60px 12px 28px; }
  .group-head { inset-block-start: 50px; }
  .letter { font-size: 22px; }
  .grid-artists { grid-template-columns: repeat(2, 1fr); gap: 10px; padding-inline-end: 18px; }
  .grid-works   { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .grid-works--compact { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .works-top { flex-direction: column; align-items: stretch; }
  .works-actions { justify-content: flex-end; }
  .actions { flex-direction: column; }
  .gallery { grid-template-columns: repeat(3, 1fr); }
  .link-grid { grid-template-columns: 1fr; }
  .toast { inset-inline: 12px; inset-block-end: 12px; }
  .alpha-rail { display: none; }
  .bar-title--dim { display: none; }
  .bar-artist .breadcrumb-arrow { display: none; }
  .shortcut-hint { display: none; }
}
@media (max-width: 360px) {
  .search-box input { width: 70px; font-size: 11px; padding: 6px 24px 6px 26px; }
  .bar-title { max-width: 90px; font-size: 13px; }
  .btn-icon,
  .btn-menu { width: 28px; height: 28px; }
  .bar { padding-inline: 10px; gap: 6px; }
}
</style>

<style>
/* ─── Global tokens — must stay unscoped so dark-mode class toggle works ─── */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #F8F6F2;
  --surface: #FFFFFF;
  --ink: #1A1A1A;
  --ink2: #6B6560;
  --ink3: #A09A93;
  --warm: #C8785A;
  --warm-bg: #FDF0EB;
  --warm-dark: #9E5A3E;
  --line: #E6E1DB;
  --line2: #D5CFC8;
  --r: 8px;
  --t: 180ms ease;
  --t-color: 200ms ease;
  --mono: 'IBM Plex Mono', monospace;
  --sans: 'DM Sans', -apple-system, sans-serif;
}
.dark {
  --bg: #111110;
  --surface: #1C1B19;
  --ink: #F0EDE8;
  --ink2: #9A948D;
  --ink3: #5C5852;
  --warm: #D4845F;
  --warm-bg: #2A1E18;
  --warm-dark: #E8A080;
  --line: #2A2925;
  --line2: #353330;
}

html, body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  transition: background var(--t-color), color var(--t-color);
}
</style>