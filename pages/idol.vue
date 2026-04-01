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
        <!-- USABILITY: global search trigger -->
        <button @click="openGlobalSearch" class="btn-icon" title="Global search (G)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
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
            <div v-for="(artist, idx) in groupedArtists[letter]" :key="artist.name" class="a-card"
              :class="{ 'a-card--dim': viewedArtists.includes(artist.name) }"
              :style="{ '--stagger-i': idx }"
              :data-gen="gridGeneration"
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
            <!-- Surprise me: picks a random unviewed work from this artist -->
            <button @click="surpriseMe" class="btn-surprise" title="Open a random unviewed work">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/></svg>
              <span>Surprise</span>
            </button>
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
              <div v-for="(work, idx) in section.items" :key="work.code" class="w-card"
                :class="{ 'w-card--dim': viewedWorks.includes(work.code) }"
                :style="{ '--stagger-i': idx }"
                :data-gen="gridGeneration"
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
                <span class="w-code" :class="{ 'w-code--has-tip': compactWorks }">
                  {{ work.code }}
                  <span v-if="compactWorks" class="w-code-tip">{{ work.code }}</span>
                </span>
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
            <div class="big-img" @click="openLightbox(currentWork, 0, $event.currentTarget)">
              <div class="skeleton"></div>
              <img :src="getProgressiveWorkImage(currentWork).full" :alt="currentWork.code" class="fade-img" @load="onImgLoad" @error="onImgError" />
            </div>
            <div class="actions">
              <div class="actions-btns">
                <button @click="setCoverWork(currentArtist.name, currentWork.code)" class="act-btn" :class="{ 'act-btn--on': isCoverWork(currentArtist.name, currentWork.code) }">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>{{ isCoverWork(currentArtist.name, currentWork.code) ? 'Cover' : 'Set cover' }}</span>
                </button>
                <button @click="openUploadModal(currentWork.code)" class="act-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>{{ hasCustomImage(currentWork.code) ? 'Update img' : 'Add image' }}</span>
                </button>
                <button @click="copyToClipboard(currentWork.code)" class="act-btn act-btn--primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  <span>Copy code</span>
                </button>
              </div>
              <div v-if="currentWorkList.length > 1" class="actions-nav">
                <button @click="navigateWork(-1)" :disabled="!canNavigateWork(-1)" class="nav-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span class="nav-pos">{{ currentWorkIndex + 1 }} <small>of {{ currentWorkList.length }}</small></span>
                <button @click="navigateWork(1)" :disabled="!canNavigateWork(1)" class="nav-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
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
            <div class="detail-section">
              <div class="section-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Gallery
                <button @click="preloadAllGallery" class="btn-sm" :disabled="isPreloading">{{ isPreloading ? '...' : 'Load all' }}</button>
              </div>
              <div class="gallery" v-if="!galleryAllFailed">
                <div v-for="i in 20" :key="i" class="thumb" @click="openLightbox(currentWork, i, $event.currentTarget)" v-show="!galleryFailed.includes(i)">
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
            <!-- FIX UX: show loading state while verifying image -->
            <p v-if="imageUrlLoading" class="hint hint--loading">Checking image…</p>
            <p v-else class="hint">Leave empty to remove</p>
          </div>
          <div class="m-foot">
            <button @click="closeUploadModal" class="btn-flat">Cancel</button>
            <!-- FIX UX: disable button while loading to prevent double-submit -->
            <button @click="handleCustomImageUrl" class="btn-fill" :disabled="imageUrlLoading">
              {{ imageUrlLoading ? 'Checking...' : customImageUrl.trim() ? 'Save' : 'Remove' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Lightbox -->
    <Transition name="lb-enter">
      <div v-if="lightbox.show" class="lb"
        :style="lbEntranceStyle"
        @wheel.prevent="onLbWheel"
        @mousedown="onLbMouseDown"
        @mousemove="onLbMouseMove"
        @mouseup="onLbMouseUp"
        @mouseleave="onLbMouseUp"
        @dblclick="onLbDblClick"
        @click.self="onLbBackdropClick">
        <button class="lb-close" @click="closeLightbox">&times;</button>
        <button v-if="lightbox.images.length > 1" class="lb-arr lb-arr--left"
          @click="prevImage" :disabled="lightbox.currentIndex === 0">&lt;</button>
        <div class="lb-main" :style="lbMainStyle">
          <!-- ANIM 1: Vue transition targets the wrapper div, lbImgStyle only on the img -->
          <Transition :name="'lb-slide-' + lbSlideDir" mode="out-in">
            <div :key="lbImgKey" class="lb-img-wrap">
              <img
                :src="lightbox.images[lightbox.currentIndex]"
                :style="lbImgStyle"
                @error="onImgError"
                draggable="false" />
            </div>
          </Transition>
        </div>
        <button v-if="lightbox.images.length > 1" class="lb-arr lb-arr--right"
          @click="nextImage" :disabled="lightbox.currentIndex === lightbox.images.length - 1">&gt;</button>
        <div class="lb-hud">
          <span class="lb-count">{{ lightbox.currentIndex + 1 }} / {{ lightbox.images.length }}</span>
          <button v-if="lbZoom > 1" class="lb-reset" @click="lbResetZoom">Reset zoom</button>
          <span class="lb-zoom-hint" v-else>Scroll or pinch to zoom</span>
        </div>
      </div>
    </Transition>

    <!-- Mobile Bottom Sheet -->
    <Transition name="sheet">
      <div v-if="showBottomSheet" class="sheet-backdrop" @click="showBottomSheet = false">
        <div class="bottom-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <div class="sheet-title">Filter &amp; Sort</div>
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

    <!-- Confirm Dialog -->
    <Transition name="m">
      <div v-if="confirmDialog.show" class="overlay" @click.self="closeConfirm">
        <div class="modal confirm-modal">
          <div class="m-head">
            <div class="confirm-title-row">
              <div class="confirm-icon-badge" :class="{ 'confirm-icon-badge--danger': confirmDialog.danger }">
                <svg v-if="confirmDialog.danger" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3>{{ confirmDialog.title }}</h3>
            </div>
            <button @click="closeConfirm" class="m-x">&times;</button>
          </div>
          <div class="m-body">
            <p class="confirm-message">{{ confirmDialog.message }}</p>
          </div>
          <div class="m-foot">
            <button @click="closeConfirm" class="btn-flat">Cancel</button>
            <button @click="doConfirm" class="btn-fill" :class="{ 'btn-fill--danger': confirmDialog.danger }">
              {{ confirmDialog.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">{{ toast.message }}</div>
    </Transition>

    <!-- USABILITY: Global search overlay -->
    <Transition name="gs-fade">
      <div v-if="showGlobalSearch" class="gs-backdrop" @click.self="closeGlobalSearch">
        <div class="gs-panel">
          <div class="gs-header">
            <svg class="gs-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              ref="globalSearchRef"
              v-model="globalQuery"
              class="gs-input"
              type="text"
              placeholder="Search artists or work codes…"
              autocomplete="off"
              spellcheck="false"
            />
            <button v-if="globalQuery" @click="globalQuery = ''" class="gs-clear">&times;</button>
            <kbd class="gs-esc" @click="closeGlobalSearch">esc</kbd>
          </div>

          <div class="gs-body" v-if="globalQuery.length >= 2">
            <!-- Artists results -->
            <div v-if="globalSearchResults.artists.length" class="gs-section">
              <div class="gs-section-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Artists
                <span class="gs-count">{{ globalSearchResults.artists.length }}</span>
              </div>
              <button
                v-for="artist in globalSearchResults.artists"
                :key="artist.name"
                class="gs-row"
                @click="globalGoToArtist(artist.name)"
              >
                <div class="gs-row-avatar">
                  <img v-if="getProgressiveImage(artist).full" :src="getProgressiveImage(artist).full" @error="onImgError" />
                  <span v-else>{{ artist.name.charAt(0) }}</span>
                </div>
                <span class="gs-row-name">{{ artist.name }}</span>
                <span class="gs-row-meta">{{ getArtistWorkCount(artist) }} works</span>
                <span class="gs-row-progress" :style="{ width: getArtistProgress(artist) + '%' }"></span>
              </button>
            </div>

            <!-- Works results -->
            <div v-if="globalSearchResults.works.length" class="gs-section">
              <div class="gs-section-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Works
                <span class="gs-count">{{ globalSearchResults.works.length }}</span>
              </div>
              <button
                v-for="item in globalSearchResults.works"
                :key="item.work.code"
                class="gs-row"
                @click="globalGoToWork(item)"
              >
                <div class="gs-row-thumb">
                  <img :src="getProgressiveWorkImage(item.work).full" @error="onImgError" />
                </div>
                <div class="gs-row-info">
                  <span class="gs-row-code">{{ item.work.code }}</span>
                  <span class="gs-row-artist">{{ item.artist.name }}</span>
                </div>
                <span v-if="viewedWorks.includes(item.work.code)" class="gs-row-seen">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              </button>
            </div>

            <!-- Empty state -->
            <div v-if="!globalSearchResults.artists.length && !globalSearchResults.works.length" class="gs-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <p>No results for "{{ globalQuery }}"</p>
            </div>
          </div>

          <div class="gs-body gs-hint" v-else>
            <p>Type at least 2 characters to search across all artists and works</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- USABILITY: Import confirm modal with item counts -->
    <Transition name="m">
      <div v-if="importConfirm.show" class="overlay" @click.self="cancelImport">
        <div class="modal">
          <div class="m-head">
            <h3>Import data</h3>
            <button @click="cancelImport" class="m-x">&times;</button>
          </div>
          <div class="m-body">
            <div class="import-summary">
              <div class="import-stat">
                <span class="import-stat-val">{{ importConfirm.artistCount }}</span>
                <span class="import-stat-label">artists</span>
              </div>
              <div class="import-stat-sep"></div>
              <div class="import-stat">
                <span class="import-stat-val">{{ importConfirm.workCount }}</span>
                <span class="import-stat-label">works</span>
              </div>
              <div v-if="importConfirm.hasImages" class="import-stat-sep"></div>
              <div v-if="importConfirm.hasImages" class="import-stat">
                <span class="import-stat-val">{{ importConfirm.imageCount }}</span>
                <span class="import-stat-label">images</span>
              </div>
            </div>
            <p class="import-warning">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              This will replace your current data. Export first if you want a backup.
            </p>
          </div>
          <div class="m-foot">
            <button @click="cancelImport" class="btn-flat">Cancel</button>
            <button @click="confirmImport" class="btn-fill">Import</button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="shortcut-hint" :class="{ 'shortcut-hint--visible': showShortcutHint }">
      <kbd>/</kbd> search &nbsp;·&nbsp; <kbd>G</kbd> global
    </div>
  </div>
</template>

<script setup>
import { DEFAULT_ARTISTS } from '~/data/artists.js'
import { normalizeArtists } from '~/utils/artistHelpers.js'

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE: extracted composables (would live in ~/composables/ in a real
// split, but inlined here as functions to minimise file count for this drop-in)
// ─────────────────────────────────────────────────────────────────────────────

// ── useCodeParser ────────────────────────────────────────────────────────────
// FIX ARCH: cache is now local to the composable, not a bare module-level Map.
// It is still never cleared, but that is intentional — codes are stable strings.
function useCodeParser() {
  const cache = new Map()
  function parseCode(code) {
    if (!code) return null
    if (cache.has(code)) return cache.get(code)
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    // FIX: use (.*?)(\d+)$ so prefixes like T28, 300MIUM, FC2PPV all parse correctly.
    // The old ^([A-Z]+)(\d+)$ required a letters-only prefix, breaking any label
    // that starts with or contains digits.
    const m = clean.match(/^(.*?)(\d+)$/)
    if (!m || !m[2]) {
      const r = { full: clean, prefix: clean.toLowerCase(), number: '001', rawNumber: 1, paddedNumber: '00001', id: clean.toLowerCase() + '00001' }
      cache.set(code, r); return r
    }
    const prefix      = m[1].toLowerCase()
    const number      = m[2]
    const rawNumber   = parseInt(number, 10)
    // FIX: if number is already ≥5 digits don't truncate it — old slice(-5) turned
    // ABC-100000 into abc00000 (wrong). Keep full number when it overflows padding.
    const paddedNumber = number.length >= 5 ? number : ('00000' + number).slice(-5)
    const id           = prefix + paddedNumber
    const r = { full: clean, prefix, number, rawNumber, paddedNumber, id }
    cache.set(code, r)
    return r
  }
  return { parseCode }
}

// ── useImageDB ───────────────────────────────────────────────────────────────
// ARCH: all IndexedDB logic is now self-contained.
function useImageDB() {
  const DB_NAME = 'WorksTrackerDB'
  const STORE   = 'customImages'
  let db = null

  function init() {
    return new Promise(res => {
      if (!window.indexedDB) return res(false)
      const req = indexedDB.open(DB_NAME, 1)
      req.onerror = () => res(false)
      req.onsuccess = () => { db = req.result; res(true) }
      req.onupgradeneeded = e => {
        const d = e.target.result
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'code' })
      }
    })
  }

  function getAll() {
    if (!db) return Promise.resolve({})
    return new Promise(res => {
      const req = db.transaction([STORE], 'readonly').objectStore(STORE).getAll()
      req.onsuccess = () => { const r = {}; req.result.forEach(i => { r[i.code] = i.data }); res(r) }
      req.onerror  = () => res({})
    })
  }

  // FIX ARCH: parallel writes with Promise.all instead of serial chaining
  function setAll(images) {
    if (!db) return Promise.resolve(false)
    return new Promise(res => {
      const tx = db.transaction([STORE], 'readwrite')
      const store = tx.objectStore(STORE)
      tx.oncomplete = () => res(true)
      tx.onerror    = () => res(false)
      store.clear()
      Object.entries(images).forEach(([code, data]) => store.put({ code, data }))
    })
  }

  function clear() {
    if (!db) return Promise.resolve(false)
    return new Promise(res => {
      const req = db.transaction([STORE], 'readwrite').objectStore(STORE).clear()
      req.onsuccess = () => res(true)
      req.onerror   = () => res(false)
    })
  }

  return { init, getAll, setAll, clear }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const EXTERNAL_LINKS = [
  { key: 'njav',        label: 'NJAV'        },
  { key: 'missav',      label: 'MissAV'      },
  { key: '24av',        label: '24AV'        },
  { key: 'javtrailers', label: 'JavTrailers' },
]
const PULL_THRESHOLD = 70

// ─────────────────────────────────────────────────────────────────────────────
// Composable instances
// ─────────────────────────────────────────────────────────────────────────────
const { parseCode }          = useCodeParser()
const imageDB                = useImageDB()

// ─────────────────────────────────────────────────────────────────────────────
// Reactive state
// ─────────────────────────────────────────────────────────────────────────────
const appReady        = ref(false)
const darkMode        = ref(false)
const isMobile        = ref(false)
const currentView     = ref('artists')
const viewTransition  = ref('slide-right')
const activeTab       = ref('')
const searchQuery     = ref('')
const artistSortBy    = ref('nameAsc')
const workSortBy      = ref('default')
// USABILITY: per-view filter — artists and works remember their own filter state
const viewFilters     = ref({ artists: 'all', works: 'all' })
const compactWorks    = ref(false)
const artists         = ref(normalizeArtists(JSON.parse(JSON.stringify(DEFAULT_ARTISTS))))
const currentWork     = ref(null)
const currentWorkList = ref([])
const currentWorkIndex= ref(0)
const customImages    = ref({})
const viewedArtists   = ref([])
const viewedWorks     = ref([])

const showAddWorkModal   = ref(false)
const showUploadModal    = ref(false)
const showAddArtistModal = ref(false)
const showBottomSheet    = ref(false)
const showMenu           = ref(false)
// USABILITY: global search overlay
const showGlobalSearch   = ref(false)
const globalQuery        = ref('')
const globalSearchRef    = ref(null)

const newWork        = ref({ artist: '', code: '', type: 'mainWorks' })
const newArtistName  = ref('')
const newArtistUrl   = ref('')
const uploadingWork  = ref(null)
const customImageUrl = ref('')
// FIX UX: track image-verify loading state
const imageUrlLoading = ref(false)

const lightbox  = ref({ show: false, images: [], currentIndex: 0, code: '' })
const lbZoom    = ref(1)
const lbPanX    = ref(0)
const lbPanY    = ref(0)
const lbDragging   = ref(false)
const lbDragStart  = ref({ x: 0, y: 0 })
const lbPanStart   = ref({ x: 0, y: 0 })
// ANIM 1: directional slide for image navigation
const lbSlideDir   = ref('none') // 'left' | 'right' | 'none'
const lbImgKey     = ref(0)      // force re-render to trigger transition
// ANIM 4: hero origin for fake shared-element transition
const lbHeroOrigin = ref({ x: '50%', y: '50%', scale: 0.6 })

const toast        = ref({ show: false, message: '', type: 'success' })
const isPreloading = ref(false)

const useLocalStorageFallback = ref(false)
const customImagesLoaded      = ref(false)
const scrollPositions         = ref({})

const touchStartX = ref(0); const touchStartY = ref(0)
const touchEndX   = ref(0); const touchEndY   = ref(0)
const detailTouchStartX = ref(0); const detailTouchStartY = ref(0)
const appTouchStartX    = ref(0); const appTouchStartY    = ref(0)

const allLetters   = ALL_LETTERS
const externalLinks= EXTERNAL_LINKS
const galleryFailed      = ref([])
const galleryLoadedCount = ref(0)
const showShortcutHint   = ref(false)
const searchInputRef = ref(null)
const fileInputRef   = ref(null)
const groupRefs      = ref({})

const pullStartY       = ref(0)
const pullDistance     = ref(0)
const isPullRefreshing = ref(false)
// ANIM 2: staggered grid entrance — bumped on view change
const gridGeneration   = ref(0)
// ANIM 3: pull-to-refresh spin angle (continuous during refresh)
const pullSpinAngle    = ref(0)
let   _pullSpinRaf     = null

// FIX ARCH: lightbox touch handlers stored as plain refs (no global namespace hack)
let _lbTouchStart = null
let _lbTouchMove  = null
let _lbTouchEnd   = null

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────
const totalCount = computed(() =>
  artists.value.reduce((s, a) => s + (a.mainWorks?.length || 0) + (a.compilations?.length || 0), 0)
)
const currentArtist = computed(() => artists.value.find(a => a.name === activeTab.value))

const sortedArtists = computed(() => {
  const arr = [...artists.value]
  const sorts = {
    nameAsc:    (a, b) => a.name.localeCompare(b.name),
    nameDesc:   (a, b) => b.name.localeCompare(a.name),
    mostWorks:  (a, b) => getArtistWorkCount(b) - getArtistWorkCount(a),
    leastWorks: (a, b) => getArtistWorkCount(a) - getArtistWorkCount(b),
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
  else if (viewFilter.value === 'viewed') list = list.filter(a =>  viewedArtists.value.includes(a.name))
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

// FIX UX: detail view navigation list stays in sync with current filter/sort
const filteredMainWorks = computed(() => {
  if (!currentArtist.value?.mainWorks) return []
  return applySortAndFilter([...currentArtist.value.mainWorks])
})
const filteredCompilations = computed(() => {
  if (!currentArtist.value?.compilations) return []
  return applySortAndFilter([...currentArtist.value.compilations])
})

// FIX UX: keep currentWorkList reactive — it now auto-updates when filters change
// so nav arrows in detail view reflect the live filtered set
watchEffect(() => {
  if (currentView.value !== 'detail' || !currentWork.value) return
  const inMain = currentArtist.value?.mainWorks?.some(w => w.code === currentWork.value.code)
  const newList = inMain ? filteredMainWorks.value : filteredCompilations.value
  const newIdx  = newList.findIndex(w => w.code === currentWork.value.code)
  currentWorkList.value  = newList
  currentWorkIndex.value = newIdx >= 0 ? newIdx : 0
})

// USABILITY: computed viewFilter proxies into viewFilters map for the active view
// Read: returns the filter for whichever view is active (artists or works)
// Write: only updates the active view's entry — other views are unaffected
const viewFilter = computed({
  get() {
    if (currentView.value === 'works' || currentView.value === 'detail') return viewFilters.value.works
    return viewFilters.value.artists
  },
  set(val) {
    if (currentView.value === 'works' || currentView.value === 'detail') viewFilters.value.works = val
    else viewFilters.value.artists = val
  },
})

const workSections = computed(() => [
  { key: 'main', label: 'Main Works',   items: filteredMainWorks.value   },
  { key: 'comp', label: 'Compilations', items: filteredCompilations.value },
])

// USABILITY: global search — matches artists by name and works by code across all artists
const globalSearchResults = computed(() => {
  const q = globalQuery.value.trim().toLowerCase()
  if (!q || q.length < 2) return { artists: [], works: [] }
  const matchedArtists = artists.value.filter(a => a.name.toLowerCase().includes(q))
  const matchedWorks = []
  artists.value.forEach(a => {
    ;[...(a.mainWorks || []), ...(a.compilations || [])].forEach(w => {
      if (w.code.toLowerCase().includes(q)) matchedWorks.push({ work: w, artist: a })
    })
  })
  return {
    artists: matchedArtists.slice(0, 20),
    works:   matchedWorks.slice(0, 40),
  }
})

const galleryAllFailed = computed(() => galleryFailed.value.length >= 20)

const lbImgStyle = computed(() => ({
  transform: `scale(${lbZoom.value}) translate(${lbPanX.value / lbZoom.value}px, ${lbPanY.value / lbZoom.value}px)`,
  transition: lbDragging.value ? 'none' : 'transform 0.2s ease',
  cursor: lbZoom.value > 1 ? (lbDragging.value ? 'grabbing' : 'grab') : 'zoom-in',
}))
const lbMainStyle = computed(() => ({
  overflow: lbZoom.value > 1 ? 'visible' : 'hidden',
}))

const pullOpacity  = computed(() => Math.min(pullDistance.value / PULL_THRESHOLD, 1))
// ANIM 3: during refresh, pullSpinAngle increments continuously via rAF
const pullRotation = computed(() =>
  isPullRefreshing.value ? pullSpinAngle.value : (pullDistance.value / PULL_THRESHOLD) * 180
)
// ANIM 4: lightbox entrance origin fed into CSS custom property
const lbEntranceStyle = computed(() => ({
  '--lb-origin-x':     lbHeroOrigin.value.x,
  '--lb-origin-y':     lbHeroOrigin.value.y,
  '--lb-origin-scale': lbHeroOrigin.value.scale,
}))

// ─────────────────────────────────────────────────────────────────────────────
// Watchers — persistence
// ─────────────────────────────────────────────────────────────────────────────
watch(artists,       v => { try { localStorage.setItem('artists',       JSON.stringify(v)) } catch {} }, { deep: true })
watch(viewedArtists, v => { try { localStorage.setItem('viewedArtists', JSON.stringify(v)) } catch {} }, { deep: true })
watch(viewedWorks,   v => { try { localStorage.setItem('viewedWorks',   JSON.stringify(v)) } catch {} }, { deep: true })
watch(artistSortBy,  v => { try { localStorage.setItem('artistSortBy',  v)                 } catch {} })
watch(compactWorks,  v => { try { localStorage.setItem('compactWorks',  v ? '1' : '0')     } catch {} })
// USABILITY: persist per-view filters
watch(viewFilters,   v => { try { localStorage.setItem('viewFilters', JSON.stringify(v))   } catch {} }, { deep: true })
watch(darkMode, v => {
  try {
    localStorage.setItem('darkMode', v ? '1' : '0')
    document.documentElement.classList.toggle('dark', v)
  } catch {}
})
// FIX ARCH: debounced, batched write — single transaction per save cycle
let _saveImagesTimer = null
watch(customImages, v => {
  if (!customImagesLoaded.value) return
  clearTimeout(_saveImagesTimer)
  _saveImagesTimer = setTimeout(() => saveCustomImagesToDB(v), 300)
}, { deep: true })

watch(currentWork, () => { galleryFailed.value = []; galleryLoadedCount.value = 0 })

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
let _keydownHandler = null

onMounted(() => {
  isMobile.value = window.innerWidth <= 768
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 }, { passive: true })
  initializeApp()
  setupKeyboardShortcuts()
})

onBeforeUnmount(() => {
  if (_keydownHandler) document.removeEventListener('keydown', _keydownHandler)
  clearTimeout(_saveImagesTimer)
  if (_pullSpinRaf) cancelAnimationFrame(_pullSpinRaf)
})

// ─────────────────────────────────────────────────────────────────────────────
// Pull-to-refresh
// FIX UX: guards against triggering on tablet/pointer:coarse when not at top
// ─────────────────────────────────────────────────────────────────────────────
function onPullStart(e) {
  if (window.scrollY > 5) return          // stricter top-check
  if (window.matchMedia('(min-width: 769px)').matches) return  // disable on tablet+
  pullStartY.value = e.touches[0].clientY
}
function onPullMove(e) {
  if (isPullRefreshing.value || window.scrollY > 5) { pullDistance.value = 0; return }
  if (window.matchMedia('(min-width: 769px)').matches) { pullDistance.value = 0; return }
  const dy = e.touches[0].clientY - pullStartY.value
  if (dy < 0) { pullDistance.value = 0; return }
  pullDistance.value = Math.min(dy * 0.5, PULL_THRESHOLD + 20)
}
function onPullEnd() {
  if (pullDistance.value >= PULL_THRESHOLD && !isPullRefreshing.value) {
    isPullRefreshing.value = true
    pullDistance.value = 40
    // ANIM 3: continuous spin during refresh wait
    const startAngle = pullSpinAngle.value
    const startTime  = performance.now()
    function spin(now) {
      pullSpinAngle.value = startAngle + ((now - startTime) / 1000) * 360
      _pullSpinRaf = requestAnimationFrame(spin)
    }
    _pullSpinRaf = requestAnimationFrame(spin)

    setTimeout(() => {
      cancelAnimationFrame(_pullSpinRaf); _pullSpinRaf = null
      try {
        const entries = [
          ['artists',       v => { const p = JSON.parse(v); if (Array.isArray(p) && p.length) artists.value = normalizeArtists(p) }],
          ['viewedArtists', v => { viewedArtists.value   = JSON.parse(v) }],
          ['viewedWorks',   v => { viewedWorks.value     = JSON.parse(v) }],
          ['darkMode',      v => { darkMode.value        = v === '1'; document.documentElement.classList.toggle('dark', darkMode.value) }],
          ['artistSortBy',  v => { artistSortBy.value    = v }],
          ['compactWorks',  v => { compactWorks.value    = v === '1' }],
          ['viewFilters',   v => { const p = JSON.parse(v); if (p && typeof p === 'object') viewFilters.value = { artists: p.artists || 'all', works: p.works || 'all' } }],
        ]
        entries.forEach(([key, fn]) => { try { const v = localStorage.getItem(key); if (v !== null) fn(v) } catch {} })
      } catch {}
      pullDistance.value     = 0
      isPullRefreshing.value = false
      showToast('Refreshed')
    }, 800)
  } else {
    pullDistance.value = 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App init
// ─────────────────────────────────────────────────────────────────────────────
function initializeApp() {
  imageDB.init().then(ok => {
    if (ok) return imageDB.getAll().then(imgs => { customImages.value = imgs || {} })
    useLocalStorageFallback.value = true
    try { const s = localStorage.getItem('customImages'); if (s) customImages.value = JSON.parse(s) } catch {}
  }).catch(() => {
    useLocalStorageFallback.value = true
    try { const s = localStorage.getItem('customImages'); if (s) customImages.value = JSON.parse(s) } catch {}
  }).then(() => {
    customImagesLoaded.value = true
    const loads = [
      ['artists',      v => { const p = JSON.parse(v); if (Array.isArray(p) && p.length) artists.value = normalizeArtists(p) }],
      ['viewedArtists',v => { viewedArtists.value = JSON.parse(v) }],
      ['viewedWorks',  v => { viewedWorks.value   = JSON.parse(v) }],
      ['artistSortBy', v => { artistSortBy.value  = v }],
      ['darkMode',     v => { darkMode.value = v === '1'; document.documentElement.classList.toggle('dark', darkMode.value) }],
      ['compactWorks', v => { compactWorks.value  = v === '1' }],
      // USABILITY: restore per-view filters
      ['viewFilters',  v => { const p = JSON.parse(v); if (p && typeof p === 'object') viewFilters.value = { artists: p.artists || 'all', works: p.works || 'all' } }],
    ]
    loads.forEach(([key, fn]) => { try { const v = localStorage.getItem(key); if (v !== null) fn(v) } catch {} })
    setTimeout(() => { appReady.value = true }, 80)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcuts
// FIX ARCH: no global namespace — handler stored in local closure variable
// ─────────────────────────────────────────────────────────────────────────────
function setupKeyboardShortcuts() {
  _keydownHandler = e => {
    const tag     = document.activeElement?.tagName
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    if (e.key === '/' && !isInput) { e.preventDefault(); searchInputRef.value?.focus(); searchInputRef.value?.select(); return }
    // USABILITY: G opens global search from anywhere (not when typing)
    if ((e.key === 'g' || e.key === 'G') && !isInput && !showGlobalSearch.value) { e.preventDefault(); openGlobalSearch(); return }
    if (e.key === 'Escape') {
      if (showGlobalSearch.value)    { closeGlobalSearch();             return }
      if (importConfirm.value.show)  { cancelImport();                  return }
      if (showMenu.value)           { showMenu.value = false;          return }
      if (showBottomSheet.value)    { showBottomSheet.value = false;   return }
      if (lightbox.value.show)      { closeLightbox();                 return }
      if (showAddWorkModal.value)   { closeAddWorkModal();             return }
      if (showAddArtistModal.value) { showAddArtistModal.value = false;return }
      if (showUploadModal.value)    { closeUploadModal();              return }
      if (currentView.value === 'detail') { backToWorks();   return }
      if (currentView.value === 'works')  { backToArtists(); return }
    }
    if (lightbox.value.show) {
      // ANIM 1: nextImage/prevImage set lbSlideDir before changing index
      if (e.key === 'ArrowLeft')  prevImage()
      if (e.key === 'ArrowRight') nextImage()
    }
    if (currentView.value === 'detail' && !lightbox.value.show) {
      if (e.key === 'ArrowLeft'  && canNavigateWork(-1)) navigateWork(-1)
      if (e.key === 'ArrowRight' && canNavigateWork(1))  navigateWork(1)
    }
  }
  document.addEventListener('keydown', _keydownHandler)
  setTimeout(() => {
    if (currentView.value === 'artists') {
      showShortcutHint.value = true
      setTimeout(() => { showShortcutHint.value = false }, 3000)
    }
  }, 1500)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function cycleViewFilter() {
  viewFilter.value = viewFilter.value === 'all' ? 'unviewed' : viewFilter.value === 'unviewed' ? 'viewed' : 'all'
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
  else if (viewFilter.value === 'viewed') list = list.filter(w =>  viewedWorks.value.includes(w.code))
  if (workSortBy.value === 'codeAsc')   list.sort((a, b) => a.code.localeCompare(b.code))
  else if (workSortBy.value === 'codeDesc')  list.sort((a, b) => b.code.localeCompare(a.code))
  else if (workSortBy.value === 'newest')    list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
  else if (workSortBy.value === 'unviewed')  list.sort((a, b) =>
    (viewedWorks.value.includes(a.code) ? 1 : 0) - (viewedWorks.value.includes(b.code) ? 1 : 0)
  )
  return list
}

function onImgLoad(e)  { e.target.classList.add('loaded'); const sk = e.target.parentElement?.querySelector('.skeleton'); if (sk) sk.style.display = 'none' }
function onImgError(e) { e.target.style.display = 'none'; const sk = e.target.parentElement?.querySelector('.skeleton'); if (sk) sk.style.display = 'none' }
function onGalleryImgLoad(e, index) { e.target.classList.add('loaded'); galleryLoadedCount.value++ }
function onGalleryImgError(e, index) {
  e.target.style.display = 'none'
  const thumb = e.target.parentElement
  if (thumb) { const sk = thumb.querySelector('.skeleton'); if (sk) sk.style.display = 'none' }
  if (!galleryFailed.value.includes(index)) galleryFailed.value.push(index)
}

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
  const p = parseCode(work.code); if (!p || !p.id || p.id.length < 3) return { full: null }
  return {
    thumb: `https://pics.dmm.co.jp/digital/video/${p.id}/${p.id}ps.jpg`,
    full:  `https://pics.dmm.co.jp/digital/video/${p.id}/${p.id}pl.jpg`,
  }
}
function getImageUrl(code, quality) {
  if (!quality) quality = 'pl'
  if (quality === 'pl' && customImages.value[code]) return customImages.value[code]
  const p = parseCode(code); if (!p || !p.id || p.id.length < 3) return null
  if (quality !== 'pl') {
    const n = quality.split('-')[1] || '1'
    return `https://pics.dmm.co.jp/digital/video/${p.id}/${p.id}jp-${n}.jpg`
  }
  return `https://pics.dmm.co.jp/digital/video/${p.id}/${p.id}pl.jpg`
}
function hasCustomImage(code) { return !!customImages.value[code] }
function getCoverWork(artist) {
  if (artist?.cover) {
    const all = [...(artist.mainWorks || []), ...(artist.compilations || [])]
    const f = all.find(w => w.code === artist.cover); if (f) return f
  }
  return artist?.mainWorks?.[0] || artist?.compilations?.[0] || null
}
function scrollToLetter(letter) { const el = groupRefs.value[letter]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────
function goBack() {
  viewTransition.value = 'slide-left'
  currentView.value === 'detail' ? backToWorks() : backToArtists()
}
function selectArtist(name) {
  viewTransition.value = 'slide-right'; saveScrollPosition('artists')
  if (!viewedArtists.value.includes(name)) viewedArtists.value.push(name)
  activeTab.value = name; currentView.value = 'works'
  searchQuery.value = ''; workSortBy.value = 'default'
  // USABILITY: don't reset works filter — it persists in viewFilters.works
  gridGeneration.value++
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}
function backToArtists() {
  viewTransition.value = 'slide-left'
  currentView.value = 'artists'; activeTab.value = ''; searchQuery.value = ''
  // USABILITY: don't reset artists filter — it persists in viewFilters.artists
  gridGeneration.value++
  nextTick(() => setTimeout(() => restoreScrollPosition('artists'), 220))
}
function openWorkView(work) {
  viewTransition.value = 'slide-right'; saveScrollPosition('works')
  if (!viewedWorks.value.includes(work.code)) viewedWorks.value.push(work.code)
  const isMain = currentArtist.value?.mainWorks?.find(w => w.code === work.code)
  currentWorkList.value  = isMain ? filteredMainWorks.value : filteredCompilations.value
  currentWorkIndex.value = currentWorkList.value.findIndex(w => w.code === work.code)
  currentWork.value = work; currentView.value = 'detail'
  // ANIM 2: bump for detail view entrance stagger
  gridGeneration.value++
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}
function backToWorks() {
  viewTransition.value = 'slide-left'; currentWork.value = null; currentView.value = 'works'
  nextTick(() => setTimeout(() => restoreScrollPosition('works'), 220))
}
function saveScrollPosition(v)    { if (import.meta.client) scrollPositions.value[v] = window.scrollY || 0 }
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

// ─────────────────────────────────────────────────────────────────────────────
// Touch gestures
// ─────────────────────────────────────────────────────────────────────────────
function onDetailTouchStart(e) { detailTouchStartX.value = e.changedTouches[0].screenX; detailTouchStartY.value = e.changedTouches[0].screenY }
function onDetailTouchEnd(e) {
  const dx = e.changedTouches[0].screenX - detailTouchStartX.value
  const dy = e.changedTouches[0].screenY - detailTouchStartY.value
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
    if (dx > 0 && canNavigateWork(-1)) navigateWork(-1)
    else if (dx < 0 && canNavigateWork(1)) navigateWork(1)
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

// ─────────────────────────────────────────────────────────────────────────────
// Cover / artist management
// ─────────────────────────────────────────────────────────────────────────────
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
// ─── Surprise Me ─────────────────────────────────────────────────────────────
function surpriseMe() {
  if (!currentArtist.value) return
  // Pool: all unviewed works across both sections, respecting current filter
  const all = [
    ...(currentArtist.value.mainWorks    || []),
    ...(currentArtist.value.compilations || []),
  ]
  const unviewed = all.filter(w => !viewedWorks.value.includes(w.code))
  const pool = unviewed.length > 0 ? unviewed : all   // fall back to all if everything seen
  if (!pool.length) return showToast('No works found', 'info')
  const pick = pool[Math.floor(Math.random() * pool.length)]
  if (unviewed.length === 0) showToast('All viewed — picking anyway', 'info')
  openWorkView(pick)
}

function openAddWorkModal() { newWork.value = { artist: activeTab.value || '', code: '', type: 'mainWorks' }; showAddWorkModal.value = true }
function closeAddWorkModal() { showAddWorkModal.value = false }
function addNewWork() {
  if (!newWork.value.artist || !newWork.value.code) return showToast('Required fields', 'error')
  const code   = newWork.value.code.toUpperCase()
  const exists = artists.value.some(a => (a.mainWorks || []).some(w => w.code === code) || (a.compilations || []).some(w => w.code === code))
  if (exists) return showToast('Code exists', 'error')
  const artist = artists.value.find(a => a.name === newWork.value.artist)
  if (!artist) return showToast('Artist not found', 'error')
  if (!artist[newWork.value.type]) artist[newWork.value.type] = []
  artist[newWork.value.type].push({ code, addedAt: Date.now() })
  artists.value = [...artists.value]; closeAddWorkModal(); showToast('Added ' + code)
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom image upload
// FIX UX: loading state, disabled button, timeout visual feedback
// ─────────────────────────────────────────────────────────────────────────────
function openUploadModal(code) { uploadingWork.value = code; customImageUrl.value = customImages.value[code] || ''; showUploadModal.value = true }
function closeUploadModal()    { showUploadModal.value = false; uploadingWork.value = null; customImageUrl.value = ''; imageUrlLoading.value = false }
function handleCustomImageUrl() {
  const url = customImageUrl.value.trim()
  if (!url) {
    const n = { ...customImages.value }; delete n[uploadingWork.value]; customImages.value = n
    showToast('Image removed'); closeUploadModal(); return
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) return showToast('Must start with http(s)://', 'error')

  imageUrlLoading.value = true
  const img = new Image()
  const to  = setTimeout(() => {
    imageUrlLoading.value = false
    showToast('Image timed out', 'error')
    // FIX UX: modal stays open with error visible — don't close on timeout
  }, 10000)
  img.onload = () => {
    clearTimeout(to)
    imageUrlLoading.value = false
    customImages.value    = { ...customImages.value, [uploadingWork.value]: url }
    showToast('Image added')
    closeUploadModal()
  }
  img.onerror = () => {
    clearTimeout(to)
    imageUrlLoading.value = false
    showToast('Could not load image', 'error')
    // FIX UX: modal stays open so user can correct the URL
  }
  img.src = url
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// FIX BUG: cleanup now reliably removes listeners even after Transition unmounts
// the element, because we target the element reference captured at setup time.
// ─────────────────────────────────────────────────────────────────────────────
function openLightbox(work, startIndex = 0, triggerEl = null) {
  // ANIM 4: compute hero origin from the clicked thumbnail position
  if (triggerEl) {
    const rect   = triggerEl.getBoundingClientRect()
    const cx     = rect.left + rect.width  / 2
    const cy     = rect.top  + rect.height / 2
    const scaleX = rect.width  / window.innerWidth
    const scaleY = rect.height / window.innerHeight
    lbHeroOrigin.value = {
      x:     `${(cx / window.innerWidth  * 100).toFixed(1)}%`,
      y:     `${(cy / window.innerHeight * 100).toFixed(1)}%`,
      scale: Math.max(scaleX, scaleY).toFixed(3),
    }
  } else {
    lbHeroOrigin.value = { x: '50%', y: '50%', scale: 0.6 }
  }

  const failedSnap = [...galleryFailed.value]
  const allImgs = [{ url: getImageUrl(work.code), index: 0 }]
  for (let i = 1; i <= 20; i++) {
    if (!failedSnap.includes(i)) allImgs.push({ url: getImageUrl(work.code, 'jp-' + i), index: i })
  }
  const imgs        = allImgs.map(x => x.url)
  const mappedIndex = startIndex === 0 ? 0 : allImgs.findIndex(x => x.index === startIndex)
  lbSlideDir.value  = 'none'
  lbImgKey.value++
  lightbox.value    = { show: true, images: imgs, currentIndex: Math.max(0, mappedIndex), code: work.code }
  lbResetZoom()
  document.body.style.overflow = 'hidden'
  nextTick(() => setupSwipeGestures())
}

function closeLightbox() {
  cleanupSwipeGestures()
  lightbox.value.show = false
  document.body.style.overflow = ''
  lbResetZoom()
}

function lbResetZoom() { lbZoom.value = 1; lbPanX.value = 0; lbPanY.value = 0 }

// Mouse zoom & pan
function onLbWheel(e) {
  const delta = e.deltaY < 0 ? 0.15 : -0.15
  lbZoom.value = Math.min(5, Math.max(1, lbZoom.value + delta))
  if (lbZoom.value === 1) { lbPanX.value = 0; lbPanY.value = 0 }
}
function onLbDblClick(e) {
  if (e.target.classList.contains('lb') || e.target.classList.contains('lb-main')) { closeLightbox(); return }
  lbZoom.value > 1 ? lbResetZoom() : (lbZoom.value = 2.5)
}
function onLbBackdropClick() { lbZoom.value > 1 ? lbResetZoom() : closeLightbox() }
function onLbMouseDown(e) {
  if (lbZoom.value <= 1 || e.target.closest('button')) return
  lbDragging.value = true
  lbDragStart.value = { x: e.clientX, y: e.clientY }
  lbPanStart.value  = { x: lbPanX.value, y: lbPanY.value }
}
function onLbMouseMove(e) {
  if (!lbDragging.value) return
  lbPanX.value = lbPanStart.value.x + (e.clientX - lbDragStart.value.x)
  lbPanY.value = lbPanStart.value.y + (e.clientY - lbDragStart.value.y)
}
function onLbMouseUp() { lbDragging.value = false }

// ANIM 1: directional navigation — sets slide direction before changing index
function nextImage() {
  if (lightbox.value.currentIndex < lightbox.value.images.length - 1) {
    lbSlideDir.value = 'left'   // going forward = content slides left
    lbImgKey.value++
    lightbox.value.currentIndex++
    lbResetZoom()
  }
}
function prevImage() {
  if (lightbox.value.currentIndex > 0) {
    lbSlideDir.value = 'right'  // going back = content slides right
    lbImgKey.value++
    lightbox.value.currentIndex--
    lbResetZoom()
  }
}

// Touch: swipe + pinch
// FIX BUG: listeners stored in module-level variables (not window.*) and removed
// while element is still mounted (before lightbox.show = false)
function setupSwipeGestures() {
  const el = document.querySelector('.lb'); if (!el) return
  let pinchStartDist = null
  let pinchStartZoom = 1
  let lastTap        = 0

  _lbTouchStart = e => {
    if (e.touches.length === 2) {
      pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      pinchStartZoom = lbZoom.value
    } else if (e.touches.length === 1) {
      touchStartX.value = e.changedTouches[0].screenX
      touchStartY.value = e.changedTouches[0].screenY
      if (lbZoom.value > 1) {
        lbDragging.value  = true
        lbDragStart.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        lbPanStart.value  = { x: lbPanX.value, y: lbPanY.value }
      }
    }
  }

  _lbTouchMove = e => {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      lbZoom.value = Math.min(5, Math.max(1, pinchStartZoom * (dist / pinchStartDist)))
    } else if (e.touches.length === 1 && lbDragging.value) {
      lbPanX.value = lbPanStart.value.x + (e.touches[0].clientX - lbDragStart.value.x)
      lbPanY.value = lbPanStart.value.y + (e.touches[0].clientY - lbDragStart.value.y)
    }
  }

  _lbTouchEnd = e => {
    if (e.touches.length === 0) pinchStartDist = null
    lbDragging.value = false
    if (lbZoom.value > 1) return
    const now = Date.now()
    if (now - lastTap < 280) { lbZoom.value = 2.5; lastTap = 0; return }
    lastTap = now
    touchEndX.value = e.changedTouches[0].screenX
    touchEndY.value = e.changedTouches[0].screenY
    handleSwipe()
  }

  el.addEventListener('touchstart', _lbTouchStart, { passive: true  })
  el.addEventListener('touchmove',  _lbTouchMove,  { passive: false })
  el.addEventListener('touchend',   _lbTouchEnd,   { passive: true  })
}

function cleanupSwipeGestures() {
  // FIX BUG: query the element here while it's still mounted (called before hiding)
  const el = document.querySelector('.lb'); if (!el) return
  if (_lbTouchStart) { el.removeEventListener('touchstart', _lbTouchStart); _lbTouchStart = null }
  if (_lbTouchMove)  { el.removeEventListener('touchmove',  _lbTouchMove);  _lbTouchMove  = null }
  if (_lbTouchEnd)   { el.removeEventListener('touchend',   _lbTouchEnd);   _lbTouchEnd   = null }
}

function handleSwipe() {
  const dx = touchEndX.value - touchStartX.value
  const dy = touchEndY.value - touchStartY.value
  // ANIM 1: swipe direction drives the slide transition direction
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) dx > 0 ? prevImage() : nextImage()
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery / copy / external links
// ─────────────────────────────────────────────────────────────────────────────
function preloadAllGallery() {
  if (!currentWork.value) return
  isPreloading.value = true
  const promises = []
  for (let i = 1; i <= 20; i++) {
    promises.push(new Promise(res => { const img = new Image(); img.onload = img.onerror = res; img.src = getImageUrl(currentWork.value.code, 'jp-' + i) }))
  }
  Promise.all(promises).then(() => { isPreloading.value = false; showToast('Gallery loaded') })
}
function copyToClipboard(code) { navigator.clipboard.writeText(code).then(() => showToast('Copied: ' + code)).catch(() => showToast('Copy failed', 'error')) }
function openExternalLink(code, type) {
  const c     = code.toLowerCase()
  const p     = parseCode(code)
  const javId = p ? p.id : c.replace(/-/g, '')
  const urls  = {
    missav:      `https://missav.ws/en/${c}`,
    '24av':      `https://24av.net/en/v/${c}`,
    javtrailers: `https://javtrailers.com/video/${javId}`,
    njav:        `https://www.njav.com/en/xvideos/${c}`,
  }
  window.open(urls[type] || urls.njav, '_blank', 'noopener,noreferrer')
}

// ─────────────────────────────────────────────────────────────────────────────
// History / data management
// ─────────────────────────────────────────────────────────────────────────────
function clearViewHistory() {
  showConfirm({
    title:        'Clear history',
    message:      'This will remove all viewed markers for artists and works. Your data stays intact.',
    confirmLabel: 'Clear history',
    danger:       false,
    onConfirm: () => {
      viewedArtists.value = []; viewedWorks.value = []
      localStorage.removeItem('viewedArtists'); localStorage.removeItem('viewedWorks')
      showToast('History cleared')
    },
  })
}

// FIX BUG: export now produces valid JSON matching what importData expects
function exportData() {
  try {
    const payload = {
      version:  1,
      exported: new Date().toISOString(),
      artists:  artists.value.map(a => ({
        name:         a.name,
        cover:        a.cover  || '',
        url:          a.url    || '',
        mainWorks:    (a.mainWorks    || []).map(w => ({ code: w.code, addedAt: w.addedAt || 0 })),
        compilations: (a.compilations || []).map(w => ({ code: w.code, addedAt: w.addedAt || 0 })),
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `works-tracker-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url); showToast('Exported')
  } catch { showToast('Export failed', 'error') }
}

function triggerImport() { fileInputRef.value?.click() }

// USABILITY: import confirm — parse file first, show preview, apply only on confirm
const importConfirm = ref({ show: false, data: null, artistCount: 0, workCount: 0, imageCount: 0, hasImages: false })

function importData(event) {
  try {
    const file = event.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.artists || !Array.isArray(data.artists)) return showToast('Invalid format', 'error')
        // Compute preview counts before showing the confirm modal
        const workCount  = data.artists.reduce((s, a) =>
          s + (a.mainWorks?.length || 0) + (a.compilations?.length || 0), 0)
        const imageCount = data.customImages ? Object.keys(data.customImages).length : 0
        importConfirm.value = {
          show:        true,
          data,
          artistCount: data.artists.length,
          workCount,
          imageCount,
          hasImages:   imageCount > 0,
        }
      } catch { showToast('Invalid JSON', 'error') }
    }
    reader.readAsText(file); event.target.value = ''
  } catch { showToast('Import failed', 'error') }
}

function cancelImport() { importConfirm.value = { show: false, data: null, artistCount: 0, workCount: 0, imageCount: 0, hasImages: false } }

function confirmImport() {
  const data = importConfirm.value.data; if (!data) return
  artists.value      = normalizeArtists(data.artists)
  customImages.value = data.customImages || {}
  localStorage.setItem('artists', JSON.stringify(artists.value))
  cancelImport()
  showToast('Imported')
}

// ─────────────────────────────────────────────────────────────────────────────
// USABILITY: Global search
// ─────────────────────────────────────────────────────────────────────────────
function openGlobalSearch() {
  showGlobalSearch.value = true
  globalQuery.value = ''
  nextTick(() => globalSearchRef.value?.focus())
}
function closeGlobalSearch() {
  showGlobalSearch.value = false
  globalQuery.value = ''
}
function globalGoToArtist(name) {
  closeGlobalSearch()
  selectArtist(name)
}
function globalGoToWork({ work, artist }) {
  closeGlobalSearch()
  // Navigate: go to the artist's works view first, then open the detail
  if (activeTab.value !== artist.name) {
    viewTransition.value = 'slide-right'
    if (!viewedArtists.value.includes(artist.name)) viewedArtists.value.push(artist.name)
    activeTab.value   = artist.name
    currentView.value = 'works'
    searchQuery.value = ''; workSortBy.value = 'default'
    gridGeneration.value++
  }
  nextTick(() => openWorkView(work))
}

function hardRefresh() {
  showConfirm({
    title:        'Reset everything',
    message:      'All artists, works, images and history will be permanently deleted. This cannot be undone.',
    confirmLabel: 'Reset all',
    danger:       true,
    onConfirm: () => {
      ;['artists','viewedArtists','viewedWorks','artistSortBy','customImages'].forEach(k => localStorage.removeItem(k))
      const p = imageDB ? imageDB.clear() : Promise.resolve()
      p.then(() => {
        artists.value       = normalizeArtists(JSON.parse(JSON.stringify(DEFAULT_ARTISTS)))
        currentView.value   = 'artists'; activeTab.value = ''; customImages.value = {}
        viewedArtists.value = []; viewedWorks.value = []; artistSortBy.value = 'nameAsc'
        localStorage.setItem('artists', JSON.stringify(artists.value)); showToast('Reset complete')
      })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm dialog
// ─────────────────────────────────────────────────────────────────────────────
const confirmDialog = ref({ show: false, title: '', message: '', confirmLabel: '', danger: false, onConfirm: null })
function showConfirm({ title, message, confirmLabel, danger, onConfirm }) {
  confirmDialog.value = { show: true, title, message, confirmLabel, danger, onConfirm }
}
function closeConfirm() { confirmDialog.value.show = false }
function doConfirm()    { confirmDialog.value.onConfirm?.(); closeConfirm() }

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
let _toastTimer = null
function showToast(msg, type = 'success') {
  clearTimeout(_toastTimer)
  toast.value = { show: true, message: msg, type }
  _toastTimer  = setTimeout(() => { toast.value.show = false }, 2500)
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence helper (images)
// FIX ARCH: single batched transaction via setAll()
// ─────────────────────────────────────────────────────────────────────────────
function saveCustomImagesToDB(images) {
  if (useLocalStorageFallback.value) {
    try { localStorage.setItem('customImages', JSON.stringify(images)) } catch {}
  } else {
    imageDB.setAll(images).catch(() => {})
  }
}
</script>

<style scoped>
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
  /* USABILITY safe-area: grow bar height to cover the notch */
  height: calc(54px + env(safe-area-inset-top, 0px));
  padding-block-start: env(safe-area-inset-top, 0px);
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
.bar-left, .bar-right { display: flex; align-items: center; gap: 8px; }
.bar-right { flex-shrink: 0; }

.stats { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--ink2); }
.stats b { color: var(--ink); font-weight: 700; }
.stat-sep { color: var(--line2); margin-inline: 2px; }

.bar-artist { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bar-avatar {
  width: 28px; height: 28px; border-radius: 50%; overflow: hidden;
  background: var(--line); border: 1.5px solid var(--line2); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: var(--ink3);
}
.bar-avatar img { width: 100%; height: 100%; object-fit: cover; }

.bar-title {
  font-size: 15px; font-weight: 700; letter-spacing: -0.3px; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
}
.bar-title--mono { font-family: var(--mono); font-size: 14px; letter-spacing: 0; max-width: 140px; }
.bar-title--dim  { color: var(--ink3); max-width: 110px; font-size: 13px; }
.breadcrumb-arrow { color: var(--ink3); flex-shrink: 0; }

.bar-work-badge {
  display: flex; align-items: center; gap: 2px;
  padding: 3px 8px; border-radius: 20px;
  background: var(--warm-bg); border: 1.5px solid var(--warm); flex-shrink: 0;
}
.bar-viewed-count { font: 700 11px var(--mono); color: var(--warm-dark); }
.bar-total-sep    { font: 400 11px var(--mono); color: var(--warm); margin-inline: 1px; }
.bar-total-count  { font: 500 11px var(--mono); color: var(--warm); }

/* ─── Search ─── */
.search-box { position: relative; display: flex; align-items: center; }
.search-ico  { position: absolute; inset-inline-start: 10px; color: var(--ink3); pointer-events: none; }
.search-box input {
  width: 160px; padding: 8px 28px 8px 30px;
  border: 2px solid var(--line); border-radius: var(--r);
  background: var(--bg); font: 13px var(--sans); color: var(--ink);
  transition: border-color var(--t), background var(--t-color);
}
.search-box input:focus { outline: none; border-color: var(--ink); }
.search-box input::placeholder { color: var(--ink3); }
.search-x {
  position: absolute; inset-inline-end: 6px; width: 20px; height: 20px;
  background: var(--line); border: none; border-radius: 50%; cursor: pointer;
  font-size: 14px; color: var(--ink2); display: flex; align-items: center; justify-content: center;
}

/* ─── Buttons ─── */
.btn-back {
  width: 32px; height: 32px; border: 2px solid var(--ink); border-radius: 6px;
  background: var(--surface); cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: var(--ink); transition: background var(--t), color var(--t); flex-shrink: 0;
}
.btn-back:hover { background: var(--ink); color: var(--surface); }

.btn-filter {
  padding: 5px 11px; border: 1.5px solid var(--line2); border-radius: 20px;
  background: var(--surface); font: 600 11px var(--sans); color: var(--ink2);
  cursor: pointer; transition: border-color var(--t), color var(--t), background var(--t); white-space: nowrap;
}
.btn-filter:hover  { border-color: var(--ink); color: var(--ink); background: var(--bg); }
.btn-filter.active { background: var(--warm); border-color: var(--warm); color: #fff; }

.btn-icon {
  width: 32px; height: 32px; border: 1.5px solid var(--line2); border-radius: 6px;
  background: var(--surface); cursor: pointer; color: var(--ink2);
  display: flex; align-items: center; justify-content: center;
  transition: border-color var(--t), color var(--t), background var(--t); flex-shrink: 0;
}
.btn-icon:hover { border-color: var(--ink); color: var(--ink); }
.btn-icon.active { background: var(--warm-bg); border-color: var(--warm); color: var(--warm-dark); }

/* ─── Menu ─── */
.menu-wrap { position: relative; }
.btn-menu {
  width: 32px; height: 32px; border: 1.5px solid var(--line2); border-radius: 6px;
  background: var(--surface); cursor: pointer; color: var(--ink2);
  display: flex; align-items: center; justify-content: center;
  transition: border-color var(--t), color var(--t);
}
.btn-menu:hover { border-color: var(--ink); color: var(--ink); }

.menu-drop {
  position: absolute; inset-block-start: 42px; inset-inline-end: 0;
  min-width: 160px; background: var(--surface); border: 2px solid var(--ink);
  border-radius: var(--r); overflow: hidden; z-index: 200;
}
.menu-drop button {
  display: block; width: 100%; padding: 12px 16px; border: none; background: none;
  font: 500 13px var(--sans); color: var(--ink); text-align: start; cursor: pointer;
  transition: background var(--t);
}
.menu-drop button:hover { background: var(--bg); }
/* FIX CSS: dark mode danger item hover */
.menu-drop .menu-danger { color: #c44; }
.menu-drop .menu-danger:hover { background: var(--danger-bg); }

.menu-backdrop { position: fixed; inset: 0; z-index: 99; }

/* ─── Page ─── */
/* USABILITY safe-area: top padding accounts for bar + notch */
.page { padding: calc(74px + env(safe-area-inset-top, 0px)) 24px 48px; }

/* ─── Pull-to-refresh ─── */
.ptr-indicator {
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: height 0.15s ease; color: var(--ink3);
}

/* ─── Skeleton / image fade ─── */
.skeleton {
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(90deg, var(--line) 25%, var(--line2) 50%, var(--line) 75%);
  background-size: 200% 100%;
  animation: wt-shimmer 1.5s infinite;
}
.skeleton--hidden { display: none; }

.fade-img { opacity: 0; transition: opacity 0.3s ease; position: relative; z-index: 1; }
.fade-img.loaded { opacity: 1; }

/* ─── Alpha rail ─── */
.alpha-rail {
  position: fixed; inset-inline-end: 6px;
  /* USABILITY safe-area: start below bar + notch */
  inset-block-start: calc(54px + env(safe-area-inset-top, 0px));
  inset-block-end: 0;
  z-index: 60;
  display: flex; flex-direction: column; justify-content: center; padding-block: 8px;
}
.alpha-rail button {
  display: block; padding: 1px 4px; border: none; background: none;
  font: 600 9px var(--mono); color: var(--ink3); cursor: pointer; line-height: 1.4;
  transition: color var(--t);
}
.alpha-rail button.active     { color: var(--ink); }
.alpha-rail button:disabled   { opacity: 0.25; cursor: default; }
.alpha-rail button:hover:not(:disabled) { color: var(--warm); }

/* ─── Artist groups ─── */
.group { margin-block-end: 36px; }
.group-head {
  position: sticky;
  /* USABILITY safe-area: sticky offset accounts for bar + notch */
  inset-block-start: calc(54px + env(safe-area-inset-top, 0px));
  z-index: 50;
  display: flex; align-items: baseline; gap: 8px; padding-block: 10px; margin-block-end: 16px;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-block-end: 2px solid var(--ink); transition: background var(--t-color);
}
.letter  { font-size: 28px; font-weight: 700; letter-spacing: -1.5px; line-height: 1; }
.group-n { font-size: 13px; color: var(--ink3); font-weight: 600; }

/* ─── Grids ─── */
.grid-artists { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding-inline-end: 36px; }
.grid-works   { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
.grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }

/* ─── Artist card ─── */
.a-card { position: relative; cursor: pointer; border-radius: var(--r); overflow: hidden; transition: opacity var(--t), transform var(--t); }
.a-card:hover { transform: translateY(-2px); }
.a-card--dim { opacity: 0.35; }
.a-card--dim:hover { opacity: 0.6; }
.a-card:not(.a-card--dim) .a-img { border-color: var(--warm); }
.a-card:hover .a-img { border-color: var(--ink) !important; }
.a-card:hover .a-img img { transform: scale(1.04); transition: transform 0.3s ease; }

.a-img {
  position: relative; width: 100%; aspect-ratio: 3 / 2; background: var(--line);
  overflow: hidden; border: 2px solid var(--line); border-radius: var(--r);
  transition: border-color var(--t);
}
.a-img img { width: 100%; height: 100%; object-fit: cover; }
.a-ph { position: relative; z-index: 1; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; color: var(--line2); background: var(--bg); }
.a-overlay {
  position: absolute; inset-inline: 0; inset-block-end: 0; z-index: 2;
  padding: 24px 12px 10px; background: linear-gradient(transparent, rgba(0,0,0,.7));
  display: flex; justify-content: space-between; align-items: baseline;
}
.a-name  { font-size: 13px; font-weight: 700; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.4); }
.a-count { font-size: 11px; font-family: var(--mono); color: rgba(255,255,255,.9); font-weight: 600; }

.progress-bar  { position: absolute; inset-block-end: 0; inset-inline: 0; height: 3px; background: rgba(0,0,0,.3); z-index: 3; }
.progress-fill { height: 100%; background: var(--warm); transition: width 0.3s ease; border-end-end-radius: 2px; }

.badge-check { position: absolute; inset-block-start: 8px; inset-inline-start: 8px; z-index: 4; width: 22px; height: 22px; border-radius: 50%; background: var(--warm); color: #fff; display: flex; align-items: center; justify-content: center; }
.badge-check--tl { inset-block-start: 6px; inset-inline-start: 6px; width: 20px; height: 20px; }

/* ─── Works top bar ─── */
.works-top { display: flex; justify-content: space-between; align-items: center; margin-block-end: 24px; gap: 12px; flex-wrap: wrap; }
.works-info { flex: 1; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.chip { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: var(--mono); border: 1.5px solid var(--line2); color: var(--ink2); background: var(--surface); }
.chip--progress { border-color: var(--warm); color: var(--warm-dark); background: var(--warm-bg); }
.chip--url { text-decoration: none; display: inline-flex; align-items: center; gap: 5px; transition: border-color var(--t), color var(--t), background var(--t); }
.chip--url:hover { border-color: var(--warm); color: var(--warm-dark); background: var(--warm-bg); }

.works-actions { display: flex; gap: 8px; align-items: center; }
.sort-select { padding: 6px 10px; border: 1.5px solid var(--line2); border-radius: 6px; font: 500 12px var(--sans); color: var(--ink2); background: var(--surface); cursor: pointer; height: 32px; transition: background var(--t-color); }
.sort-select:focus { outline: none; border-color: var(--ink); }

.btn-add { padding-inline: 16px; height: 32px; background: var(--ink); color: var(--surface); border: 2px solid var(--ink); border-radius: 6px; font: 600 12px var(--sans); cursor: pointer; white-space: nowrap; transition: opacity var(--t); display: flex; align-items: center; gap: 4px; }
.btn-add:hover { opacity: 0.8; }

/* Surprise Me button */
.btn-surprise {
  padding-inline: 14px;
  height: 32px;
  background: var(--warm-bg);
  color: var(--warm-dark);
  border: 1.5px solid var(--warm);
  border-radius: 6px;
  font: 600 12px var(--sans);
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background var(--t), color var(--t), transform 0.15s ease;
}
.btn-surprise:hover {
  background: var(--warm);
  color: #fff;
}
.btn-surprise:active { transform: scale(0.95); }

/* ─── Work section ─── */
.w-section { margin-block-end: 40px; }
.w-head { display: flex; align-items: center; gap: 10px; margin-block-end: 16px; padding: 10px 14px; background: var(--surface); border: 1.5px solid var(--line2); border-radius: var(--r); }
.w-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--ink); }
.w-n     { font-size: 12px; color: var(--ink3); font-family: var(--mono); margin-inline-start: auto; }

/* ─── Work card ─── */
.w-card { position: relative; cursor: pointer; transition: transform 0.2s ease, opacity var(--t); }
.w-card:hover { transform: translateY(-3px); }
.w-card--dim { opacity: 0.4; }
.w-card--dim:hover { opacity: 0.6; }
.w-card:hover .w-img { border-color: var(--ink); }
.w-card:hover .w-img img { transform: scale(1.04); transition: transform 0.3s ease; }

.w-img { position: relative; width: 100%; aspect-ratio: 3 / 2; border: 2px solid var(--line); border-radius: var(--r); overflow: hidden; background: var(--bg); margin-block-end: 8px; transition: border-color var(--t); }
.w-img img { width: 100%; height: 100%; object-fit: cover; }

.badge-star { position: absolute; inset-block-start: 6px; inset-inline-end: 6px; z-index: 2; width: 22px; height: 22px; border-radius: 50%; background: var(--warm); color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.w-code {
  font: 600 12px var(--mono);
  color: var(--ink);
  display: block;
  padding-inline: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tooltip — only rendered when compact mode is on (.w-code--has-tip) */
.w-code--has-tip { position: relative; }
.w-code-tip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: var(--ink);
  color: var(--surface);
  font: 600 11px var(--mono);
  padding: 4px 8px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 20;
  /* arrow */
  filter: drop-shadow(0 2px 4px rgba(0,0,0,.2));
}
.w-code-tip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--ink);
}
.w-code--has-tip:hover .w-code-tip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ─── Detail ─── */
.detail { display: grid; grid-template-columns: 1fr 500px; gap: 24px; }
.detail-left  { display: flex; flex-direction: column; gap: 12px; }
.detail-right { display: flex; flex-direction: column; gap: 12px; }

.big-img { position: relative; width: 100%; aspect-ratio: 3 / 2; border: 2px solid var(--ink); border-radius: var(--r); overflow: hidden; cursor: pointer; background: var(--bg); }
.big-img img { width: 100%; height: 100%; object-fit: contain; }

/* ─── Actions panel ─── */
.actions { border: 1.5px solid var(--line2); border-radius: var(--r); overflow: hidden; background: var(--surface); }
.actions-btns { display: grid; grid-template-columns: repeat(3, 1fr); border-block-end: 1.5px solid var(--line2); }
.act-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 14px 8px; border: none; border-inline-end: 1.5px solid var(--line2); background: transparent; cursor: pointer; color: var(--ink2); transition: background var(--t), color var(--t); font: 500 11px var(--sans); text-align: center; min-width: 0; }
.act-btn:last-child { border-inline-end: none; }
.act-btn span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.act-btn:hover { background: var(--bg); color: var(--ink); }
.act-btn--on { background: var(--warm-bg); color: var(--warm-dark); }
.act-btn--on svg { color: var(--warm); }
.act-btn--primary { color: var(--ink); font-weight: 700; }
.act-btn--primary:hover { background: var(--ink); color: var(--surface); }

.actions-nav { display: flex; align-items: center; height: 48px; }
.nav-btn { height: 48px; width: 52px; flex-shrink: 0; border: none; border-inline-end: 1.5px solid var(--line2); background: transparent; cursor: pointer; color: var(--ink2); display: flex; align-items: center; justify-content: center; transition: background var(--t), color var(--t); }
.nav-btn:last-child { border-inline-end: none; border-inline-start: 1.5px solid var(--line2); }
.nav-btn:hover:not(:disabled) { background: var(--bg); color: var(--ink); }
.nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }

.d-code { font: 700 24px var(--mono); letter-spacing: -0.5px; word-break: break-all; padding: 14px 18px; border: 2px solid var(--ink); border-radius: var(--r); background: var(--surface); }

.artist-url-row { display: flex; align-items: center; gap: 8px; padding: 8px 14px; font: 500 11px var(--mono); color: var(--warm-dark); text-decoration: none; background: var(--warm-bg); border: 1.5px solid var(--warm); border-radius: var(--r); transition: background var(--t), color var(--t); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artist-url-row svg { color: var(--warm); flex-shrink: 0; }
.artist-url-row:hover { background: var(--warm); color: #fff; }
.artist-url-row:hover svg { color: #fff; }

.detail-section { background: var(--surface); border: 1.5px solid var(--line2); border-radius: var(--r); overflow: hidden; }
.section-header { display: flex; align-items: center; gap: 7px; padding: 10px 16px; font: 700 11px var(--sans); text-transform: uppercase; letter-spacing: 0.8px; color: var(--ink2); background: var(--bg); border-block-end: 1.5px solid var(--line2); transition: background var(--t-color); }
.section-header svg { color: var(--ink3); flex-shrink: 0; }
.section-header .btn-sm { margin-inline-start: auto; }

.link-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line2); }
.link-btn { padding-inline: 14px; height: 44px; border: none; background: var(--surface); font: 600 12px var(--sans); color: var(--ink); cursor: pointer; transition: background var(--t), color var(--t); display: flex; align-items: center; justify-content: center; gap: 6px; }
.link-btn:hover { background: var(--warm-bg); color: var(--warm-dark); }
.link-btn:hover svg { color: var(--warm); }

.nav-pos { font: 700 13px var(--mono); flex: 1; text-align: center; white-space: nowrap; }
.nav-pos small { font-weight: 400; color: var(--ink3); }

.btn-sm { padding: 3px 10px; border: 1.5px solid var(--line2); border-radius: 20px; background: var(--surface); font: 600 11px var(--sans); color: var(--ink2); cursor: pointer; transition: border-color var(--t), color var(--t); }
.btn-sm:hover:not(:disabled) { border-color: var(--ink); color: var(--ink); }
.btn-sm:disabled { opacity: 0.35; }

/* ─── Gallery ─── */
.gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px 16px; }
.thumb { position: relative; aspect-ratio: 3 / 2; border-radius: 6px; overflow: hidden; cursor: pointer; background: var(--bg); border: 1.5px solid var(--line); transition: transform var(--t), border-color var(--t); }
.thumb:hover { transform: scale(1.04); border-color: var(--warm); }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.t-n { position: absolute; inset-block-end: 4px; inset-inline-end: 6px; font: 700 10px var(--mono); color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.7); z-index: 2; }
.gallery-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 28px 0 20px; color: var(--ink3); font-size: 13px; }

/* ─── Modals ─── */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 20px; }
.modal { width: 100%; max-width: 420px; background: var(--surface); border: 2px solid var(--ink); border-radius: var(--r); overflow: hidden; }
.m-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-block-end: 2px solid var(--ink); }
.m-head h3 { font-size: 16px; font-weight: 700; }
.m-x { width: 32px; height: 32px; border: none; background: none; font-size: 22px; cursor: pointer; color: var(--ink2); }
.m-body { padding: 20px; }
.m-sub  { font: 500 13px var(--mono); color: var(--ink2); margin-block-end: 16px; }
.m-foot { display: flex; gap: 8px; padding: 16px 20px; border-block-start: 2px solid var(--line); background: var(--bg); }

/* FIX UX: loading hint state */
.hint { font-size: 11px; color: var(--ink3); margin-block-start: -8px; }
.hint--loading { color: var(--warm-dark); font-weight: 600; }

.field { display: block; margin-block-end: 16px; }
.field span { display: block; font: 600 11px var(--sans); text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink2); margin-block-end: 6px; }
.field input, .field select { width: 100%; padding: 10px 14px; border: 2px solid var(--line); border-radius: var(--r); font: 14px var(--sans); color: var(--ink); background: var(--bg); transition: border-color var(--t), background var(--t-color); }
.field input:focus, .field select:focus { outline: none; border-color: var(--ink); }

.radios { display: flex; gap: 8px; }
.radio { flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 2px solid var(--line); border-radius: var(--r); cursor: pointer; transition: border-color var(--t); }
.radio:hover { border-color: var(--line2); }
.radio input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--warm); }
.radio span  { font: 500 13px var(--sans); }

.btn-flat, .btn-fill { flex: 1; padding-block: 10px; border-radius: 6px; font: 600 13px var(--sans); cursor: pointer; transition: border-color var(--t), color var(--t), background var(--t), opacity var(--t); border: 1.5px solid; }
.btn-flat { background: var(--surface); color: var(--ink2); border-color: var(--line); }
.btn-flat:hover { border-color: var(--ink); color: var(--ink); }
.btn-fill { background: var(--ink); color: var(--surface); border-color: var(--ink); }
.btn-fill:hover { opacity: 0.85; }
.btn-fill:disabled { opacity: 0.45; cursor: not-allowed; }

/* ─── Bottom Sheet ─── */
.sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 300; display: flex; align-items: flex-end; height: 100dvh; }
.bottom-sheet { width: 100%; background: var(--surface); border-radius: 16px 16px 0 0; padding: 12px 20px 36px; padding-block-end: max(36px, env(safe-area-inset-bottom, 36px)); border-block-start: 2px solid var(--ink); display: flex; flex-direction: column; gap: 20px; max-height: 85vh; overflow-y: auto; }
.sheet-handle { width: 40px; height: 4px; background: var(--line2); border-radius: 2px; margin: 0 auto 4px; }
.sheet-title  { font: 700 16px var(--sans); }
.sheet-section{ display: flex; flex-direction: column; gap: 10px; }
.sheet-label  { font: 600 11px var(--sans); text-transform: uppercase; letter-spacing: 0.6px; color: var(--ink3); }
.sheet-pills  { display: flex; flex-wrap: wrap; gap: 8px; }

.pill { padding: 7px 16px; border: 1.5px solid var(--line2); border-radius: 20px; background: var(--surface); font: 600 13px var(--sans); color: var(--ink2); cursor: pointer; transition: background var(--t), border-color var(--t), color var(--t); }
.pill--active { background: var(--warm); border-color: var(--warm); color: #fff; }

.sheet-done { padding-block: 14px; background: var(--ink); color: var(--surface); border: none; border-radius: var(--r); font: 700 15px var(--sans); cursor: pointer; transition: opacity var(--t); }
.sheet-done:hover { opacity: 0.85; }

/* ─── Lightbox ─── */
.lb { position: fixed; inset: 0; background: rgba(0,0,0,.95); display: flex; align-items: center; justify-content: center; z-index: 400; touch-action: none; user-select: none; }
.lb-close { position: fixed; inset-block-start: 16px; inset-inline-end: 16px; width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: #fff; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--t); z-index: 1; }
.lb-close:hover { background: rgba(255,255,255,.15); }

.lb-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90vw;
  height: 90vh;
  /* overflow managed by lbMainStyle computed — visible when zoomed */
  overflow: hidden;
}
.lb-main img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: var(--r); user-select: none; -webkit-user-drag: none; display: block; transform-origin: center center; will-change: transform; }

/* Wrapper that Vue's slide transition animates — keeps img transform isolated */
.lb-img-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* make sure the wrapper itself never clips a zoomed/panned image */
  overflow: visible;
}

.lb-arr { position: fixed; inset-block-start: 50%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: #fff; font-size: 22px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--t); z-index: 1; }
.lb-arr:hover:not(:disabled) { background: rgba(255,255,255,.15); }
.lb-arr:disabled { opacity: 0.2; cursor: not-allowed; }
.lb-arr--left  { inset-inline-start: 20px; }
.lb-arr--right { inset-inline-end: 20px; }

.lb-hud { position: fixed; inset-block-end: 24px; inset-inline-start: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; padding: 6px 16px; white-space: nowrap; }
.lb-count     { color: #fff; font: 600 13px var(--mono); }
.lb-zoom-hint { color: rgba(255,255,255,.4); font: 400 11px var(--sans); }
.lb-reset { border: none; background: rgba(255,255,255,.12); color: #fff; font: 600 11px var(--sans); padding: 3px 10px; border-radius: 20px; cursor: pointer; transition: background var(--t); }
.lb-reset:hover { background: rgba(255,255,255,.22); }

/* ─── Toast ─── */
.toast { position: fixed; inset-block-end: 28px; inset-inline-end: 28px; padding: 12px 20px; border-radius: var(--r); border: 2px solid; font: 600 13px var(--sans); z-index: 500; background: var(--surface); }
.toast--success { border-color: var(--warm);   color: var(--warm-dark); }
.toast--error   { border-color: #c44;          color: #a33; }
.toast--info    { border-color: var(--ink);    color: var(--ink); }

/* ─── Misc ─── */
.empty { padding-block: 80px; text-align: center; color: var(--ink3); font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 12px; }

.shortcut-hint { position: fixed; inset-block-end: 28px; inset-inline-start: 50%; transform: translateX(-50%) translateY(12px); padding: 8px 14px; background: var(--surface); border: 2px solid var(--line2); border-radius: 20px; font: 500 12px var(--sans); color: var(--ink3); z-index: 50; opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; white-space: nowrap; }
.shortcut-hint--visible { opacity: 1; transform: translateX(-50%) translateY(0); }
.shortcut-hint kbd { display: inline-block; padding: 1px 6px; background: var(--bg); border: 1.5px solid var(--line2); border-radius: 4px; font: 700 11px var(--mono); color: var(--ink2); margin-inline-end: 4px; }

/* ─── Confirm dialog ─── */
.confirm-modal { max-width: 400px; }
.confirm-title-row { display: flex; align-items: center; gap: 10px; }
.confirm-icon-badge { width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid var(--line2); background: var(--bg); display: flex; align-items: center; justify-content: center; color: var(--ink2); flex-shrink: 0; }
.confirm-icon-badge--danger { border-color: #c44; background: var(--danger-bg); color: #c44; }
/* FIX CSS: dark mode danger badge via token instead of hardcoded colour */
.confirm-message { font-size: 13px; line-height: 1.65; color: var(--ink2); margin: 0; }
.btn-fill--danger { background: #c44; border-color: #c44; }
.btn-fill--danger:hover { opacity: 0.9; }

/* ─── USABILITY: Global search overlay ─── */
.gs-backdrop {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex; align-items: flex-start; justify-content: center;
  padding-block-start: max(80px, calc(54px + env(safe-area-inset-top, 0px) + 20px));
  padding-inline: 16px;
}
.gs-panel {
  width: 100%; max-width: 580px;
  background: var(--surface);
  border: 2px solid var(--ink);
  border-radius: var(--r);
  overflow: hidden;
  max-height: calc(100dvh - 120px);
  display: flex; flex-direction: column;
  box-shadow: 0 24px 48px rgba(0,0,0,.3);
}
.gs-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-block-end: 1.5px solid var(--line);
  flex-shrink: 0;
}
.gs-ico { color: var(--ink3); flex-shrink: 0; }
.gs-input {
  flex: 1; border: none; background: transparent;
  font: 500 15px var(--sans); color: var(--ink);
  outline: none;
}
.gs-input::placeholder { color: var(--ink3); }
.gs-clear {
  width: 22px; height: 22px; border-radius: 50%; border: none;
  background: var(--line); color: var(--ink2); font-size: 15px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.gs-esc {
  padding: 2px 7px; border: 1.5px solid var(--line2); border-radius: 4px;
  font: 600 10px var(--mono); color: var(--ink3);
  cursor: pointer; flex-shrink: 0;
  transition: border-color var(--t), color var(--t);
}
.gs-esc:hover { border-color: var(--ink); color: var(--ink); }
.gs-body {
  overflow-y: auto; flex: 1;
  padding-block: 8px;
}
.gs-hint {
  display: flex; align-items: center; justify-content: center;
  padding: 32px 20px; color: var(--ink3); font-size: 13px; text-align: center;
}
.gs-section { margin-block-end: 4px; }
.gs-section-label {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 16px 4px;
  font: 700 10px var(--sans); text-transform: uppercase; letter-spacing: 0.7px;
  color: var(--ink3);
}
.gs-count {
  margin-inline-start: auto;
  font: 600 11px var(--mono); color: var(--ink3);
}
.gs-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px 16px;
  border: none; background: none; cursor: pointer; text-align: start;
  transition: background var(--t);
  position: relative; overflow: hidden;
}
.gs-row:hover { background: var(--bg); }
.gs-row-avatar {
  width: 32px; height: 32px; border-radius: 50%; overflow: hidden;
  background: var(--line); border: 1.5px solid var(--line2); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font: 700 12px var(--sans); color: var(--ink3);
}
.gs-row-avatar img { width: 100%; height: 100%; object-fit: cover; }
.gs-row-thumb {
  width: 40px; height: 28px; border-radius: 4px; overflow: hidden;
  background: var(--line); flex-shrink: 0;
}
.gs-row-thumb img { width: 100%; height: 100%; object-fit: cover; }
.gs-row-name {
  font: 600 13px var(--sans); color: var(--ink); flex: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gs-row-meta {
  font: 500 11px var(--mono); color: var(--ink3); flex-shrink: 0;
}
.gs-row-info {
  flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;
}
.gs-row-code  { font: 600 13px var(--mono); color: var(--ink); }
.gs-row-artist{ font: 500 11px var(--sans); color: var(--ink3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gs-row-seen {
  width: 18px; height: 18px; border-radius: 50%; background: var(--warm);
  color: #fff; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
/* progress bar sliver at bottom of artist result row */
.gs-row-progress {
  position: absolute; inset-block-end: 0; inset-inline-start: 0;
  height: 2px; background: var(--warm); opacity: 0.5;
  transition: width 0.3s ease;
}
.gs-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 20px; color: var(--ink3); font-size: 13px;
}

/* ─── USABILITY: Import confirm ─── */
.import-summary {
  display: flex; align-items: center; justify-content: center;
  gap: 0; margin-block-end: 16px;
  background: var(--bg); border: 1.5px solid var(--line2); border-radius: var(--r);
  overflow: hidden;
}
.import-stat {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 16px 12px; gap: 4px;
}
.import-stat-val   { font: 700 28px var(--mono); color: var(--ink); letter-spacing: -1px; }
.import-stat-label { font: 600 11px var(--sans); text-transform: uppercase; letter-spacing: 0.6px; color: var(--ink3); }
.import-stat-sep   { width: 1px; align-self: stretch; background: var(--line2); }
.import-warning {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 12px; line-height: 1.6; color: var(--ink2);
  padding: 10px 12px; background: var(--warm-bg);
  border: 1.5px solid var(--warm); border-radius: 6px;
}
.import-warning svg { color: var(--warm); flex-shrink: 0; margin-block-start: 2px; }

/* ─── USABILITY: Global search transition ─── */
/* ─── ANIM 2: Staggered grid entrance ─── */
/* Animate only transform — never opacity — so .a-card--dim and .w-card--dim
   opacity values are never overridden by animation fill-mode */
.a-card {
  animation: wt-card-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(min(var(--stagger-i, 0), 10) * 40ms);
}
.w-card {
  animation: wt-card-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(min(var(--stagger-i, 0), 12) * 30ms);
}

/* ─── ANIM 5: Spring modal entrance ─── */
:deep(.app-load-leave-active) { transition: opacity 0.25s ease; }
:deep(.app-load-leave-to)     { opacity: 0; }

/* USABILITY: global search panel — backdrop fades, panel springs in from above */
:deep(.gs-fade-enter-active) { transition: opacity 0.2s ease; }
:deep(.gs-fade-leave-active) { transition: opacity 0.18s ease; }
:deep(.gs-fade-enter-from),
:deep(.gs-fade-leave-to)     { opacity: 0; }
:deep(.gs-fade-enter-active .gs-panel) {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
:deep(.gs-fade-leave-active .gs-panel) {
  transition: transform 0.18s ease;
}
:deep(.gs-fade-enter-from .gs-panel) { transform: translateY(-16px) scale(0.97); }
:deep(.gs-fade-leave-to .gs-panel)   { transform: translateY(-8px) scale(0.98); }

:deep(.fade-enter-active), :deep(.fade-leave-active) { transition: opacity 0.2s; }
:deep(.fade-enter-from),   :deep(.fade-leave-to)     { opacity: 0; }

/* Spring overshoot on enter, clean fade+slide on leave */
:deep(.m-enter-active) {
  transition: opacity 0.3s ease,
              transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
:deep(.m-leave-active) { transition: opacity 0.18s ease, transform 0.18s ease; }
:deep(.m-enter-from)   { opacity: 0; transform: scale(0.88) translateY(8px); }
:deep(.m-leave-to)     { opacity: 0; transform: scale(0.95) translateY(4px); }

:deep(.toast-enter-active), :deep(.toast-leave-active) { transition: opacity 0.25s ease, transform 0.25s ease; }
:deep(.toast-enter-from),   :deep(.toast-leave-to)     { opacity: 0; transform: translateY(12px); }

:deep(.drop-enter-active) { transition: opacity 0.15s ease, transform 0.15s ease; }
:deep(.drop-leave-active) { transition: opacity 0.1s ease,  transform 0.1s ease; }
:deep(.drop-enter-from)   { opacity: 0; transform: translateY(-4px); }
:deep(.drop-leave-to)     { opacity: 0; }

:deep(.sheet-enter-active) { transition: transform 0.3s cubic-bezier(.32,0,.67,0); }
:deep(.sheet-leave-active) { transition: transform 0.2s ease; }
:deep(.sheet-enter-from), :deep(.sheet-leave-to) { transform: translateY(100%); }

/* Deeper slide offset for more physical feel */
:deep(.slide-right-enter-active), :deep(.slide-right-leave-active),
:deep(.slide-left-enter-active),  :deep(.slide-left-leave-active) {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
:deep(.slide-right-enter-from) { opacity: 0; transform: translateX( 48px); }
:deep(.slide-right-leave-to)   { opacity: 0; transform: translateX(-48px); }
:deep(.slide-left-enter-from)  { opacity: 0; transform: translateX(-48px); }
:deep(.slide-left-leave-to)    { opacity: 0; transform: translateX( 48px); }

/* ANIM 4: Hero lightbox entrance — expands from thumbnail position */
:deep(.lb-enter-active) { transition: opacity 0.25s ease; }
:deep(.lb-enter-active .lb-main) {
  animation: wt-lb-hero-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}
:deep(.lb-enter-from) { opacity: 0; }
:deep(.lb-leave-active) { transition: opacity 0.2s ease; }
:deep(.lb-leave-to)     { opacity: 0; }

/* ANIM 1: Directional slide between lightbox images */
/* Vue animates .lb-img-wrap; lbImgStyle transform only lives on the img inside */
:deep(.lb-slide-left-enter-active),
:deep(.lb-slide-left-leave-active),
:deep(.lb-slide-right-enter-active),
:deep(.lb-slide-right-leave-active) {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
:deep(.lb-slide-left-enter-from)  { opacity: 0; transform: translateX( 80px); }
:deep(.lb-slide-left-leave-to)    { opacity: 0; transform: translateX(-80px); }
:deep(.lb-slide-right-enter-from) { opacity: 0; transform: translateX(-80px); }
:deep(.lb-slide-right-leave-to)   { opacity: 0; transform: translateX( 80px); }
/* Neutral fade when direction is unknown (first open) */
:deep(.lb-slide-none-enter-active),
:deep(.lb-slide-none-leave-active) {
  transition: opacity 0.15s ease;
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
:deep(.lb-slide-none-enter-from),
:deep(.lb-slide-none-leave-to) { opacity: 0; }

/* ─── Responsive ─── */
@media (max-width: 1200px) { .detail { grid-template-columns: 1fr; } }

@media (min-width: 1025px) and (max-width: 1500px) {
  .page { padding-inline: 32px; }
  .grid-artists { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
  .grid-works   { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
  .grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .detail { grid-template-columns: 1fr 480px; gap: 24px; }
  .gallery { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .bar { height: calc(56px + env(safe-area-inset-top, 0px)); padding-inline: 20px; padding-block-start: env(safe-area-inset-top, 0px); }
  .search-box input { width: 180px; font-size: 14px; }
  .btn-back, .btn-icon, .btn-menu { width: 40px; height: 40px; }
  .bar-title { font-size: 16px; max-width: 220px; }
  .page { padding: calc(80px + env(safe-area-inset-top, 0px)) 28px 48px; }
  .group-head { inset-block-start: calc(56px + env(safe-area-inset-top, 0px)); }
  .letter { font-size: 32px; }
  .grid-artists { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; padding-inline-end: 40px; }
  .grid-works   { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .detail { grid-template-columns: 1fr; gap: 20px; }
  .gallery { grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .act-btn { padding-block: 18px; font-size: 12px; gap: 8px; }
  .actions-nav { height: 56px; }
  .nav-btn { height: 56px; width: 64px; }
  .alpha-rail button { font-size: 10px; padding: 2px 5px; }
  .works-top { gap: 16px; }
  .btn-add { height: 40px; padding-inline: 20px; font-size: 13px; }
  .sort-select { height: 40px; font-size: 13px; }
  .chip { font-size: 12px; padding: 5px 14px; }
  .link-grid { grid-template-columns: 1fr 1fr; }
  .modal { max-width: 500px; }
  .pill { padding: 10px 20px; font-size: 14px; }
  .bar-work-badge { display: flex; }
}

@media (max-width: 768px) {
  .bar { padding-inline: 14px; height: calc(50px + env(safe-area-inset-top, 0px)); padding-block-start: env(safe-area-inset-top, 0px); gap: 8px; }
  .stats { font-size: 12px; }
  .search-box input { width: 110px; font-size: 12px; }
  .page { padding: calc(66px + env(safe-area-inset-top, 0px)) 14px 36px; }
  .group-head { inset-block-start: calc(50px + env(safe-area-inset-top, 0px)); }
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
  .page { padding: calc(60px + env(safe-area-inset-top, 0px)) 12px 28px; }
  .group-head { inset-block-start: calc(50px + env(safe-area-inset-top, 0px)); }
  .letter { font-size: 22px; }
  .grid-artists { grid-template-columns: repeat(2, 1fr); gap: 10px; padding-inline-end: 18px; }
  .grid-works   { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .grid-works--compact { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .works-top { flex-direction: column; align-items: stretch; }
  .works-actions { justify-content: flex-end; }
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
  .btn-icon, .btn-menu { width: 28px; height: 28px; }
  .bar { padding-inline: 10px; gap: 6px; }
}

@media (pointer: coarse) and (min-width: 769px) {
  .a-card:hover { transform: none; }
  .w-card:hover { transform: none; }
  .thumb:hover  { transform: none; }
  .nav-btn { min-width: 56px; }
  .bottom-sheet { padding-block-end: max(48px, env(safe-area-inset-bottom, 48px)); }
  .pill { min-height: 44px; }
  .sheet-done { min-height: 52px; }
  .lb-arr { width: 60px; height: 60px; font-size: 28px; }
  .lb-close { width: 52px; height: 52px; font-size: 28px; }
}
</style>

<!-- ─── Global tokens — must stay unscoped so dark-mode class toggle works ─── -->
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg:        #F8F6F2;
  --surface:   #FFFFFF;
  --ink:       #1A1A1A;
  --ink2:      #6B6560;
  --ink3:      #A09A93;
  --warm:      #C8785A;
  --warm-bg:   #FDF0EB;
  --warm-dark: #9E5A3E;
  --line:      #E6E1DB;
  --line2:     #D5CFC8;
  /* FIX CSS: danger token — safe in both light and dark */
  --danger-bg: #fef0f0;
  --r:         8px;
  --t:         180ms ease;
  --t-color:   200ms ease;
  --mono:      'IBM Plex Mono', monospace;
  --sans:      'DM Sans', -apple-system, sans-serif;
}

.dark {
  --bg:        #111110;
  --surface:   #1C1B19;
  --ink:       #F0EDE8;
  --ink2:      #9A948D;
  --ink3:      #5C5852;
  --warm:      #D4845F;
  --warm-bg:   #2A1E18;
  --warm-dark: #E8A080;
  --line:      #2A2925;
  --line2:     #353330;
  /* FIX CSS: dark-mode danger background — was hardcoded #fef0f0 everywhere */
  --danger-bg: #2a1010;
}

html, body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  transition: background var(--t-color), color var(--t-color);
}

/* FIX CSS: @keyframes belong in the global block so they are reachable
   by scoped-component classes without :deep() gymnastics */
@keyframes wt-pulse {
  from { opacity: 0.5; transform: scale(.95); }
  to   { opacity: 1;   transform: scale(1);   }
}
@keyframes wt-loadbar {
  0%   { width: 0;   margin-inline-start: 0;    }
  50%  { width: 60%; margin-inline-start: 20%;  }
  100% { width: 0;   margin-inline-start: 100%; }
}
@keyframes wt-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

/* ANIM 2: staggered card entrance — float up only via transform.
   Opacity intentionally excluded so .a-card--dim / .w-card--dim
   values are never overridden by animation fill-mode: both */
@keyframes wt-card-in {
  from { transform: translateY(18px) scale(0.96); }
  to   { transform: translateY(0)    scale(1);    }
}

/* ANIM 4: lightbox hero entrance — expands from thumbnail origin
   Uses CSS custom properties set inline by lbEntranceStyle computed */
@keyframes wt-lb-hero-in {
  from {
    opacity: 0;
    transform-origin: var(--lb-origin-x, 50%) var(--lb-origin-y, 50%);
    transform: scale(var(--lb-origin-scale, 0.6));
  }
  to {
    opacity: 1;
    transform-origin: var(--lb-origin-x, 50%) var(--lb-origin-y, 50%);
    transform: scale(1);
  }
}
</style>