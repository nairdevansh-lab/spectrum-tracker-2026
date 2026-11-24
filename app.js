/**
 * SPECTRUM TRACKER — Application Entry Point
 * 
 * Orchestrates:
 * - 0ms instant first paint from local state
 * - View tab transitions & URL/state synchronization
 * - Dynamic category filtering, status filters & instant search
 * - Theme and display mode toggles
 * - Event card action delegation
 * - 10-second smart background polling
 */

import {
  initLocalState,
  getState,
  updateUIState,
  subscribe,
  syncFromCloud,
  startBackgroundPolling
} from "./state.js";

import {
  renderAll,
  renderKPIs,
  renderCategoryPills,
  renderEventsGrid,
  switchTab,
  showToast
} from "./ui.js";

import {
  setupAdminListeners,
  openEventEditor
} from "./admin.js";

function setupEventListeners() {
  // 1. Navigation Tabs
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;
      if (tabId) switchTab(tabId);
    });
  });

  // 2. Interactive KPI Filter Cards
  document.querySelectorAll(".stat-card").forEach(card => {
    card.addEventListener("click", () => {
      const current = getState().ui.statusFilter;
      const target = card.dataset.filter;

      // Toggle behavior: clicking the active filter resets to 'all'
      const nextFilter = current === target && target !== "all" ? "all" : target;
      updateUIState({ statusFilter: nextFilter });

      // Automatically switch to events tab if on another view
      if (getState().ui.activeTab !== "events") {
        switchTab("events");
      } else {
        renderKPIs();
        renderEventsGrid();
      }
    });
  });

  // 3. Category Filter Pills (Delegated)
  const categoryPillsContainer = document.getElementById("category-pills");
  if (categoryPillsContainer) {
    categoryPillsContainer.addEventListener("click", e => {
      const pill = e.target.closest(".category-pill");
      if (!pill) return;

      const catId = pill.dataset.categoryId;
      updateUIState({ activeCategory: catId });
      renderCategoryPills();
      renderEventsGrid();
    });
  }

  // 4. Instant Search Input
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const val = searchInput.value;
      updateUIState({ searchQuery: val });
      if (searchClear) {
        if (val.length > 0) {
          searchClear.classList.add("visible");
        } else {
          searchClear.classList.remove("visible");
        }
      }
      renderEventsGrid();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      searchClear.classList.remove("visible");
      updateUIState({ searchQuery: "" });
      renderEventsGrid();
      if (searchInput) searchInput.focus();
    });
  }

  // 5. Display Mode Toggles (Compact & Live-Only)
  const toggleCompact = document.getElementById("toggle-compact");
  if (toggleCompact) {
    toggleCompact.addEventListener("change", () => {
      updateUIState({ compactMode: toggleCompact.checked });
      renderEventsGrid();
    });
  }

  const toggleLive = document.getElementById("toggle-live-only");
  if (toggleLive) {
    toggleLive.addEventListener("change", () => {
      updateUIState({ liveOnlyMode: toggleLive.checked });
      renderEventsGrid();
    });
  }

  // 6. Theme Card Selection in Themes Tab
  const themesGrid = document.getElementById("theme-options-grid");
  if (themesGrid) {
    themesGrid.addEventListener("click", e => {
      const card = e.target.closest(".theme-card-option");
      if (!card) return;

      const selectedTheme = card.dataset.themeId;
      if (selectedTheme) {
        updateUIState({ theme: selectedTheme });
        renderAll();
        showToast(`Theme changed to "${card.querySelector(".theme-card-title")?.textContent || selectedTheme}"`, "info");
      }
    });
  }

  // 7. Manual Refresh Button
  const refreshBtn = document.getElementById("btn-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.style.transform = "rotate(360deg)";
      refreshBtn.style.transition = "transform 0.5s ease";
      setTimeout(() => {
        refreshBtn.style.transform = "none";
        refreshBtn.style.transition = "none";
      }, 500);

      showToast("Checking cloud for live updates...", "info");
      const res = await syncFromCloud();
      if (res.ok) {
        if (res.offline) {
          showToast("Local cache up to date.", "info");
        } else {
          showToast("Live sync complete!", "success");
        }
      } else {
        showToast("Offline mode: Serving from local cache.", "info");
      }
    });
  }

  // 8. Event Card Edit Buttons (Delegated on Events Grid)
  const eventsGrid = document.getElementById("events-grid");
  if (eventsGrid) {
    eventsGrid.addEventListener("click", e => {
      const editBtn = e.target.closest(".edit-event-btn");
      if (editBtn) {
        const eventId = editBtn.dataset.editId;
        if (eventId) {
          openEventEditor(eventId);
        }
      }
    });
  }

  // 9. Setup Organizer Modals & PIN Listeners
  setupAdminListeners();
}

/**
 * Bootstrap the App
 */
function boot() {
  // 1. Synchronously restore local state (0ms first paint)
  initLocalState();

  // 2. Perform initial instant render
  renderAll();

  // Check URL hash for direct tab link (e.g. #leaderboard, #winners)
  const hash = window.location.hash.replace("#", "");
  if (["events", "leaderboard", "winners", "themes"].includes(hash)) {
    switchTab(hash);
  }

  window.addEventListener("hashchange", () => {
    const currentHash = window.location.hash.replace("#", "");
    if (["events", "leaderboard", "winners", "themes"].includes(currentHash)) {
      switchTab(currentHash);
    }
  });

  // 3. Attach interactive UI listeners
  setupEventListeners();

  // 4. Subscribe to state changes
  subscribe(() => {
    renderAll();
  });

  // 5. Start background 10s poller (pauses when tab hidden)
  startBackgroundPolling();

  // Expose helper on window for debugging & testing
  window.SpectrumTracker = {
    getState,
    updateUIState,
    switchTab,
    syncFromCloud,
    renderAll,
    openEventEditor
  };

  console.log("🎪 Spectrum Tracker successfully initialized in 0ms.");
}

// Start immediately when script executes
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
