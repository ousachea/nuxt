<template>
  <Transition name="app-load">
    <div v-if="!appReady" class="app-loading">
      <div class="loading-logo">W</div>
      <div class="loading-bar">
        <div class="loading-fill"></div>
      </div>
    </div>
  </Transition>

  <div v-if="appReady" class="app" :class="{ dark: darkMode }" @touchstart="onAppTouchStart" @touchend="onAppTouchEnd">
    <header class="bar">
      <div class="bar-left">
        <button v-if="currentView !== 'artists'" @click="goBack" class="btn-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div v-if="currentView === 'artists'" class="stats">
          <span class="stat"><b>{{ artists.length }}</b> artists</span>
          <span class="stat-sep">/</span>
          <span class="stat"><b>{{ totalCount }}</b> works</span>
          <span class="stat-sep">/</span>
          <span class="stat"><b>{{ viewedWorks.size }}</b> viewed</span>
        </div>
        <div v-if="currentView === 'works' && currentArtist" class="bar-artist">
          <div class="bar-avatar">
            <img v-if="getProgressiveImage(currentArtist).full" :src="getProgressiveImage(currentArtist).full"
              @error="onImgError" />
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
            <img v-if="getProgressiveImage(currentArtist).full" :src="getProgressiveImage(currentArtist).full"
              @error="onImgError" />
            <span v-else>{{ currentArtist.name.charAt(0) }}</span>
          </div>
          <span class="bar-title bar-title--dim">{{ currentArtist.name }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            class="breadcrumb-arrow">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span v-if="currentWork" class="bar-title bar-title--mono">{{ currentWork.code }}</span>
        </div>
      </div>
      <div class="bar-right">
        <div class="search-box">
          <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input ref="searchInputRef" v-model="searchQuery" type="text"
            :placeholder="currentView === 'works' ? 'Filter works...' : 'Search...'" />
          <button v-if="searchQuery" @click="searchQuery = ''" class="search-x">&times;</button>
        </div>
        <button v-if="(currentView === 'works' || currentView === 'artists') && !isMobile" @click="cycleViewFilter"
          class="btn-filter" :class="{ active: viewFilter !== 'all' }">
          {{ viewFilter === 'all' ? 'All' : viewFilter === 'unviewed' ? 'New' : 'Seen' }}
        </button>
        <button v-if="currentView === 'works' && !isMobile" @click="compactWorks = !compactWorks" class="btn-icon"
          :class="{ active: compactWorks }" title="Compact view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
        <button @click="toggleDarkMode" class="btn-icon" title="Toggle dark mode">
          <svg v-if="!darkMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5">
            <circle cx="12" cy="12" r="5" />
            <path
              d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </button>
        <button @click="openGlobalSearch" class="btn-icon" title="Global search (G)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="11" y1="8" x2="11" y2="14" />
          </svg>
        </button>
        <button v-if="(currentView === 'works' || currentView === 'artists') && isMobile"
          @click="showBottomSheet = true" class="btn-icon"
          :class="{ active: viewFilter !== 'all' || workSortBy !== 'default' }">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
        </button>
        <div class="menu-wrap">
          <button @click="showMenu = !showMenu" class="btn-menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
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

    <!-- FIX 8: @after-leave drives scroll restore instead of setTimeout magic number -->
    <Transition :name="viewTransition" mode="out-in" @after-leave="onPageAfterLeave">

      <!-- ARTISTS VIEW -->
      <main v-if="currentView === 'artists'" key="artists" class="page" @touchstart="onPullStart"
        @touchmove="onPullMove" @touchend="onPullEnd">

        <div class="ptr-indicator" :style="{ height: pullDistance + 'px', opacity: pullOpacity }">
          <svg :style="{ transform: `rotate(${pullRotation}deg)` }" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </div>

        <div v-if="alphabeticalGroups.length > 3" class="alpha-rail">
          <button v-for="letter in allLetters" :key="letter" @click="scrollToLetter(letter)"
            :class="{ active: alphabeticalGroups.includes(letter) }" :disabled="!alphabeticalGroups.includes(letter)">{{
      letter }}</button>
        </div>

        <div v-for="letter in alphabeticalGroups" :key="letter" :ref="el => { if (el) groupRefs[letter] = el }"
          class="group">
          <div class="group-head">
            <span class="letter">{{ letter }}</span>
            <span class="group-n">{{ groupedArtists[letter].length }}</span>
          </div>
          <div class="grid-artists">
            <div v-for="(artist, idx) in groupedArtists[letter]" :key="artist.name" class="a-card"
              :class="{ 'a-card--dim': viewedArtists.has(artist.name) }" :style="{ '--stagger-i': idx }"
              :data-gen="gridGeneration" @click="selectArtist(artist.name)" @mouseenter="preloadArtistImage(artist)">
              <!-- FIX 10: .a-ph always rendered, shown/hidden via style so onImgError can reveal it -->
              <div class="a-img">
                <div class="skeleton" :class="{ 'skeleton--hidden': getProgressiveImage(artist).full }"></div>
                <img v-if="getProgressiveImage(artist).full" :src="getProgressiveImage(artist).full" :alt="artist.name"
                  loading="lazy" class="fade-img" @load="onImgLoad" @error="onImgError" />
                <div class="a-ph" :style="{ display: getProgressiveImage(artist).full ? 'none' : 'flex' }">
                  {{ artist.name.charAt(0) }}
                </div>
                <div class="a-overlay">
                  <span class="a-name">{{ artist.name }}</span>
                  <span class="a-count">{{ getArtistViewedCount(artist) }}/{{ getArtistWorkCount(artist) }}</span>
                </div>
                <div v-if="getArtistWorkCount(artist) > 0" class="progress-bar">
                  <div class="progress-fill" :style="{ width: getArtistProgress(artist) + '%' }"></div>
                </div>
                <span v-if="getArtistProgress(artist) === 100" class="badge-check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredArtists.length === 0" class="empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
            style="opacity:.3">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <path d="M8 11h6" />
          </svg>
          <p>No artists found</p>
        </div>
      </main>

      <!-- WORKS VIEW -->
      <main v-else-if="currentView === 'works'" key="works" class="page">
        <div class="works-top">
          <div class="works-info">
            <div class="chips">
              <span v-if="currentArtist?.mainWorks?.length" class="chip">{{ currentArtist.mainWorks.length }}
                main</span>
              <span v-if="currentArtist?.compilations?.length" class="chip">{{ currentArtist.compilations.length }}
                comp</span>
              <span class="chip chip--progress">{{ getArtistProgress(currentArtist) }}% viewed</span>
              <a v-if="currentArtist?.url" :href="currentArtist.url" target="_blank" rel="noopener noreferrer"
                class="chip chip--url">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
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
            <button @click="surpriseMe" class="btn-surprise" title="Open a random unviewed work">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                <path d="M12 8v4l3 3" />
              </svg>
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
                :class="{ 'w-card--dim': viewedWorks.has(work.code) }" :style="{ '--stagger-i': idx }"
                :data-gen="gridGeneration" @click="openWorkView(work)">
                <div class="w-img">
                  <div class="skeleton" :class="{ 'skeleton--hidden': !getProgressiveWorkImage(work).full }"></div>
                  <img :src="getProgressiveWorkImage(work).full" :alt="work.code" loading="lazy" class="fade-img"
                    @load="onImgLoad" @error="onImgError" />
                  <span v-if="isCoverWork(currentArtist.name, work.code)" class="badge-star">*</span>
                  <span v-if="viewedWorks.has(work.code)" class="badge-check badge-check--tl">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
            style="opacity:.3">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9l6 6M15 9l-6 6" />
          </svg>
          <p>{{ searchQuery || viewFilter !== 'all' ? 'No matches' : 'No works yet' }}</p>
        </div>
      </main>

      <!-- DETAIL VIEW -->
     
<main v-else-if="currentView === 'detail'" key="detail" class="page page--detail"
  @touchstart="onDetailTouchStart" @touchend="onDetailTouchEnd">

  <!-- Full-bleed hero -->
  <section class="hero" @click="openLightbox(currentWork, 0, $event.currentTarget)">
    <div class="hero-img-wrap">
      <div class="skeleton"></div>
      <img :src="getProgressiveWorkImage(currentWork).full" :alt="currentWork.code"
        class="hero-img fade-img" @load="onImgLoad" @error="onImgError" />
      <div class="hero-scrim"></div>
    </div>

    <div class="hero-overlay">
      <div class="hero-eyebrow">
        <span class="hero-artist-dot"></span>
        <span>{{ currentArtist?.name }}</span>
        <span class="hero-eyebrow-sep">·</span>
        <span>{{ currentWorkIndex + 1 }} / {{ currentWorkList.length }}</span>
      </div>
      <h1 class="hero-code">{{ currentWork.code }}</h1>
      <div class="hero-tag-row">
        <span v-if="isCoverWork(currentArtist.name, currentWork.code)" class="hero-tag hero-tag--star">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Cover
        </span>
        <span v-if="viewedWorks.has(currentWork.code)" class="hero-tag">Seen</span>
        <span class="hero-tag hero-tag--ghost">Tap to zoom</span>
      </div>
    </div>
  </section>

  <!-- Floating action bar -->
  <div class="fab-bar">
    <button @click="navigateWork(-1)" :disabled="!canNavigateWork(-1)" class="fab-btn" title="Previous">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
    <button @click="setCoverWork(currentArtist.name, currentWork.code)" class="fab-btn"
      :class="{ 'fab-btn--on': isCoverWork(currentArtist.name, currentWork.code) }" title="Set cover">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
    <button @click="openUploadModal(currentWork.code)" class="fab-btn" title="Custom image">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </button>
    <button @click="copyToClipboard(currentWork.code)" class="fab-btn fab-btn--primary" title="Copy code">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
      <span>Copy</span>
    </button>
    <button @click="navigateWork(1)" :disabled="!canNavigateWork(1)" class="fab-btn" title="Next">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  </div>

  <!-- Watch-on pill chips -->
  <section class="detail-block">
    <div class="detail-label">
      <span class="detail-label-num">01</span>
      <span class="detail-label-text">Watch on</span>
      <span class="detail-label-rule"></span>
    </div>
    <div class="pill-chips">
      <button v-for="link in externalLinks" :key="link.key"
        @click="openExternalLink(currentWork.code, link.key)" class="pill-chip">
        <span class="pill-chip-label">{{ link.label }}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M7 17L17 7M7 7h10v10" />
        </svg>
      </button>
    </div>
  </section>

  <!-- Horizontal gallery strip -->
  <section class="detail-block" v-if="!galleryAllFailed">
    <div class="detail-label">
      <span class="detail-label-num">02</span>
      <span class="detail-label-text">Gallery</span>
      <span class="detail-label-rule"></span>
      <button @click="preloadAllGallery" class="detail-label-btn" :disabled="isPreloading">
        {{ isPreloading ? 'Loading…' : 'Load all' }}
      </button>
    </div>
    <div class="gal-strip">
      <div v-for="i in galleryVisible" :key="i" class="gal-card"
        @click="openLightbox(currentWork, i, $event.currentTarget)">
        <div class="skeleton"></div>
        <img :src="getImageUrl(currentWork.code, 'jp-' + i)" loading="lazy" class="fade-img"
          @load="onGalleryImgLoad($event, i)" @error="onGalleryImgError($event, i)" />
        <span class="gal-n">{{ String(i).padStart(2, '0') }}</span>
      </div>
    </div>
  </section>

  <!-- Artist profile link -->
  <section v-if="currentArtist?.url" class="detail-block">
    <a :href="currentArtist.url" target="_blank" rel="noopener noreferrer" class="artist-link">
      <span class="artist-link-label">Visit {{ currentArtist.name }}'s profile</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    </a>
  </section>
</main>

    </Transition>

    <!-- Add Work Modal -->
    <Transition name="m">
      <div v-if="showAddWorkModal" class="overlay" @click.self="closeAddWorkModal">
        <div class="modal">
          <div class="m-head">
            <h3>Add work</h3><button @click="closeAddWorkModal" class="m-x">&times;</button>
          </div>
          <div class="m-body">
            <label class="field"><span>Artist</span>
              <select v-model="newWork.artist">
                <option value="">Select...</option>
                <option v-for="a in artists" :key="a.name" :value="a.name">{{ a.name }}</option>
              </select>
            </label>
            <label class="field"><span>Code</span><input v-model="newWork.code" placeholder="e.g. ABC-123" /></label>
            <div class="radios">
              <label class="radio"><input v-model="newWork.type" type="radio"
                  value="mainWorks" /><span>Main</span></label>
              <label class="radio"><input v-model="newWork.type" type="radio"
                  value="compilations" /><span>Compilation</span></label>
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
          <div class="m-head">
            <h3>Add artist</h3><button @click="showAddArtistModal = false" class="m-x">&times;</button>
          </div>
          <div class="m-body">
            <label class="field"><span>Name</span><input v-model="newArtistName" placeholder="Artist name"
                @keyup.enter="addNewArtist" /></label>
            <label class="field">
              <span>Profile URL <em
                  style="font-style:normal;font-weight:400;text-transform:none;letter-spacing:0">(optional)</em></span>
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
          <div class="m-head">
            <h3>Custom image</h3><button @click="closeUploadModal" class="m-x">&times;</button>
          </div>
          <div class="m-body">
            <p class="m-sub">{{ uploadingWork }}</p>
            <label class="field"><span>Image URL</span><input v-model="customImageUrl" placeholder="https://..."
                @keyup.enter="handleCustomImageUrl" /></label>
            <p v-if="imageUrlLoading" class="hint hint--loading">Checking image…</p>
            <p v-else class="hint">Leave empty to remove</p>
          </div>
          <div class="m-foot">
            <button @click="closeUploadModal" class="btn-flat">Cancel</button>
            <button @click="handleCustomImageUrl" class="btn-fill" :disabled="imageUrlLoading">
              {{ imageUrlLoading ? 'Checking...' : customImageUrl.trim() ? 'Save' : 'Remove' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Lightbox -->
    <Transition name="lb-enter">
      <div v-if="lightbox.show" class="lb" :style="lbEntranceStyle" @wheel.prevent="onLbWheel"
        @mousedown="onLbMouseDown" @mousemove="onLbMouseMove" @mouseup="onLbMouseUp" @mouseleave="onLbMouseUp"
        @dblclick="onLbDblClick" @click.self="onLbBackdropClick">
        <button class="lb-close" @click="closeLightbox">&times;</button>
        <button v-if="lightbox.images.length > 1" class="lb-arr lb-arr--left" @click="prevImage"
          :disabled="lightbox.currentIndex === 0">&lt;</button>
        <div class="lb-main" :style="lbMainStyle">
          <Transition :name="'lb-slide-' + lbSlideDir" mode="out-in">
            <div :key="lbImgKey" class="lb-img-wrap">
              <img :src="lightbox.images[lightbox.currentIndex]" :style="lbImgStyle" @error="onImgError"
                draggable="false" />
            </div>
          </Transition>
        </div>
        <button v-if="lightbox.images.length > 1" class="lb-arr lb-arr--right" @click="nextImage"
          :disabled="lightbox.currentIndex === lightbox.images.length - 1">&gt;</button>
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
              <button v-for="opt in [['all', 'All'], ['unviewed', 'New'], ['viewed', 'Seen']]" :key="opt[0]"
                @click="viewFilter = opt[0]" class="pill" :class="{ 'pill--active': viewFilter === opt[0] }">{{ opt[1]
                }}</button>
            </div>
          </div>
          <div v-if="currentView === 'works'" class="sheet-section">
            <div class="sheet-label">Sort by</div>
            <div class="sheet-pills">
              <button
                v-for="opt in [['default', 'Default'], ['codeAsc', 'A→Z'], ['codeDesc', 'Z→A'], ['newest', 'Newest'], ['unviewed', 'Unviewed']]"
                :key="opt[0]" @click="workSortBy = opt[0]" class="pill"
                :class="{ 'pill--active': workSortBy === opt[0] }">{{ opt[1] }}</button>
            </div>
          </div>
          <div class="sheet-section">
            <div class="sheet-label">Density</div>
            <div class="sheet-pills">
              <button @click="compactWorks = false" class="pill"
                :class="{ 'pill--active': !compactWorks }">Normal</button>
              <button @click="compactWorks = true" class="pill"
                :class="{ 'pill--active': compactWorks }">Compact</button>
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
                <svg v-if="confirmDialog.danger" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
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

    <!-- Global search overlay -->
    <Transition name="gs-fade">
      <div v-if="showGlobalSearch" class="gs-backdrop" @click.self="closeGlobalSearch">
        <div class="gs-panel">
          <div class="gs-header">
            <svg class="gs-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input ref="globalSearchRef" v-model="globalQuery" class="gs-input" type="text"
              placeholder="Search artists or work codes…" autocomplete="off" spellcheck="false" />
            <button v-if="globalQuery" @click="globalQuery = ''" class="gs-clear">&times;</button>
            <kbd class="gs-esc" @click="closeGlobalSearch">esc</kbd>
          </div>

          <div class="gs-body" v-if="globalQuery.length >= 2">
            <!-- Artists results -->
            <div v-if="globalSearchResults.artists.length" class="gs-section">
              <div class="gs-section-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                Artists
                <span class="gs-count">{{ globalSearchResults.artists.length }}</span>
              </div>
              <button v-for="artist in globalSearchResults.artists" :key="artist.name" class="gs-row"
                @click="globalGoToArtist(artist.name)">
                <div class="gs-row-avatar">
                  <img v-if="getProgressiveImage(artist).full" :src="getProgressiveImage(artist).full"
                    @error="onImgError" />
                  <span v-else>{{ artist.name.charAt(0) }}</span>
                </div>
                <!-- FIX 15: v-html with highlight helper -->
                <span class="gs-row-name" v-html="highlightMatch(artist.name, globalQuery)"></span>
                <span class="gs-row-meta">{{ getArtistWorkCount(artist) }} works</span>
                <span class="gs-row-progress" :style="{ width: getArtistProgress(artist) + '%' }"></span>
              </button>
            </div>

            <!-- Works results -->
            <div v-if="globalSearchResults.works.length" class="gs-section">
              <div class="gs-section-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Works
                <span class="gs-count">{{ globalSearchResults.works.length }}</span>
              </div>
              <button v-for="item in globalSearchResults.works" :key="item.work.code" class="gs-row"
                @click="globalGoToWork(item)">
                <div class="gs-row-thumb">
                  <img :src="getProgressiveWorkImage(item.work).full" @error="onImgError" />
                </div>
                <div class="gs-row-info">
                  <!-- FIX 15: highlight matched code -->
                  <span class="gs-row-code" v-html="highlightMatch(item.work.code, globalQuery)"></span>
                  <span class="gs-row-artist">{{ item.artist.name }}</span>
                </div>
                <span v-if="viewedWorks.has(item.work.code)" class="gs-row-seen">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </button>
            </div>

            <!-- Empty state -->
            <div v-if="!globalSearchResults.artists.length && !globalSearchResults.works.length" class="gs-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                style="opacity:.3">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <p>No results for "{{ globalQuery }}"</p>
            </div>
          </div>

          <div class="gs-body gs-hint" v-else>
            <p>Type at least 2 characters to search across all artists and works</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Import confirm modal -->
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
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

// ── useCodeParser ────────────────────────────────────────────────────────────
function useCodeParser() {
  const cache = new Map()
  const CODE_PREFIXES = {
    'abp': '118',
    'abw': '118',
    'chn': '118',
    'bgn': '118',
    'start': '1',
    'dldss': '1',
    'hodv': '41',
  }
  function parseCode(code) {
    if (!code) return null
    if (cache.has(code)) return cache.get(code)
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const m = clean.match(/^(.*?)(\d+)$/)
    if (!m || !m[2]) {
      const prefix = clean.toLowerCase()
      const pfx = CODE_PREFIXES[prefix] || ''
      const r = { full: clean, prefix, number: '001', rawNumber: 1, paddedNumber: '00001', id: pfx + prefix + '00001' }
      cache.set(code, r); return r
    }
    const prefix = m[1].toLowerCase()
    const number = m[2]
    const rawNumber = parseInt(number, 10)
    const paddedNumber = number.length >= 5 ? number : ('00000' + number).slice(-5)
    const pfx = CODE_PREFIXES[prefix] || ''
    const id = pfx + prefix + paddedNumber
    const r = { full: clean, prefix, number, rawNumber, paddedNumber, id }
    cache.set(code, r)
    return r
  }
  return { parseCode }
}

// ── useImageDB ───────────────────────────────────────────────────────────────
function useImageDB() {
  const DB_NAME = 'WorksTrackerDB'
  const STORE = 'customImages'
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
      req.onerror = () => res({})
    })
  }

  function setAll(images) {
    if (!db) return Promise.resolve(false)
    return new Promise(res => {
      const tx = db.transaction([STORE], 'readwrite')
      const store = tx.objectStore(STORE)
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
      store.clear()
      Object.entries(images).forEach(([code, data]) => store.put({ code, data }))
    })
  }

  function clear() {
    if (!db) return Promise.resolve(false)
    return new Promise(res => {
      const req = db.transaction([STORE], 'readwrite').objectStore(STORE).clear()
      req.onsuccess = () => res(true)
      req.onerror = () => res(false)
    })
  }

  return { init, getAll, setAll, clear }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const EXTERNAL_LINKS = [
  { key: 'njav', label: 'NJAV' },
  { key: 'missav', label: 'MissAV' },
  { key: '24av', label: '24AV' },
  { key: 'javtrailers', label: 'JavTrailers' },
]
const PULL_THRESHOLD = 70

// ─────────────────────────────────────────────────────────────────────────────
// Composable instances
// ─────────────────────────────────────────────────────────────────────────────
const { parseCode } = useCodeParser()
const imageDB = useImageDB()

// ─────────────────────────────────────────────────────────────────────────────
// Reactive state
// ─────────────────────────────────────────────────────────────────────────────
const appReady = ref(false)
const darkMode = ref(false)
const isMobile = ref(false)
const currentView = ref('artists')
const viewTransition = ref('slide-right')
const activeTab = ref('')
const searchQuery = ref('')
const artistSortBy = ref('nameAsc')
const workSortBy = ref('codeAsc')
const viewFilters = ref({ artists: 'all', works: 'all' })
const compactWorks = ref(false)
const artists = ref(normalizeArtists(JSON.parse(JSON.stringify(DEFAULT_ARTISTS))))
const currentWork = ref(null)
const currentWorkList = ref([])
const currentWorkIndex = ref(0)
const customImages = ref({})

// FIX 17: Set instead of Array for O(1) lookup and no-duplicate guarantee
const viewedArtists = ref(new Set())
const viewedWorks = ref(new Set())

const showAddWorkModal = ref(false)
const showUploadModal = ref(false)
const showAddArtistModal = ref(false)
const showBottomSheet = ref(false)
const showMenu = ref(false)
const showGlobalSearch = ref(false)
const globalQuery = ref('')
const globalSearchRef = ref(null)

const newWork = ref({ artist: '', code: '', type: 'mainWorks' })
const newArtistName = ref('')
const newArtistUrl = ref('')
const uploadingWork = ref(null)
const customImageUrl = ref('')
const imageUrlLoading = ref(false)

const lightbox = ref({ show: false, images: [], currentIndex: 0, code: '' })
const lbZoom = ref(1)
const lbPanX = ref(0)
const lbPanY = ref(0)
const lbDragging = ref(false)
const lbDragStart = ref({ x: 0, y: 0 })
const lbPanStart = ref({ x: 0, y: 0 })
const lbSlideDir = ref('none')
const lbImgKey = ref(0)
const lbHeroOrigin = ref({ x: '50%', y: '50%', scale: 0.6 })
// FIX 11: closing guard prevents gesture race condition
const lbIsClosing = ref(false)

const toast = ref({ show: false, message: '', type: 'success' })
const isPreloading = ref(false)

const useLocalStorageFallback = ref(false)
const customImagesLoaded = ref(false)
const scrollPositions = ref({})

const touchStartX = ref(0); const touchStartY = ref(0)
const touchEndX = ref(0); const touchEndY = ref(0)
const detailTouchStartX = ref(0); const detailTouchStartY = ref(0)
const appTouchStartX = ref(0); const appTouchStartY = ref(0)

const allLetters = ALL_LETTERS
const externalLinks = EXTERNAL_LINKS

// FIX 7: Set-based gallery failed tracking — new Set ref = reactive
const galleryFailed = ref(new Set())
const galleryLoadedCount = ref(0)

// FIX 10: track failed image URLs so getProgressiveImage skips them
const failedImageUrls = ref(new Set())

const showShortcutHint = ref(false)
const searchInputRef = ref(null)
const fileInputRef = ref(null)
const groupRefs = ref({})

const pullStartY = ref(0)
const pullDistance = ref(0)
const isPullRefreshing = ref(false)
const gridGeneration = ref(0)
const pullSpinAngle = ref(0)
let _pullSpinRaf = null

// FIX 8: pending scroll key set before transition, consumed in @after-leave
const _pendingScrollRestore = ref(null)

let _lbTouchStart = null
let _lbTouchMove = null
let _lbTouchEnd = null

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
    nameAsc: (a, b) => a.name.localeCompare(b.name),
    nameDesc: (a, b) => b.name.localeCompare(a.name),
    mostWorks: (a, b) => getArtistWorkCount(b) - getArtistWorkCount(a),
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
  // FIX 17: .has() instead of .includes()
  if (viewFilter.value === 'unviewed') list = list.filter(a => !viewedArtists.value.has(a.name))
  else if (viewFilter.value === 'viewed') list = list.filter(a => viewedArtists.value.has(a.name))
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

watchEffect(() => {
  if (currentView.value !== 'detail' || !currentWork.value) return
  const inMain = currentArtist.value?.mainWorks?.some(w => w.code === currentWork.value.code)
  const newList = inMain ? filteredMainWorks.value : filteredCompilations.value
  const newIdx = newList.findIndex(w => w.code === currentWork.value.code)
  currentWorkList.value = newList
  currentWorkIndex.value = newIdx >= 0 ? newIdx : 0
})

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
  { key: 'main', label: 'Main Works', items: filteredMainWorks.value },
  { key: 'comp', label: 'Compilations', items: filteredCompilations.value },
])

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
    works: matchedWorks.slice(0, 40),
  }
})

// FIX 7: computed visible gallery indices — only non-failed slots exist in DOM
const galleryVisible = computed(() => {
  const out = []
  for (let i = 1; i <= 20; i++) {
    if (!galleryFailed.value.has(i)) out.push(i)
  }
  return out
})

const galleryAllFailed = computed(() => galleryFailed.value.size >= 20)

const lbImgStyle = computed(() => ({
  transform: `scale(${lbZoom.value}) translate(${lbPanX.value / lbZoom.value}px, ${lbPanY.value / lbZoom.value}px)`,
  transition: lbDragging.value ? 'none' : 'transform 0.2s ease',
  cursor: lbZoom.value > 1 ? (lbDragging.value ? 'grabbing' : 'grab') : 'zoom-in',
}))
const lbMainStyle = computed(() => ({
  overflow: lbZoom.value > 1 ? 'visible' : 'hidden',
}))

const pullOpacity = computed(() => Math.min(pullDistance.value / PULL_THRESHOLD, 1))
const pullRotation = computed(() =>
  isPullRefreshing.value ? pullSpinAngle.value : (pullDistance.value / PULL_THRESHOLD) * 180
)
const lbEntranceStyle = computed(() => ({
  '--lb-origin-x': lbHeroOrigin.value.x,
  '--lb-origin-y': lbHeroOrigin.value.y,
  '--lb-origin-scale': lbHeroOrigin.value.scale,
}))

// ─────────────────────────────────────────────────────────────────────────────
// Watchers — persistence
// ─────────────────────────────────────────────────────────────────────────────
watch(artists, v => { try { localStorage.setItem('artists', JSON.stringify(v)) } catch { } }, { deep: true })
// FIX 17: serialize Set as array for localStorage
watch(viewedArtists, v => { try { localStorage.setItem('viewedArtists', JSON.stringify([...v])) } catch { } })
watch(viewedWorks, v => { try { localStorage.setItem('viewedWorks', JSON.stringify([...v])) } catch { } })
watch(artistSortBy, v => { try { localStorage.setItem('artistSortBy', v) } catch { } })
watch(compactWorks, v => { try { localStorage.setItem('compactWorks', v ? '1' : '0') } catch { } })
watch(viewFilters, v => { try { localStorage.setItem('viewFilters', JSON.stringify(v)) } catch { } }, { deep: true })
watch(darkMode, v => {
  try {
    localStorage.setItem('darkMode', v ? '1' : '0')
    document.documentElement.classList.toggle('dark', v)
  } catch { }
})

// FIX 6: shallow watch — we always replace the object reference, never mutate in-place
watch(customImages, v => {
  if (!customImagesLoaded.value) return
  clearTimeout(_saveImagesTimer)
  _saveImagesTimer = setTimeout(() => saveCustomImagesToDB(v), 300)
}) // no { deep: true } — shallow is sufficient and skips full traversal

// FIX 7: reset gallery Set on work change
watch(currentWork, () => {
  galleryFailed.value = new Set()
  galleryLoadedCount.value = 0
})

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
let _keydownHandler = null
let _saveImagesTimer = null

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
// ─────────────────────────────────────────────────────────────────────────────
function onPullStart(e) {
  if (window.scrollY > 5) return
  if (window.matchMedia('(min-width: 769px)').matches) return
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
    const startAngle = pullSpinAngle.value
    const startTime = performance.now()
    function spin(now) {
      pullSpinAngle.value = startAngle + ((now - startTime) / 1000) * 360
      _pullSpinRaf = requestAnimationFrame(spin)
    }
    _pullSpinRaf = requestAnimationFrame(spin)

    setTimeout(() => {
      cancelAnimationFrame(_pullSpinRaf); _pullSpinRaf = null
      try {
        const entries = [
          ['artists', v => { const p = JSON.parse(v); if (Array.isArray(p) && p.length) artists.value = normalizeArtists(p) }],
          // FIX 17: deserialize into Set
          ['viewedArtists', v => { viewedArtists.value = new Set(JSON.parse(v)) }],
          ['viewedWorks', v => { viewedWorks.value = new Set(JSON.parse(v)) }],
          ['darkMode', v => { darkMode.value = v === '1'; document.documentElement.classList.toggle('dark', darkMode.value) }],
          ['artistSortBy', v => { artistSortBy.value = v }],
          ['compactWorks', v => { compactWorks.value = v === '1' }],
          ['viewFilters', v => { const p = JSON.parse(v); if (p && typeof p === 'object') viewFilters.value = { artists: p.artists || 'all', works: p.works || 'all' } }],
        ]
        entries.forEach(([key, fn]) => { try { const v = localStorage.getItem(key); if (v !== null) fn(v) } catch { } })
      } catch { }
      pullDistance.value = 0
      isPullRefreshing.value = false
      // FIX 9: reset spin angle after refresh so next pull starts from 0
      pullSpinAngle.value = 0
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
    try { const s = localStorage.getItem('customImages'); if (s) customImages.value = JSON.parse(s) } catch { }
  }).catch(() => {
    useLocalStorageFallback.value = true
    try { const s = localStorage.getItem('customImages'); if (s) customImages.value = JSON.parse(s) } catch { }
  }).then(() => {
    customImagesLoaded.value = true
    const loads = [
      ['artists', v => { const p = JSON.parse(v); if (Array.isArray(p) && p.length) artists.value = normalizeArtists(p) }],
      // FIX 17: hydrate as Set
      ['viewedArtists', v => { viewedArtists.value = new Set(JSON.parse(v)) }],
      ['viewedWorks', v => { viewedWorks.value = new Set(JSON.parse(v)) }],
      ['artistSortBy', v => { artistSortBy.value = v }],
      ['darkMode', v => { darkMode.value = v === '1'; document.documentElement.classList.toggle('dark', darkMode.value) }],
      ['compactWorks', v => { compactWorks.value = v === '1' }],
      ['viewFilters', v => { const p = JSON.parse(v); if (p && typeof p === 'object') viewFilters.value = { artists: p.artists || 'all', works: p.works || 'all' } }],
    ]
    loads.forEach(([key, fn]) => { try { const v = localStorage.getItem(key); if (v !== null) fn(v) } catch { } })
    setTimeout(() => { appReady.value = true }, 80)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcuts
// ─────────────────────────────────────────────────────────────────────────────
function setupKeyboardShortcuts() {
  _keydownHandler = e => {
    const tag = document.activeElement?.tagName
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    if (e.key === '/' && !isInput) { e.preventDefault(); searchInputRef.value?.focus(); searchInputRef.value?.select(); return }
    if ((e.key === 'g' || e.key === 'G') && !isInput && !showGlobalSearch.value) { e.preventDefault(); openGlobalSearch(); return }
    if (e.key === 'Escape') {
      if (showGlobalSearch.value) { closeGlobalSearch(); return }
      if (importConfirm.value.show) { cancelImport(); return }
      if (showMenu.value) { showMenu.value = false; return }
      if (showBottomSheet.value) { showBottomSheet.value = false; return }
      if (lightbox.value.show) { closeLightbox(); return }
      if (showAddWorkModal.value) { closeAddWorkModal(); return }
      if (showAddArtistModal.value) { showAddArtistModal.value = false; return }
      if (showUploadModal.value) { closeUploadModal(); return }
      if (currentView.value === 'detail') { backToWorks(); return }
      if (currentView.value === 'works') { backToArtists(); return }
    }
    if (lightbox.value.show) {
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
    }
    if (currentView.value === 'detail' && !lightbox.value.show) {
      if (e.key === 'ArrowLeft' && canNavigateWork(-1)) navigateWork(-1)
      if (e.key === 'ArrowRight' && canNavigateWork(1)) navigateWork(1)
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
  // FIX 17: .has() for O(1) lookup
  if (viewFilter.value === 'unviewed') list = list.filter(w => !viewedWorks.value.has(w.code))
  else if (viewFilter.value === 'viewed') list = list.filter(w => viewedWorks.value.has(w.code))
  if (workSortBy.value === 'codeAsc') list.sort((a, b) => a.code.localeCompare(b.code))
  else if (workSortBy.value === 'codeDesc') list.sort((a, b) => b.code.localeCompare(a.code))
  else if (workSortBy.value === 'newest') list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
  else if (workSortBy.value === 'unviewed') list.sort((a, b) =>
    (viewedWorks.value.has(a.code) ? 1 : 0) - (viewedWorks.value.has(b.code) ? 1 : 0)
  )
  return list
}

function onImgLoad(e) {
  e.target.classList.add('loaded')
  const sk = e.target.parentElement?.querySelector('.skeleton')
  if (sk) sk.style.display = 'none'
}

// FIX 10: track failed URLs, reveal .a-ph fallback when image 404s
function onImgError(e) {
  const src = e.target.src
  if (src) failedImageUrls.value = new Set([...failedImageUrls.value, src])
  e.target.style.display = 'none'
  const parent = e.target.parentElement
  if (!parent) return
  const sk = parent.querySelector('.skeleton')
  if (sk) sk.style.display = 'none'
  // Reveal the always-present initials placeholder if it exists
  const ph = parent.querySelector('.a-ph')
  if (ph) ph.style.display = 'flex'
}

function onGalleryImgLoad(e, index) { e.target.classList.add('loaded'); galleryLoadedCount.value++ }

// FIX 7: new Set reference = reactive trigger
function onGalleryImgError(e, index) {
  e.target.style.display = 'none'
  const thumb = e.target.parentElement
  if (thumb) { const sk = thumb.querySelector('.skeleton'); if (sk) sk.style.display = 'none' }
  if (!galleryFailed.value.has(index)) {
    galleryFailed.value = new Set([...galleryFailed.value, index])
  }
}

function getArtistWorkCount(a) { return (a?.mainWorks?.length || 0) + (a?.compilations?.length || 0) }

// FIX 17: .has() for O(1) lookup
function getArtistViewedCount(artist) {
  if (!artist) return 0
  return [...(artist.mainWorks || []), ...(artist.compilations || [])].filter(w => viewedWorks.value.has(w.code)).length
}
function getArtistProgress(artist) {
  if (!artist) return 0
  const total = getArtistWorkCount(artist)
  return total === 0 ? 0 : Math.round((getArtistViewedCount(artist) / total) * 100)
}
function getProgressiveImage(artist) { const cw = getCoverWork(artist); return cw ? getProgressiveWorkImage(cw) : { full: null } }

// FIX 10: skip URLs that have already 404'd
// Custom image host configs: prefix → { base, path }
// Cover: {base}/{path}/{prefix}/{number}/pb_e_{prefix}-{number}.jpg
// Gallery: {base}/{path}/{prefix}/{number}/cap_e_{n}_{prefix}-{number}.jpg
const CUSTOM_HOSTS = {
  'abf': { base: 'https://image.mgstage.com', path: 'images/prestige' },
  'abw': { base: 'https://image.mgstage.com', path: 'images/prestige' },
  '300mium': { base: 'https://pics.pornfhd.com', path: 'mgs/images/prestigepremium' },
  '259luxu': { base: 'https://pics.pornfhd.com', path: 'mgs/images/luxutv' },
}

function getCustomHostUrl(host, prefix, number, quality) {
  if (quality && quality !== 'pl') {
    const n = quality.split('-')[1] || '1'
    return `${host.base}/${host.path}/${prefix}/${number}/cap_e_${n}_${prefix}-${number}.jpg`
  }
  return `${host.base}/${host.path}/${prefix}/${number}/pb_e_${prefix}-${number}.jpg`
}

function getProgressiveWorkImage(work) {
  if (!work) return { full: null }
  if (customImages.value[work.code]) {
    const url = customImages.value[work.code]
    return failedImageUrls.value.has(url) ? { full: null } : { full: url }
  }
  const p = parseCode(work.code)
  if (!p || !p.id || p.id.length < 3) return { full: null }
  const host = CUSTOM_HOSTS[p.prefix]
  const url = host
    ? getCustomHostUrl(host, p.prefix, p.number)
    : `https://pics.dmm.co.jp/digital/video/${p.id}/${p.id}pl.jpg`
  return failedImageUrls.value.has(url) ? { full: null } : { full: url }
}

function getImageUrl(code, quality) {
  if (!quality) quality = 'pl'
  if (quality === 'pl' && customImages.value[code]) return customImages.value[code]
  const p = parseCode(code); if (!p || !p.id || p.id.length < 3) return null
  const host = CUSTOM_HOSTS[p.prefix]
  if (host) return getCustomHostUrl(host, p.prefix, p.number, quality)
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

// FIX 15: highlight matched query substring in search results
function highlightMatch(text, query) {
  if (!query || query.length < 2) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    text.slice(0, idx) +
    '<mark class="gs-hl">' +
    text.slice(idx, idx + query.length) +
    '</mark>' +
    text.slice(idx + query.length)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────
function goBack() {
  viewTransition.value = 'slide-left'
  currentView.value === 'detail' ? backToWorks() : backToArtists()
}
function selectArtist(name) {
  viewTransition.value = 'slide-right'; saveScrollPosition('artists')
  // FIX 17: Set mutation — always reassign for reactivity
  if (!viewedArtists.value.has(name)) viewedArtists.value = new Set([...viewedArtists.value, name])
  activeTab.value = name; currentView.value = 'works'
  searchQuery.value = ''; workSortBy.value = 'codeAsc'
  gridGeneration.value++
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

// FIX 8: set pending restore key; @after-leave on <Transition> triggers the actual scroll
function backToArtists() {
  viewTransition.value = 'slide-left'
  _pendingScrollRestore.value = 'artists'
  currentView.value = 'artists'; activeTab.value = ''; searchQuery.value = ''
  gridGeneration.value++
}
function openWorkView(work) {
  viewTransition.value = 'slide-right'; saveScrollPosition('works')
  // FIX 17: Set mutation
  if (!viewedWorks.value.has(work.code)) viewedWorks.value = new Set([...viewedWorks.value, work.code])
  const isMain = currentArtist.value?.mainWorks?.find(w => w.code === work.code)
  currentWorkList.value = isMain ? filteredMainWorks.value : filteredCompilations.value
  currentWorkIndex.value = currentWorkList.value.findIndex(w => w.code === work.code)
  currentWork.value = work; currentView.value = 'detail'
  gridGeneration.value++
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}

// FIX 8: set pending restore key; @after-leave triggers actual scroll
function backToWorks() {
  viewTransition.value = 'slide-left'
  _pendingScrollRestore.value = 'works'
  currentWork.value = null; currentView.value = 'works'
}

function saveScrollPosition(v) { if (import.meta.client) scrollPositions.value[v] = window.scrollY || 0 }

// FIX 8: called by @after-leave — no setTimeout needed
function restoreScrollPosition(v) {
  const pos = scrollPositions.value[v] || 0
  requestAnimationFrame(() => window.scrollTo({ top: pos, behavior: 'instant' }))
}

// FIX 8: @after-leave handler — consumes the pending restore key
function onPageAfterLeave() {
  if (_pendingScrollRestore.value) {
    const key = _pendingScrollRestore.value
    _pendingScrollRestore.value = null
    restoreScrollPosition(key)
  }
}

function navigateWork(dir) {
  const i = currentWorkIndex.value + dir
  if (i >= 0 && i < currentWorkList.value.length) {
    currentWorkIndex.value = i; currentWork.value = currentWorkList.value[i]
    // FIX 17: Set mutation
    if (!viewedWorks.value.has(currentWork.value.code)) viewedWorks.value = new Set([...viewedWorks.value, currentWork.value.code])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
function canNavigateWork(dir) { const i = currentWorkIndex.value + dir; return i >= 0 && i < currentWorkList.value.length }

// ─────────────────────────────────────────────────────────────────────────────
// Touch gestures
// FIX 16: detail swipe at boundary falls back to goBack; lb guard added
// ─────────────────────────────────────────────────────────────────────────────
function onDetailTouchStart(e) {
  detailTouchStartX.value = e.changedTouches[0].screenX
  detailTouchStartY.value = e.changedTouches[0].screenY
}

// FIX 16: guard against firing while lightbox is open; boundary swipe = goBack
function onDetailTouchEnd(e) {
  if (lightbox.value.show) return
  const dx = e.changedTouches[0].screenX - detailTouchStartX.value
  const dy = e.changedTouches[0].screenY - detailTouchStartY.value
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
    if (dx > 0 && canNavigateWork(-1)) { navigateWork(-1); return }
    if (dx < 0 && canNavigateWork(1)) { navigateWork(1); return }
    // At the boundary: swipe right at first work = go back to works list
    if (dx > 0 && !canNavigateWork(-1)) goBack()
  }
}

function onAppTouchStart(e) { appTouchStartX.value = e.changedTouches[0].screenX; appTouchStartY.value = e.changedTouches[0].screenY }

// FIX 16: unified swipe handler; works + detail both support edge-swipe back
function onAppTouchEnd(e) {
  if (showAddWorkModal.value || showUploadModal.value || showAddArtistModal.value || lightbox.value.show) return
  const dx = e.changedTouches[0].screenX - appTouchStartX.value
  const dy = e.changedTouches[0].screenY - appTouchStartY.value
  if (Math.abs(dx) < 80 || Math.abs(dx) <= Math.abs(dy) * 1.5) return
  // Swipe right on works view → back to artists
  if (currentView.value === 'works' && dx > 0) { goBack(); return }
  // Detail swipe is handled in onDetailTouchEnd; artists is root, no-op
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

function surpriseMe() {
  if (!currentArtist.value) return
  const all = [...(currentArtist.value.mainWorks || []), ...(currentArtist.value.compilations || [])]
  // FIX 17: .has()
  const unviewed = all.filter(w => !viewedWorks.value.has(w.code))
  const pool = unviewed.length > 0 ? unviewed : all
  if (!pool.length) return showToast('No works found', 'info')
  const pick = pool[Math.floor(Math.random() * pool.length)]
  if (unviewed.length === 0) showToast('All viewed — picking anyway', 'info')
  openWorkView(pick)
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

// ─────────────────────────────────────────────────────────────────────────────
// Custom image upload
// ─────────────────────────────────────────────────────────────────────────────
function openUploadModal(code) { uploadingWork.value = code; customImageUrl.value = customImages.value[code] || ''; showUploadModal.value = true }
function closeUploadModal() { showUploadModal.value = false; uploadingWork.value = null; customImageUrl.value = ''; imageUrlLoading.value = false }
function handleCustomImageUrl() {
  const url = customImageUrl.value.trim()
  if (!url) {
    const n = { ...customImages.value }; delete n[uploadingWork.value]; customImages.value = n
    showToast('Image removed'); closeUploadModal(); return
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) return showToast('Must start with http(s)://', 'error')

  imageUrlLoading.value = true
  const img = new Image()
  const to = setTimeout(() => {
    imageUrlLoading.value = false
    showToast('Image timed out', 'error')
  }, 10000)
  img.onload = () => {
    clearTimeout(to)
    imageUrlLoading.value = false
    customImages.value = { ...customImages.value, [uploadingWork.value]: url }
    showToast('Image added')
    closeUploadModal()
  }
  img.onerror = () => {
    clearTimeout(to)
    imageUrlLoading.value = false
    showToast('Could not load image', 'error')
  }
  img.src = url
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// FIX 11: lbIsClosing guard prevents gesture race when re-opening during leave
// ─────────────────────────────────────────────────────────────────────────────
function openLightbox(work, startIndex = 0, triggerEl = null) {
  if (lbIsClosing.value) return  // FIX 11: block re-open during leave transition

  if (triggerEl) {
    const rect = triggerEl.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const scaleX = rect.width / window.innerWidth
    const scaleY = rect.height / window.innerHeight
    lbHeroOrigin.value = {
      x: `${(cx / window.innerWidth * 100).toFixed(1)}%`,
      y: `${(cy / window.innerHeight * 100).toFixed(1)}%`,
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
  const imgs = allImgs.map(x => x.url)
  const mappedIndex = startIndex === 0 ? 0 : allImgs.findIndex(x => x.index === startIndex)
  lbSlideDir.value = 'none'
  lbImgKey.value++
  lightbox.value = { show: true, images: imgs, currentIndex: Math.max(0, mappedIndex), code: work.code }
  lbResetZoom()
  document.body.style.overflow = 'hidden'
  nextTick(() => setupSwipeGestures())
}

// FIX 11: set closing flag before cleanup; reset after leave transition
function closeLightbox() {
  if (lbIsClosing.value) return
  lbIsClosing.value = true
  cleanupSwipeGestures()
  lightbox.value.show = false
  document.body.style.overflow = ''
  lbResetZoom()
  setTimeout(() => { lbIsClosing.value = false }, 250)
}

function lbResetZoom() { lbZoom.value = 1; lbPanX.value = 0; lbPanY.value = 0 }

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
  lbPanStart.value = { x: lbPanX.value, y: lbPanY.value }
}
function onLbMouseMove(e) {
  if (!lbDragging.value) return
  lbPanX.value = lbPanStart.value.x + (e.clientX - lbDragStart.value.x)
  lbPanY.value = lbPanStart.value.y + (e.clientY - lbDragStart.value.y)
}
function onLbMouseUp() { lbDragging.value = false }

function nextImage() {
  if (lightbox.value.currentIndex < lightbox.value.images.length - 1) {
    lbSlideDir.value = 'left'
    lbImgKey.value++
    lightbox.value.currentIndex++
    lbResetZoom()
  }
}
function prevImage() {
  if (lightbox.value.currentIndex > 0) {
    lbSlideDir.value = 'right'
    lbImgKey.value++
    lightbox.value.currentIndex--
    lbResetZoom()
  }
}

// FIX 11: guard against attaching to a closing element
function setupSwipeGestures() {
  if (lbIsClosing.value) return
  const el = document.querySelector('.lb'); if (!el) return
  let pinchStartDist = null
  let pinchStartZoom = 1
  let lastTap = 0

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
        lbDragging.value = true
        lbDragStart.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        lbPanStart.value = { x: lbPanX.value, y: lbPanY.value }
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

  el.addEventListener('touchstart', _lbTouchStart, { passive: true })
  el.addEventListener('touchmove', _lbTouchMove, { passive: false })
  el.addEventListener('touchend', _lbTouchEnd, { passive: true })
}

function cleanupSwipeGestures() {
  const el = document.querySelector('.lb'); if (!el) return
  if (_lbTouchStart) { el.removeEventListener('touchstart', _lbTouchStart); _lbTouchStart = null }
  if (_lbTouchMove) { el.removeEventListener('touchmove', _lbTouchMove); _lbTouchMove = null }
  if (_lbTouchEnd) { el.removeEventListener('touchend', _lbTouchEnd); _lbTouchEnd = null }
}

function handleSwipe() {
  const dx = touchEndX.value - touchStartX.value
  const dy = touchEndY.value - touchStartY.value
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
  const c = code.toLowerCase()
  const p = parseCode(code)
  const javId = p ? p.id : c.replace(/-/g, '')
  const urls = {
    missav: `https://missav.ws/en/${c}`,
    '24av': `https://24av.net/en/v/${c}`,
    javtrailers: `https://javtrailers.com/video/${javId}`,
    njav: `https://www.njav.com/en/xvideos/${c}`,
  }
  window.open(urls[type] || urls.njav, '_blank', 'noopener,noreferrer')
}

// ─────────────────────────────────────────────────────────────────────────────
// History / data management
// ─────────────────────────────────────────────────────────────────────────────
function clearViewHistory() {
  showConfirm({
    title: 'Clear history',
    message: 'This will remove all viewed markers for artists and works. Your data stays intact.',
    confirmLabel: 'Clear history',
    danger: false,
    onConfirm: () => {
      // FIX 17: reset to empty Set
      viewedArtists.value = new Set(); viewedWorks.value = new Set()
      localStorage.removeItem('viewedArtists'); localStorage.removeItem('viewedWorks')
      showToast('History cleared')
    },
  })
}

function exportData() {
  try {
    const payload = {
      version: 1,
      exported: new Date().toISOString(),
      artists: artists.value.map(a => ({
        name: a.name,
        cover: a.cover || '',
        url: a.url || '',
        mainWorks: (a.mainWorks || []).map(w => ({ code: w.code, addedAt: w.addedAt || 0 })),
        compilations: (a.compilations || []).map(w => ({ code: w.code, addedAt: w.addedAt || 0 })),
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `works-tracker-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url); showToast('Exported')
  } catch { showToast('Export failed', 'error') }
}

function triggerImport() { fileInputRef.value?.click() }

const importConfirm = ref({ show: false, data: null, artistCount: 0, workCount: 0, imageCount: 0, hasImages: false })

function importData(event) {
  try {
    const file = event.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.artists || !Array.isArray(data.artists)) return showToast('Invalid format', 'error')
        const workCount = data.artists.reduce((s, a) => s + (a.mainWorks?.length || 0) + (a.compilations?.length || 0), 0)
        const imageCount = data.customImages ? Object.keys(data.customImages).length : 0
        importConfirm.value = {
          show: true,
          data,
          artistCount: data.artists.length,
          workCount,
          imageCount,
          hasImages: imageCount > 0,
        }
      } catch { showToast('Invalid JSON', 'error') }
    }
    reader.readAsText(file); event.target.value = ''
  } catch { showToast('Import failed', 'error') }
}

function cancelImport() { importConfirm.value = { show: false, data: null, artistCount: 0, workCount: 0, imageCount: 0, hasImages: false } }

function confirmImport() {
  const data = importConfirm.value.data; if (!data) return
  artists.value = normalizeArtists(data.artists)
  customImages.value = data.customImages || {}
  localStorage.setItem('artists', JSON.stringify(artists.value))
  cancelImport()
  showToast('Imported')
}

// ─────────────────────────────────────────────────────────────────────────────
// Global search
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
  if (activeTab.value !== artist.name) {
    viewTransition.value = 'slide-right'
    if (!viewedArtists.value.has(artist.name)) viewedArtists.value = new Set([...viewedArtists.value, artist.name])
    activeTab.value = artist.name
    currentView.value = 'works'
    searchQuery.value = ''; workSortBy.value = 'codeAsc'
    gridGeneration.value++
  }
  nextTick(() => openWorkView(work))
}

function hardRefresh() {
  showConfirm({
    title: 'Reset everything',
    message: 'All artists, works, images and history will be permanently deleted. This cannot be undone.',
    confirmLabel: 'Reset all',
    danger: true,
    onConfirm: () => {
      ;['artists', 'viewedArtists', 'viewedWorks', 'artistSortBy', 'customImages'].forEach(k => localStorage.removeItem(k))
      imageDB.clear().then(() => {
        artists.value = normalizeArtists(JSON.parse(JSON.stringify(DEFAULT_ARTISTS)))
        currentView.value = 'artists'; activeTab.value = ''; customImages.value = {}
        // FIX 17: reset to empty Set
        viewedArtists.value = new Set(); viewedWorks.value = new Set()
        artistSortBy.value = 'nameAsc'
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
function doConfirm() { confirmDialog.value.onConfirm?.(); closeConfirm() }

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
let _toastTimer = null
function showToast(msg, type = 'success') {
  clearTimeout(_toastTimer)
  toast.value = { show: true, message: msg, type }
  _toastTimer = setTimeout(() => { toast.value.show = false }, 2500)
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence helper (images)
// ─────────────────────────────────────────────────────────────────────────────
function saveCustomImagesToDB(images) {
  if (useLocalStorageFallback.value) {
    try { localStorage.setItem('customImages', JSON.stringify(images)) } catch { }
  } else {
    imageDB.setAll(images).catch(() => { })
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
  gap: 24px;
  z-index: 9999;
}
 
.loading-logo {
  font: 900 72px / 1 var(--display);
  color: var(--ink);
  letter-spacing: -2px;
  animation: wt-pulse 1.2s ease-in-out infinite alternate;
}
 
.loading-bar {
  width: 80px;
  height: 1px;
  background: var(--line);
  position: relative;
  overflow: hidden;
}
 
.loading-fill {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 100%;
  height: 100%;
  background: var(--accent);
  animation: wt-loadbar 1.1s ease-in-out infinite;
  transform-origin: left;
}
 
/* ─── Bar ─── */
.bar {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  height: calc(52px + env(safe-area-inset-top, 0px));
  padding-block-start: env(safe-area-inset-top, 0px);
  z-index: 100;
  background: var(--surface);
  border-block-end: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 24px;
  gap: 12px;
  transition: background var(--t-color);
}
 
.bar-left,
.bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
 
.bar-right {
  flex-shrink: 0;
}
 
.stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ink3);
  letter-spacing: 0.3px;
  font-family: var(--mono);
}
 
.stats b {
  color: var(--ink);
  font-weight: 700;
}
 
.stat-sep {
  color: var(--line2);
  margin-inline: 3px;
}
 
.bar-artist {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
 
.bar-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--line);
  border: 1px solid var(--line2);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 700 9px var(--mono);
  color: var(--ink3);
  text-transform: uppercase;
}
 
.bar-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.bar-title {
  font: 700 13px / 1 var(--mono);
  letter-spacing: 0.05em;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  text-transform: uppercase;
}
 
.bar-title--mono {
  font-family: var(--mono);
  font-size: 13px;
  max-width: 140px;
}
 
.bar-title--dim {
  color: var(--ink3);
  max-width: 110px;
}
 
.breadcrumb-arrow {
  color: var(--line2);
  flex-shrink: 0;
}
 
.bar-work-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 2px;
  background: transparent;
  border: 1px solid var(--line2);
  flex-shrink: 0;
}
 
.bar-viewed-count {
  font: 700 10px var(--mono);
  color: var(--accent);
}
 
.bar-total-sep {
  font: 400 10px var(--mono);
  color: var(--line2);
  margin-inline: 1px;
}
 
.bar-total-count {
  font: 500 10px var(--mono);
  color: var(--ink3);
}
 
/* ─── Search ─── */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
 
.search-ico {
  position: absolute;
  inset-inline-start: 9px;
  color: var(--ink3);
  pointer-events: none;
}
 
.search-box input {
  width: 160px;
  padding: 6px 24px 6px 28px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: var(--bg);
  font: 12px var(--mono);
  color: var(--ink);
  transition: border-color var(--t), background var(--t-color);
  letter-spacing: 0.05em;
}
 
.search-box input:focus {
  outline: none;
  border-color: var(--accent);
}
 
.search-box input::placeholder {
  color: var(--ink3);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.1em;
}
 
.search-x {
  position: absolute;
  inset-inline-end: 6px;
  width: 16px;
  height: 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--ink3);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
 
/* ─── Buttons ─── */
.btn-back {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink2);
  transition: border-color var(--t), color var(--t), background var(--t);
  flex-shrink: 0;
}
 
.btn-back:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
 
.btn-filter {
  padding: 4px 10px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  background: transparent;
  font: 700 9px var(--mono);
  color: var(--ink3);
  cursor: pointer;
  transition: border-color var(--t), color var(--t), background var(--t);
  white-space: nowrap;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
 
.btn-filter:hover {
  border-color: var(--ink);
  color: var(--ink);
}
 
.btn-filter.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
 
.btn-icon {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  color: var(--ink3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--t), color var(--t), background var(--t);
  flex-shrink: 0;
}
 
.btn-icon:hover {
  border-color: var(--ink2);
  color: var(--ink);
}
 
.btn-icon.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
 
/* ─── Menu ─── */
.menu-wrap {
  position: relative;
}
 
.btn-menu {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  color: var(--ink3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--t), color var(--t);
}
 
.btn-menu:hover {
  border-color: var(--ink2);
  color: var(--ink);
}
 
.menu-drop {
  position: absolute;
  inset-block-start: 40px;
  inset-inline-end: 0;
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--line2);
  border-radius: 2px;
  overflow: hidden;
  z-index: 200;
}
 
.menu-drop button {
  display: block;
  width: 100%;
  padding: 11px 16px;
  border: none;
  background: none;
  font: 500 12px var(--mono);
  color: var(--ink2);
  text-align: start;
  cursor: pointer;
  transition: background var(--t), color var(--t);
  letter-spacing: 0.04em;
}
 
.menu-drop button:hover {
  background: var(--bg);
  color: var(--ink);
}
 
.menu-drop .menu-danger {
  color: var(--danger);
}
 
.menu-drop .menu-danger:hover {
  background: var(--danger-bg);
  color: var(--danger);
}
 
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}
 
/* ─── Page ─── */
.page {
  padding: calc(72px + env(safe-area-inset-top, 0px)) 24px 60px;
}
 
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
  background: var(--line);
  border-radius: inherit;
}
 
.skeleton--hidden {
  display: none;
}
 
.fade-img {
  opacity: 0;
  transition: opacity 0.4s ease;
  position: relative;
  z-index: 1;
}
 
.fade-img.loaded {
  opacity: 1;
}
 
/* ─── Alpha rail ─── */
.alpha-rail {
  position: fixed;
  inset-inline-end: 8px;
  inset-block-start: calc(52px + env(safe-area-inset-top, 0px));
  inset-block-end: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-block: 8px;
  gap: 1px;
}
 
.alpha-rail button {
  display: block;
  padding: 1px 5px;
  border: none;
  background: none;
  font: 600 8px var(--mono);
  color: var(--ink3);
  cursor: pointer;
  line-height: 1.5;
  transition: color var(--t);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
 
.alpha-rail button.active {
  color: var(--ink);
}
 
.alpha-rail button:disabled {
  opacity: 0.2;
  cursor: default;
}
 
.alpha-rail button:hover:not(:disabled) {
  color: var(--accent);
}
 
/* ─── Artist groups ─── */
.group {
  margin-block-end: 48px;
}
 
.group-head {
  position: sticky;
  inset-block-start: calc(52px + env(safe-area-inset-top, 0px));
  z-index: 50;
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-block: 12px;
  margin-block-end: 20px;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-block-end: 1px solid var(--line);
}
 
.letter {
  font: 900 52px / 1 var(--display);
  letter-spacing: -2px;
  color: var(--ink);
  line-height: 0.9;
}
 
.group-n {
  font: 500 11px var(--mono);
  color: var(--ink3);
}
 
/* ─── Grids ─── */
.grid-artists {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  padding-inline-end: 32px;
}
 
.grid-works {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
 
.grid-works--compact {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}
 
/* ─── Artist card ─── */
.a-card {
  position: relative;
  cursor: pointer;
  border-radius: 0;
  overflow: hidden;
  transition: opacity var(--t), transform var(--t);
  border: 1px solid var(--line);
}
 
.a-card:hover {
  border-color: var(--ink2);
}
 
.a-card--dim {
  opacity: 0.3;
}
 
.a-card--dim:hover {
  opacity: 0.55;
}
 
.a-card:not(.a-card--dim) .a-img {
  border-color: transparent;
}
 
.a-card:hover .a-img img {
  transform: scale(1.05);
  transition: transform 0.5s cubic-bezier(0.2, 0, 0.2, 1);
}
 
.a-img {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  background: var(--bg-tint);
  overflow: hidden;
}
 
.a-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.a-ph {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  font: 900 72px / 1 var(--display);
  color: var(--line2);
  background: var(--bg-tint);
  letter-spacing: -3px;
}
 
.a-overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 2;
  padding: 32px 12px 10px;
  background: linear-gradient(transparent, rgba(0, 0, 0, .85));
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
 
.a-name {
  font: 700 11px / 1.3 var(--mono);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
 
.a-count {
  font: 700 10px var(--mono);
  color: rgba(255, 255, 255, .65);
}
 
.progress-bar {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  height: 2px;
  background: rgba(255, 255, 255, .1);
  z-index: 3;
}
 
.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.4s ease;
}
 
.badge-check {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-start: 8px;
  z-index: 4;
  width: 20px;
  height: 20px;
  border-radius: 0;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
 
.badge-check--tl {
  inset-block-start: 6px;
  inset-inline-start: 6px;
  width: 18px;
  height: 18px;
}
 
/* ─── Works top bar ─── */
.works-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: 28px;
  gap: 12px;
  flex-wrap: wrap;
  padding-block-end: 20px;
  border-block-end: 1px solid var(--line);
}
 
.works-info {
  flex: 1;
}
 
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
 
.chip {
  padding: 3px 10px;
  border-radius: 2px;
  font: 700 9px var(--mono);
  border: 1px solid var(--line2);
  color: var(--ink3);
  background: transparent;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
 
.chip--progress {
  border-color: var(--accent);
  color: var(--accent);
}
 
.chip--url {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: border-color var(--t), color var(--t), background var(--t);
}
 
.chip--url:hover {
  border-color: var(--accent);
  color: var(--accent);
}
 
.works-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
 
.sort-select {
  padding: 5px 10px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  font: 600 10px var(--mono);
  color: var(--ink2);
  background: transparent;
  cursor: pointer;
  height: 30px;
  transition: background var(--t-color), border-color var(--t);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
 
.sort-select:focus {
  outline: none;
  border-color: var(--accent);
}
 
.btn-add {
  padding-inline: 14px;
  height: 30px;
  background: var(--ink);
  color: var(--bg);
  border: 1px solid var(--ink);
  border-radius: 2px;
  font: 700 10px var(--mono);
  cursor: pointer;
  white-space: nowrap;
  transition: opacity var(--t);
  display: flex;
  align-items: center;
  gap: 4px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
 
.btn-add:hover {
  opacity: 0.75;
}
 
.btn-surprise {
  padding-inline: 12px;
  height: 30px;
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 2px;
  font: 700 10px var(--mono);
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background var(--t), color var(--t), transform 0.15s ease;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
 
.btn-surprise:hover {
  background: var(--accent);
  color: #fff;
}
 
.btn-surprise:active {
  transform: scale(0.96);
}
 
/* ─── Work section ─── */
.w-section {
  margin-block-end: 48px;
}
 
.w-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-block-end: 16px;
  padding-block-end: 10px;
  border-block-end: 1px solid var(--line);
}
 
.w-label {
  font: 900 11px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink3);
}
 
.w-n {
  font: 700 10px var(--mono);
  color: var(--line2);
  margin-inline-start: auto;
}
 
/* ─── Work card ─── */
.w-card {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease, opacity var(--t);
  border: 1px solid var(--line);
}
 
.w-card:hover {
  border-color: var(--ink2);
}
 
.w-card--dim {
  opacity: 0.3;
}
 
.w-card--dim:hover {
  opacity: 0.55;
}
 
.w-card:hover .w-img img {
  transform: scale(1.05);
  transition: transform 0.45s cubic-bezier(0.2, 0, 0.2, 1);
}
 
.w-img {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  background: var(--bg-tint);
  margin-block-end: 0;
}
 
.w-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.badge-star {
  position: absolute;
  inset-block-start: 6px;
  inset-inline-end: 6px;
  z-index: 2;
  width: 20px;
  height: 20px;
  border-radius: 0;
  background: var(--accent);
  color: #fff;
  font: 900 12px var(--display);
  display: flex;
  align-items: center;
  justify-content: center;
}
 
.w-code {
  font: 700 11px var(--mono);
  color: var(--ink2);
  display: block;
  padding: 7px 10px;
  background: var(--surface);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-block-start: 1px solid var(--line);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
 
.w-code--has-tip {
  position: relative;
}
 
.w-code-tip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: var(--ink);
  color: var(--bg);
  font: 700 10px var(--mono);
  padding: 4px 8px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 20;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
 
.w-code--has-tip:hover .w-code-tip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
 
/* ─── Modals ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .7);
  backdrop-filter: blur(4px);
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
  border: 1px solid var(--line2);
  border-radius: 0;
  overflow: hidden;
}
 
.m-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-block-end: 1px solid var(--line);
}
 
.m-head h3 {
  font: 900 18px / 1 var(--display);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
 
.m-x {
  width: 30px;
  height: 30px;
  border: none;
  background: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--ink3);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
 
.m-body {
  padding: 20px;
}
 
.m-sub {
  font: 700 11px var(--mono);
  color: var(--ink3);
  margin-block-end: 16px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
 
.m-foot {
  display: flex;
  gap: 8px;
  padding: 14px 20px;
  border-block-start: 1px solid var(--line);
  background: var(--bg);
}
 
.hint {
  font: 500 11px var(--mono);
  color: var(--ink3);
  margin-block-start: -8px;
}
 
.hint--loading {
  color: var(--accent);
}
 
.field {
  display: block;
  margin-block-end: 16px;
}
 
.field span {
  display: block;
  font: 700 9px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink3);
  margin-block-end: 7px;
}
 
.field input,
.field select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  font: 13px var(--mono);
  color: var(--ink);
  background: var(--bg);
  transition: border-color var(--t), background var(--t-color);
}
 
.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--accent);
}
 
.radios {
  display: flex;
  gap: 8px;
}
 
.radio {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  cursor: pointer;
  transition: border-color var(--t);
}
 
.radio:hover {
  border-color: var(--ink2);
}
 
.radio input {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--accent);
}
 
.radio span {
  font: 600 12px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink2);
}
 
.btn-flat,
.btn-fill {
  flex: 1;
  padding-block: 9px;
  border-radius: 2px;
  font: 700 10px var(--mono);
  cursor: pointer;
  transition: border-color var(--t), color var(--t), background var(--t), opacity var(--t);
  border: 1px solid;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
 
.btn-flat {
  background: transparent;
  color: var(--ink3);
  border-color: var(--line2);
}
 
.btn-flat:hover {
  border-color: var(--ink2);
  color: var(--ink);
}
 
.btn-fill {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}
 
.btn-fill:hover {
  opacity: 0.8;
}
 
.btn-fill:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
 
/* ─── Bottom Sheet ─── */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .6);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  height: 100dvh;
}
 
.bottom-sheet {
  width: 100%;
  background: var(--surface);
  border-radius: 0;
  padding: 12px 20px 36px;
  padding-block-end: max(36px, env(safe-area-inset-bottom, 36px));
  border-block-start: 1px solid var(--line2);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 85vh;
  overflow-y: auto;
}
 
.sheet-handle {
  width: 32px;
  height: 2px;
  background: var(--line2);
  margin: 0 auto 4px;
}
 
.sheet-title {
  font: 900 22px var(--display);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
 
.sheet-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
 
.sheet-label {
  font: 700 9px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink3);
}
 
.sheet-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
 
.pill {
  padding: 6px 14px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  background: transparent;
  font: 700 10px var(--mono);
  color: var(--ink3);
  cursor: pointer;
  transition: background var(--t), border-color var(--t), color var(--t);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
 
.pill--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
 
.sheet-done {
  padding-block: 13px;
  background: var(--ink);
  color: var(--bg);
  border: none;
  border-radius: 2px;
  font: 700 11px var(--mono);
  cursor: pointer;
  transition: opacity var(--t);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
 
.sheet-done:hover {
  opacity: 0.8;
}
 
/* ─── Lightbox ─── */
.lb {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
  touch-action: none;
  user-select: none;
}
 
.lb-close {
  position: fixed;
  inset-block-start: 16px;
  inset-inline-end: 16px;
  width: 40px;
  height: 40px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, .2);
  background: transparent;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t);
  z-index: 1;
}
 
.lb-close:hover {
  background: rgba(255, 255, 255, .1);
}
 
.lb-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90vw;
  height: 90vh;
  overflow: hidden;
}
 
.lb-main img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  display: block;
  transform-origin: center center;
  will-change: transform;
}
 
.lb-img-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}
 
.lb-arr {
  position: fixed;
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, .2);
  background: transparent;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t);
  z-index: 1;
}
 
.lb-arr:hover:not(:disabled) {
  background: rgba(255, 255, 255, .1);
}
 
.lb-arr:disabled {
  opacity: 0.15;
  cursor: not-allowed;
}
 
.lb-arr--left { inset-inline-start: 20px; }
.lb-arr--right { inset-inline-end: 20px; }
 
.lb-hud {
  position: fixed;
  inset-block-end: 20px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, .6);
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 2px;
  padding: 6px 16px;
  white-space: nowrap;
}
 
.lb-count {
  color: rgba(255, 255, 255, .7);
  font: 600 11px var(--mono);
  letter-spacing: 0.08em;
}
 
.lb-zoom-hint {
  color: rgba(255, 255, 255, .3);
  font: 400 10px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
 
.lb-reset {
  border: 1px solid rgba(255, 255, 255, .2);
  background: transparent;
  color: rgba(255, 255, 255, .7);
  font: 700 10px var(--mono);
  padding: 3px 10px;
  border-radius: 2px;
  cursor: pointer;
  transition: background var(--t);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
 
.lb-reset:hover {
  background: rgba(255, 255, 255, .1);
}
 
/* ─── Toast ─── */
.toast {
  position: fixed;
  inset-block-end: 24px;
  inset-inline-end: 24px;
  padding: 10px 18px;
  border-radius: 2px;
  border: 1px solid;
  font: 700 11px var(--mono);
  z-index: 500;
  background: var(--surface);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
 
.toast--success {
  border-color: var(--accent);
  color: var(--accent);
}
 
.toast--error {
  border-color: var(--danger);
  color: var(--danger);
}
 
.toast--info {
  border-color: var(--ink2);
  color: var(--ink2);
}
 
/* ─── Misc ─── */
.empty {
  padding-block: 80px;
  text-align: center;
  color: var(--ink3);
  font: 700 11px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
 
.shortcut-hint {
  position: fixed;
  inset-block-end: 24px;
  inset-inline-start: 50%;
  transform: translateX(-50%) translateY(10px);
  padding: 7px 14px;
  background: var(--surface);
  border: 1px solid var(--line2);
  border-radius: 2px;
  font: 600 10px var(--mono);
  color: var(--ink3);
  z-index: 50;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
 
.shortcut-hint--visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
 
.shortcut-hint kbd {
  display: inline-block;
  padding: 1px 6px;
  background: var(--bg);
  border: 1px solid var(--line2);
  border-radius: 2px;
  font: 700 10px var(--mono);
  color: var(--ink2);
  margin-inline-end: 4px;
}
 
/* ─── Confirm dialog ─── */
.confirm-modal {
  max-width: 400px;
}
 
.confirm-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
 
.confirm-icon-badge {
  width: 26px;
  height: 26px;
  border-radius: 2px;
  border: 1px solid var(--line2);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink3);
  flex-shrink: 0;
}
 
.confirm-icon-badge--danger {
  border-color: var(--danger);
  background: var(--danger-bg);
  color: var(--danger);
}
 
.confirm-message {
  font: 400 13px / 1.65 var(--mono);
  color: var(--ink3);
  margin: 0;
}
 
.btn-fill--danger {
  background: var(--danger);
  border-color: var(--danger);
}
 
.btn-fill--danger:hover {
  opacity: 0.85;
}
 
/* ─── Global search overlay ─── */
.gs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, .75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-block-start: max(80px, calc(52px + env(safe-area-inset-top, 0px) + 20px));
  padding-inline: 16px;
}
 
.gs-panel {
  width: 100%;
  max-width: 560px;
  background: var(--surface);
  border: 1px solid var(--line2);
  border-radius: 0;
  overflow: hidden;
  max-height: calc(100dvh - 120px);
  display: flex;
  flex-direction: column;
}
 
.gs-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-block-end: 1px solid var(--line);
  flex-shrink: 0;
}
 
.gs-ico {
  color: var(--ink3);
  flex-shrink: 0;
}
 
.gs-input {
  flex: 1;
  border: none;
  background: transparent;
  font: 500 14px var(--mono);
  color: var(--ink);
  outline: none;
  letter-spacing: 0.06em;
}
 
.gs-input::placeholder {
  color: var(--ink3);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
 
.gs-clear {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  border: 1px solid var(--line2);
  background: transparent;
  color: var(--ink3);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
 
.gs-esc {
  padding: 2px 7px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  font: 700 9px var(--mono);
  color: var(--ink3);
  cursor: pointer;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: border-color var(--t), color var(--t);
}
 
.gs-esc:hover {
  border-color: var(--ink2);
  color: var(--ink);
}
 
.gs-body {
  overflow-y: auto;
  flex: 1;
  padding-block: 8px;
}
 
.gs-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: var(--ink3);
  font: 500 11px var(--mono);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
 
.gs-section {
  margin-block-end: 4px;
}
 
.gs-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px 4px;
  font: 700 9px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink3);
}
 
.gs-count {
  margin-inline-start: auto;
  font: 700 10px var(--mono);
  color: var(--ink3);
}
 
.gs-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: start;
  transition: background var(--t);
  position: relative;
  overflow: hidden;
}
 
.gs-row:hover {
  background: var(--bg);
}
 
.gs-row-avatar {
  width: 30px;
  height: 30px;
  border-radius: 0;
  overflow: hidden;
  background: var(--line);
  border: 1px solid var(--line2);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 900 12px var(--display);
  color: var(--ink3);
}
 
.gs-row-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.gs-row-thumb {
  width: 40px;
  height: 28px;
  border-radius: 0;
  overflow: hidden;
  background: var(--line);
  flex-shrink: 0;
  border: 1px solid var(--line);
}
 
.gs-row-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.gs-row-name {
  font: 600 12px var(--mono);
  color: var(--ink);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
 
.gs-row-meta {
  font: 500 10px var(--mono);
  color: var(--ink3);
  flex-shrink: 0;
}
 
.gs-row-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
 
.gs-row-code {
  font: 700 12px var(--mono);
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
 
.gs-row-artist {
  font: 500 10px var(--mono);
  color: var(--ink3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
 
.gs-row-seen {
  width: 16px;
  height: 16px;
  border-radius: 0;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
 
.gs-row-progress {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 0;
  height: 1px;
  background: var(--accent);
  opacity: 0.4;
  transition: width 0.3s ease;
}
 
.gs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--ink3);
  font: 700 10px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
 
:deep(.gs-hl) {
  background: transparent;
  color: var(--accent);
  font-weight: 900;
  text-decoration: underline;
  text-decoration-color: var(--accent);
  font-style: normal;
}
 
/* ─── Import confirm ─── */
.import-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-block-end: 16px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 2px;
  overflow: hidden;
}
 
.import-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  gap: 6px;
}
 
.import-stat-val {
  font: 900 36px / 1 var(--display);
  color: var(--ink);
  letter-spacing: -1px;
}
 
.import-stat-label {
  font: 700 9px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink3);
}
 
.import-stat-sep {
  width: 1px;
  align-self: stretch;
  background: var(--line2);
}
 
.import-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font: 400 11px / 1.6 var(--mono);
  color: var(--ink3);
  padding: 10px 12px;
  background: transparent;
  border: 1px solid var(--line2);
  border-radius: 2px;
}
 
.import-warning svg {
  color: var(--ink3);
  flex-shrink: 0;
  margin-block-start: 1px;
}
 
/* ─── Animations ─── */
.a-card {
  animation: wt-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(min(var(--stagger-i, 0), 10) * 45ms);
}
 
.w-card {
  animation: wt-card-in 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(min(var(--stagger-i, 0), 12) * 32ms);
}
 
:deep(.app-load-leave-active) {
  transition: opacity 0.3s ease;
}
:deep(.app-load-leave-to) {
  opacity: 0;
}
:deep(.gs-fade-enter-active) {
  transition: opacity 0.18s ease;
}
:deep(.gs-fade-leave-active) {
  transition: opacity 0.15s ease;
}
:deep(.gs-fade-enter-from),
:deep(.gs-fade-leave-to) {
  opacity: 0;
}
:deep(.gs-fade-enter-active .gs-panel) {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
:deep(.gs-fade-leave-active .gs-panel) {
  transition: transform 0.15s ease;
}
:deep(.gs-fade-enter-from .gs-panel) {
  transform: translateY(-12px);
}
:deep(.gs-fade-leave-to .gs-panel) {
  transform: translateY(-6px);
}
:deep(.fade-enter-active),
:deep(.fade-leave-active) {
  transition: opacity 0.2s;
}
:deep(.fade-enter-from),
:deep(.fade-leave-to) {
  opacity: 0;
}
:deep(.m-enter-active) {
  transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
:deep(.m-leave-active) {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
:deep(.m-enter-from) {
  opacity: 0;
  transform: scale(0.94) translateY(6px);
}
:deep(.m-leave-to) {
  opacity: 0;
  transform: scale(0.97) translateY(3px);
}
:deep(.toast-enter-active),
:deep(.toast-leave-active) {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
:deep(.toast-enter-from),
:deep(.toast-leave-to) {
  opacity: 0;
  transform: translateY(8px);
}
:deep(.drop-enter-active) {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
:deep(.drop-leave-active) {
  transition: opacity 0.08s ease;
}
:deep(.drop-enter-from) {
  opacity: 0;
  transform: translateY(-4px);
}
:deep(.drop-leave-to) {
  opacity: 0;
}
:deep(.sheet-enter-active) {
  transition: transform 0.28s cubic-bezier(0.32, 0, 0.67, 0);
}
:deep(.sheet-leave-active) {
  transition: transform 0.2s ease;
}
:deep(.sheet-enter-from),
:deep(.sheet-leave-to) {
  transform: translateY(100%);
}
:deep(.slide-right-enter-active),
:deep(.slide-right-leave-active),
:deep(.slide-left-enter-active),
:deep(.slide-left-leave-active) {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
:deep(.slide-right-enter-from) {
  opacity: 0;
  transform: translateX(36px);
}
:deep(.slide-right-leave-to) {
  opacity: 0;
  transform: translateX(-36px);
}
:deep(.slide-left-enter-from) {
  opacity: 0;
  transform: translateX(-36px);
}
:deep(.slide-left-leave-to) {
  opacity: 0;
  transform: translateX(36px);
}
:deep(.lb-enter-active) {
  transition: opacity 0.22s ease;
}
:deep(.lb-enter-active .lb-main) {
  animation: wt-lb-hero-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}
:deep(.lb-enter-from) {
  opacity: 0;
}
:deep(.lb-leave-active) {
  transition: opacity 0.18s ease;
}
:deep(.lb-leave-to) {
  opacity: 0;
}
:deep(.lb-slide-left-enter-active),
:deep(.lb-slide-left-leave-active),
:deep(.lb-slide-right-enter-active),
:deep(.lb-slide-right-leave-active) {
  transition: opacity 0.16s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
:deep(.lb-slide-left-enter-from) {
  opacity: 0;
  transform: translateX(60px);
}
:deep(.lb-slide-left-leave-to) {
  opacity: 0;
  transform: translateX(-60px);
}
:deep(.lb-slide-right-enter-from) {
  opacity: 0;
  transform: translateX(-60px);
}
:deep(.lb-slide-right-leave-to) {
  opacity: 0;
  transform: translateX(60px);
}
:deep(.lb-slide-none-enter-active),
:deep(.lb-slide-none-leave-active) {
  transition: opacity 0.13s ease;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
:deep(.lb-slide-none-enter-from),
:deep(.lb-slide-none-leave-to) {
  opacity: 0;
}
 
/* ─── Responsive ─── */
@media (min-width: 1025px) and (max-width: 1500px) {
  .page { padding-inline: 32px; }
  .grid-artists { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .grid-works { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
}
 
@media (min-width: 769px) and (max-width: 1024px) {
  .bar { height: calc(52px + env(safe-area-inset-top, 0px)); padding-inline: 20px; }
  .search-box input { width: 160px; }
  .page { padding: calc(76px + env(safe-area-inset-top, 0px)) 24px 48px; }
  .group-head { inset-block-start: calc(52px + env(safe-area-inset-top, 0px)); }
  .letter { font-size: 44px; }
  .grid-artists { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; padding-inline-end: 36px; }
  .grid-works { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .bar-work-badge { display: flex; }
}
 
@media (max-width: 768px) {
  .bar { padding-inline: 14px; height: calc(48px + env(safe-area-inset-top, 0px)); gap: 6px; }
  .stats { font-size: 10px; }
  .search-box input { width: 100px; font-size: 11px; }
  .page { padding: calc(62px + env(safe-area-inset-top, 0px)) 14px 36px; }
  .group-head { inset-block-start: calc(48px + env(safe-area-inset-top, 0px)); }
  .letter { font-size: 40px; }
  .grid-artists { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .grid-works { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .grid-works--compact { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 5px; }
  .alpha-rail { inset-inline-end: 2px; }
  .alpha-rail button { font-size: 7px; padding: 1px 3px; }
  .bar-work-badge { display: none; }
}
 
@media (max-width: 640px) {
  .stats { display: none; }
  .bar-title { max-width: 110px; }
  .search-box input { width: 82px; }
  .page { padding: calc(58px + env(safe-area-inset-top, 0px)) 12px 28px; }
  .group-head { inset-block-start: calc(48px + env(safe-area-inset-top, 0px)); }
  .letter { font-size: 36px; }
  .grid-artists { grid-template-columns: repeat(2, 1fr); gap: 8px; padding-inline-end: 14px; }
  .grid-works { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .grid-works--compact { grid-template-columns: repeat(3, 1fr); gap: 5px; }
  .works-top { flex-direction: column; align-items: stretch; }
  .works-actions { justify-content: flex-end; }
  .toast { inset-inline: 12px; inset-block-end: 12px; }
  .alpha-rail { display: none; }
  .bar-title--dim { display: none; }
  .bar-artist .breadcrumb-arrow { display: none; }
  .shortcut-hint { display: none; }
}
 
@media (max-width: 360px) {
  .search-box input { width: 65px; font-size: 10px; }
  .bar-title { max-width: 80px; font-size: 11px; }
  .btn-icon, .btn-menu { width: 26px; height: 26px; }
  .bar { padding-inline: 10px; gap: 5px; }
}
 
@media (pointer: coarse) and (min-width: 769px) {
  .a-card:hover, .w-card:hover { transform: none; }
  .nav-btn { min-width: 52px; }
  .bottom-sheet { padding-block-end: max(48px, env(safe-area-inset-bottom, 48px)); }
  .pill { min-height: 44px; }
  .sheet-done { min-height: 52px; }
  .lb-arr { width: 56px; height: 56px; font-size: 24px; }
  .lb-close { width: 48px; height: 48px; font-size: 26px; }
}
</style>
 
<!-- ─── Global tokens & keyframes ─── -->
<style>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Instrument+Serif:ital@0;1&display=swap');
 
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
 
/* ── LIGHT MODE ─────────────────────────────────────────────────────── */
:root {
  --bg:        #F0EDE8;
  --bg-tint:   #E6E2DB;
  --surface:   #FAF9F7;
  --ink:       #151310;
  --ink2:      #4A4540;
  --ink3:      #908880;
  --accent:    #6B3FA0;          /* violet — single punchy accent */
  --accent-dim:#E8DFF5;
  --line:      #DDD8D0;
  --line2:     #C8C2B8;
  --danger:    #B83232;
  --danger-bg: #F5E6E6;
  --r:         2px;              /* sharp corners everywhere */
  --t:         140ms ease;
  --t-color:   180ms ease;
  --mono:      'Space Mono', 'Courier New', monospace;
  --sans:      'Space Mono', monospace; /* full mono stack — intentional */
  --display:   'Bebas Neue', 'Arial Narrow', sans-serif;
  --serif:     'Instrument Serif', Georgia, serif;
}
 
/* ── DARK MODE ──────────────────────────────────────────────────────── */
.dark {
  --bg:        #0E0C0A;
  --bg-tint:   #151210;
  --surface:   #1A1714;
  --ink:       #F2EDE5;
  --ink2:      #A89E92;
  --ink3:      #5E5850;
  --accent:    #A87DE0;
  --accent-dim:#2A1E40;
  --line:      #252018;
  --line2:     #333028;
  --danger:    #D45050;
  --danger-bg: #1E0F0F;
}
 
html, body {
  font-family: var(--mono);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  transition: background var(--t-color), color var(--t-color);
}
 
/* ── KEYFRAMES ──────────────────────────────────────────────────────── */
@keyframes wt-pulse {
  from { opacity: 0.4; }
  to   { opacity: 1; }
}
 
@keyframes wt-loadbar {
  0%   { transform: scaleX(0); transform-origin: left; }
  50%  { transform: scaleX(1); transform-origin: left; }
  51%  { transform: scaleX(1); transform-origin: right; }
  100% { transform: scaleX(0); transform-origin: right; }
}
 
@keyframes wt-card-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
 
@keyframes wt-lb-hero-in {
  from {
    opacity: 0;
    transform-origin: var(--lb-origin-x, 50%) var(--lb-origin-y, 50%);
    transform: scale(var(--lb-origin-scale, 0.7));
  }
  to {
    opacity: 1;
    transform-origin: var(--lb-origin-x, 50%) var(--lb-origin-y, 50%);
    transform: scale(1);
  }
}
 
/* ══ EXPRESSIVE DETAIL VIEW ════════════════════════════════════════════ */
 
.page--detail {
  padding: 0 0 120px;
  background: var(--bg);
}
 
/* Full-bleed hero */
.hero {
  position: relative;
  width: 100%;
  height: 70vh;
  min-height: 500px;
  max-height: 840px;
  overflow: hidden;
  cursor: zoom-in;
  margin-block-start: calc(52px + env(safe-area-inset-top, 0px));
}
 
.hero-img-wrap {
  position: absolute;
  inset: 0;
  background: var(--bg-tint);
}
 
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 1.4s cubic-bezier(0.2, 0, 0.2, 1);
}
 
.hero:hover .hero-img {
  transform: scale(1.04);
}
 
.hero-scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.88) 100%),
    linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 20%);
}
 
.hero-overlay {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  padding: 40px clamp(24px, 6vw, 80px) 64px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #fff;
  z-index: 2;
}
 
.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 10px var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255,255,255,0.7);
}
 
.hero-artist-dot {
  width: 6px;
  height: 6px;
  border-radius: 0;
  background: var(--accent);
  animation: hero-dot 2.5s ease-in-out infinite;
}
 
@keyframes hero-dot {
  0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
  50%       { opacity: 0.5; transform: scale(0.6) rotate(45deg); }
}
 
.hero-eyebrow-sep {
  color: rgba(255,255,255,0.25);
}
 
.hero-code {
  font: 900 clamp(64px, 14vw, 200px) / 0.82 'Bebas Neue', sans-serif;
  letter-spacing: 0.04em;
  margin: 0;
  color: #fff;
  word-break: break-all;
  animation: hero-code-in 0.7s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}
 
@keyframes hero-code-in {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
 
.hero-tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
 
.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 0;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  font: 700 9px var(--mono);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
 
.hero-tag--star {
  background: var(--accent);
  border-color: var(--accent);
}
 
.hero-tag--ghost {
  background: transparent;
  color: rgba(255,255,255,0.45);
  border-color: rgba(255,255,255,0.12);
}
 
/* Floating action bar */
.fab-bar {
  position: sticky;
  inset-block-start: calc(52px + env(safe-area-inset-top, 0px) + 16px);
  z-index: 30;
  display: flex;
  gap: 0;
  margin: -24px auto 52px;
  width: fit-content;
  background: var(--surface);
  border: 1px solid var(--line2);
  border-radius: 0;
}
 
.fab-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-inline-end: 1px solid var(--line);
  background: transparent;
  border-radius: 0;
  cursor: pointer;
  color: var(--ink3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background var(--t), color var(--t), transform var(--t);
}
 
.fab-btn:last-child {
  border-inline-end: none;
}
 
.fab-btn:hover:not(:disabled) {
  background: var(--bg);
  color: var(--ink);
}
 
.fab-btn:active:not(:disabled) {
  transform: scale(0.93);
}
 
.fab-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
 
.fab-btn--on {
  background: var(--accent-dim);
  color: var(--accent);
}
 
.fab-btn--primary {
  width: auto;
  padding-inline: 18px;
  background: var(--ink);
  color: var(--bg);
  font: 700 10px var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
 
.fab-btn--primary:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
}
 
/* Detail blocks */
.detail-block {
  padding-inline: clamp(24px, 6vw, 80px);
  margin-block-end: 60px;
}
 
.detail-label {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-block-end: 24px;
}
 
.detail-label-num {
  font: 700 10px var(--mono);
  color: var(--accent);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
 
.detail-label-text {
  font: 900 clamp(28px, 4vw, 48px) / 1 'Bebas Neue', sans-serif;
  color: var(--ink);
  letter-spacing: 0.06em;
}
 
.detail-label-rule {
  flex: 1;
  height: 1px;
  background: var(--line);
}
 
.detail-label-btn {
  padding: 4px 12px;
  border: 1px solid var(--line2);
  border-radius: 2px;
  background: transparent;
  font: 700 9px var(--mono);
  color: var(--ink3);
  cursor: pointer;
  transition: border-color var(--t), color var(--t);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
 
.detail-label-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
 
.detail-label-btn:disabled {
  opacity: 0.4;
}
 
/* Pill chips — watch on */
.pill-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
 
.pill-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid var(--line2);
  border-radius: 0;
  background: transparent;
  font: 700 12px var(--mono);
  color: var(--ink);
  cursor: pointer;
  transition: all var(--t);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
 
.pill-chip:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transform: translateY(-2px);
}
 
.pill-chip svg {
  opacity: 0.4;
  transition: opacity var(--t), transform var(--t);
}
 
.pill-chip:hover svg {
  opacity: 1;
  transform: translate(2px, -2px);
}
 
/* Horizontal gallery strip */
.gal-strip {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-block-end: 12px;
  margin-inline: calc(-1 * clamp(24px, 6vw, 80px));
  padding-inline: clamp(24px, 6vw, 80px);
  scrollbar-width: thin;
  scrollbar-color: var(--line2) transparent;
}
 
.gal-strip::-webkit-scrollbar { height: 4px; }
.gal-strip::-webkit-scrollbar-track { background: transparent; }
.gal-strip::-webkit-scrollbar-thumb { background: var(--line2); border-radius: 0; }
 
.gal-card {
  position: relative;
  flex: 0 0 auto;
  width: clamp(200px, 26vw, 320px);
  aspect-ratio: 3 / 2;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-tint);
  scroll-snap-align: start;
  transition: transform var(--t);
  border: 1px solid var(--line);
}
 
.gal-card:hover { transform: translateY(-3px); border-color: var(--ink2); }
 
.gal-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.gal-n {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  padding: 4px 9px;
  background: var(--accent);
  font: 700 9px var(--mono);
  color: #fff;
  letter-spacing: 0.1em;
  z-index: 2;
  text-transform: uppercase;
}
 
/* Artist profile link */
.artist-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border: 1px solid var(--line2);
  border-radius: 0;
  background: transparent;
  text-decoration: none;
  transition: all var(--t);
  font: 900 clamp(18px, 2.5vw, 28px) / 1 'Bebas Neue', sans-serif;
  color: var(--ink2);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
 
.artist-link:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-2px);
}
 
.artist-link svg {
  transition: transform var(--t);
}
 
.artist-link:hover svg {
  transform: translate(3px, -3px);
}
 
/* Mobile tuning for detail view */
@media (max-width: 768px) {
  .page--detail { padding-block-end: 80px; }
  .hero {
    height: 55vh;
    min-height: 400px;
    margin-block-start: calc(48px + env(safe-area-inset-top, 0px));
  }
  .hero-overlay { padding: 28px 20px 36px; gap: 8px; }
  .hero-code { font-size: clamp(52px, 18vw, 100px); }
  .fab-bar {
    inset-block-start: calc(48px + env(safe-area-inset-top, 0px) + 10px);
    margin: -18px 14px 40px;
    width: auto;
    justify-content: stretch;
  }
  .fab-btn { flex: 1; }
  .fab-btn--primary span { display: none; }
  .fab-btn--primary { flex: 1; padding: 0; }
  .detail-block { padding-inline: 20px; margin-block-end: 44px; }
  .gal-strip { margin-inline: -20px; padding-inline: 20px; }
  .gal-card { width: 72vw; max-width: 260px; }
}
</style>
 