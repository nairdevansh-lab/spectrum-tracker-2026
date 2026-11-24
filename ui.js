/**
 * SPECTRUM TRACKER — UI Rendering Engine
 * Handles high-performance DOM updates, event cards, live badges, podiums, and the automated leaderboard.
 */

import {
  getState,
  getKpiCounts,
  getFilteredEvents,
  getLeaderboard,
  getEventsWithWinners,
  updateUIState
} from "./state.js";

/**
 * Escapes HTML to prevent XSS
 */
function escapeHTML(str) {
  if (typeof str !== "string") return str ?? "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Toast Notification System
 */
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  toast.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Render Header Branding & Sync Status
 */
export function renderHeader() {
  const state = getState();
  const titleDisplay = document.getElementById("fest-title-display");
  const taglineDisplay = document.getElementById("fest-tagline-display");
  const syncBadge = document.getElementById("sync-badge");
  const syncLabel = document.getElementById("sync-label");

  if (titleDisplay) titleDisplay.textContent = state.settings.festName || "SPECTRUM 2026";
  if (taglineDisplay) taglineDisplay.textContent = state.settings.tagline || "Inter-School Fest Tracker";

  if (syncBadge && syncLabel) {
    syncBadge.className = `sync-badge ${state.sync.status}`;
    if (state.sync.status === "live") {
      syncLabel.textContent = "Live Sync Active";
      syncBadge.title = "Connected to Firestore REST API";
    } else if (state.sync.status === "syncing") {
      syncLabel.textContent = "Syncing...";
      syncBadge.title = "Fetching latest changes...";
    } else {
      syncLabel.textContent = "Offline / Cached";
      syncBadge.title = "Serving instantly from local cache (0ms). Tap ↻ to retry.";
    }
  }

  // Update Organizer Button State
  const orgBtn = document.getElementById("btn-organizer-toggle");
  const orgIcon = document.getElementById("organizer-btn-icon");
  const orgText = document.getElementById("organizer-btn-text");
  const orgQuickActions = document.getElementById("organizer-quick-actions");
  const manageSchoolsBtn = document.getElementById("btn-manage-schools");

  if (orgBtn && orgIcon && orgText) {
    if (state.ui.isOrganizer) {
      orgBtn.classList.add("active-organizer");
      orgIcon.textContent = "🔓";
      orgText.textContent = state.ui.organizerRole === "master" ? "Master Admin" : `${state.ui.organizerCategoryName || "Coordinator"}`;
      if (orgQuickActions) orgQuickActions.style.display = "flex";
      
      // Master admin gets full management buttons
      const isMaster = state.ui.organizerRole === "master";
      if (manageSchoolsBtn) manageSchoolsBtn.style.display = isMaster ? "inline-flex" : "none";
    } else {
      orgBtn.classList.remove("active-organizer");
      orgIcon.textContent = "🔒";
      orgText.textContent = "Organizer Mode";
      if (orgQuickActions) orgQuickActions.style.display = "none";
    }
  }
}

/**
 * Render KPI Statistics Strip
 */
export function renderKPIs() {
  const counts = getKpiCounts();
  const state = getState();

  const countTotal = document.getElementById("count-total");
  const countLive = document.getElementById("count-live");
  const countJudging = document.getElementById("count-judging");
  const countUpcoming = document.getElementById("count-upcoming");
  const countCompleted = document.getElementById("count-completed");

  if (countTotal) countTotal.textContent = counts.total;
  if (countLive) countLive.textContent = counts.live;
  if (countJudging) countJudging.textContent = counts.judging;
  if (countUpcoming) countUpcoming.textContent = counts.upcoming;
  if (countCompleted) countCompleted.textContent = counts.completed;

  // Tab Badge
  const tabBadgeEvents = document.getElementById("tab-badge-events");
  if (tabBadgeEvents) tabBadgeEvents.textContent = counts.total;

  // Active filter highlights
  const filter = state.ui.statusFilter;
  document.querySelectorAll(".stat-card").forEach(card => {
    const cardFilter = card.dataset.filter;
    if (cardFilter === filter) {
      card.classList.add("active-filter");
    } else {
      card.classList.remove("active-filter");
    }
  });
}

/**
 * Render Dynamic Category Filter Pills
 */
export function renderCategoryPills() {
  const state = getState();
  const container = document.getElementById("category-pills");
  if (!container) return;

  const active = state.ui.activeCategory;
  let html = `
    <button class="category-pill ${active === "all" ? "active" : ""}" data-category-id="all">
      <span>🌐</span><span>All Categories</span>
    </button>
  `;

  for (const cat of state.categories) {
    const isAct = active === cat.id;
    html += `
      <button class="category-pill ${isAct ? "active" : ""}" data-category-id="${escapeHTML(cat.id)}">
        <span>${cat.icon || "📌"}</span><span>${escapeHTML(cat.name)}</span>
      </button>
    `;
  }

  container.innerHTML = html;
}

/**
 * Render Event Cards in Schedule Grid
 */
export function renderEventsGrid() {
  const state = getState();
  const events = getFilteredEvents();
  const container = document.getElementById("events-grid");
  const placeholder = document.getElementById("no-events-placeholder");
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = "";
    if (placeholder) placeholder.style.display = "block";
    return;
  }

  if (placeholder) placeholder.style.display = "none";

  const categoriesMap = new Map(state.categories.map(c => [c.id, c]));
  const schoolsMap = new Map(state.schools.map(s => [s.id, s]));

  const cardsHTML = events.map(evt => {
    const cat = categoriesMap.get(evt.categoryId) || { name: evt.categoryId, icon: "📌", color: "var(--accent-primary)" };
    const statusClass = evt.status ? evt.status.toLowerCase() : "upcoming";

    // Progress bar fill class
    let fillClass = "upcoming";
    if (evt.status === "Live") fillClass = "live";
    else if (evt.status === "Judging") fillClass = "judging";
    else if (evt.status === "Completed") fillClass = "completed";

    // Check if user has permission to edit this event
    const canEdit = state.ui.isOrganizer && (
      state.ui.organizerRole === "master" ||
      state.ui.organizerCategoryId === evt.categoryId
    );

    // Declared winners HTML inside card
    let winnersHTML = "";
    if (evt.winners && (evt.winners.first?.schoolId || evt.winners.second?.schoolId || evt.winners.third?.schoolId)) {
      winnersHTML = `<div class="event-card-winners">`;
      if (evt.winners.first?.schoolId) {
        const s = schoolsMap.get(evt.winners.first.schoolId);
        winnersHTML += `
          <div class="card-winner-item">
            <span class="winner-medal">🥇</span>
            <span class="winner-name">${escapeHTML(evt.winners.first.participant || "1st Place")}</span>
            <span class="winner-school-badge">${escapeHTML(s?.shortCode || "Winner")}</span>
          </div>`;
      }
      if (evt.winners.second?.schoolId) {
        const s = schoolsMap.get(evt.winners.second.schoolId);
        winnersHTML += `
          <div class="card-winner-item">
            <span class="winner-medal">🥈</span>
            <span class="winner-name">${escapeHTML(evt.winners.second.participant || "2nd Place")}</span>
            <span class="winner-school-badge">${escapeHTML(s?.shortCode || "Runner-up")}</span>
          </div>`;
      }
      if (evt.winners.third?.schoolId) {
        const s = schoolsMap.get(evt.winners.third.schoolId);
        winnersHTML += `
          <div class="card-winner-item">
            <span class="winner-medal">🥉</span>
            <span class="winner-name">${escapeHTML(evt.winners.third.participant || "3rd Place")}</span>
            <span class="winner-school-badge">${escapeHTML(s?.shortCode || "3rd")}</span>
          </div>`;
      }
      winnersHTML += `</div>`;
    }

    // Judges string
    const judgesStr = Array.isArray(evt.judges) && evt.judges.length > 0 
      ? evt.judges.join(", ") 
      : "To be announced";

    return `
      <article class="event-card" data-event-id="${escapeHTML(evt.id)}" data-status="${escapeHTML(evt.status || "Upcoming")}">
        <div class="event-card-header">
          <div class="event-badges-row">
            <span class="category-tag" style="border-left: 3px solid ${cat.color || 'var(--accent-primary)'};">
              <span>${cat.icon || "📌"}</span>
              <span>${escapeHTML(cat.name)}</span>
            </span>
            <span class="format-tag">${escapeHTML(evt.format || "Solo")}</span>
          </div>
          <span class="status-badge ${statusClass}">
            ${escapeHTML(evt.status || "Upcoming")}
          </span>
        </div>

        <h3 class="event-title">${escapeHTML(evt.name)}</h3>

        <!-- Progress Bar & Stage Info -->
        <div class="progress-container">
          <div class="progress-header">
            <span class="round-info-text" title="${escapeHTML(evt.roundInfo || "")}">
              ${escapeHTML(evt.roundInfo || "Scheduled")}
            </span>
            <span class="progress-pct">${evt.progress ?? 0}%</span>
          </div>
          <div class="progress-track" aria-label="Event progress">
            <div class="progress-fill ${fillClass}" style="width: ${Math.min(100, Math.max(0, evt.progress ?? 0))}%;"></div>
          </div>
        </div>

        <!-- Metadata Grid -->
        <div class="event-meta-grid">
          <div class="meta-item">
            <span class="meta-icon" aria-hidden="true">📍</span>
            <span>Venue: <strong class="meta-value">${escapeHTML(evt.venue || "TBA")}</strong></span>
          </div>
          <div class="meta-item">
            <span class="meta-icon" aria-hidden="true">⏰</span>
            <span>Timing: <strong class="meta-value">${escapeHTML(evt.duration || `${evt.startTime || "10:00 AM"} – ${evt.closingTime || "12:00 PM"}`)}</strong></span>
          </div>
          <div class="meta-item">
            <span class="meta-icon" aria-hidden="true">⚖️</span>
            <span>Judges: <strong class="meta-value">${escapeHTML(judgesStr)}</strong></span>
          </div>
        </div>

        <!-- Winners banner if declared -->
        ${winnersHTML}

        <!-- Organizer Action Bar -->
        ${canEdit ? `
          <div class="card-admin-bar">
            <button class="action-btn edit-event-btn" data-edit-id="${escapeHTML(evt.id)}">
              ✏️ Update Stage &amp; Winners
            </button>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");

  container.innerHTML = cardsHTML;
}

/**
 * Render Inter-School Leaderboard
 */
export function renderLeaderboard() {
  const tbody = document.getElementById("leaderboard-tbody");
  const ruleTag = document.getElementById("leaderboard-points-rule");
  if (!tbody) return;

  const state = getState();
  const rules = state.settings.pointRules || {};
  if (ruleTag) {
    ruleTag.textContent = `Points: 🥇 1st = ${rules.firstPlace || 10} pts | 🥈 2nd = ${rules.secondPlace || 7} pts | 🥉 3rd = ${rules.thirdPlace || 5} pts`;
  }

  const rankings = getLeaderboard();

  if (rankings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">No participating schools configured.</td></tr>`;
    return;
  }

  const html = rankings.map(row => {
    let rankBadgeClass = "";
    let medalEmoji = "";
    if (row.rank === 1) { rankBadgeClass = "rank-1"; medalEmoji = "🥇 "; }
    else if (row.rank === 2) { rankBadgeClass = "rank-2"; medalEmoji = "🥈 "; }
    else if (row.rank === 3) { rankBadgeClass = "rank-3"; medalEmoji = "🥉 "; }

    const bonusPenStr = row.bonusPoints !== 0 || row.penaltyPoints !== 0
      ? `<span style="color: ${row.bonusPoints > row.penaltyPoints ? 'var(--status-live)' : '#ef4444'}">+${row.bonusPoints} / -${row.penaltyPoints}</span>`
      : `<span style="color: var(--text-muted);">-</span>`;

    return `
      <tr class="${rankBadgeClass}">
        <td style="text-align: center;">
          <span class="rank-badge">${medalEmoji}${row.rank}</span>
        </td>
        <td>
          <div class="school-name-cell">
            <span class="school-primary-name">${escapeHTML(row.name)}</span>
            <span class="school-sub-code">${escapeHTML(row.shortCode)} • ${escapeHTML(row.city || "Delegation")}</span>
          </div>
        </td>
        <td style="text-align: center;">
          <span class="medal-count-badge" style="color: var(--gold);">${row.gold}</span>
        </td>
        <td style="text-align: center;">
          <span class="medal-count-badge" style="color: var(--silver);">${row.silver}</span>
        </td>
        <td style="text-align: center;">
          <span class="medal-count-badge" style="color: var(--bronze);">${row.bronze}</span>
        </td>
        <td style="text-align: center; color: var(--text-secondary); font-weight: 600;">
          ${row.eventsWon}
        </td>
        <td style="text-align: center; font-size: 0.8rem;">
          ${bonusPenStr}
        </td>
        <td style="text-align: right;">
          <span class="total-pts-highlight">${row.totalPoints}</span>
        </td>
      </tr>
    `;
  }).join("");

  tbody.innerHTML = html;
}

/**
 * Render Winners Podium Tab
 */
export function renderWinnersPodium() {
  const container = document.getElementById("winners-podium-grid");
  const placeholder = document.getElementById("no-winners-placeholder");
  if (!container) return;

  const state = getState();
  const declaredEvents = getEventsWithWinners();

  if (declaredEvents.length === 0) {
    container.innerHTML = "";
    if (placeholder) placeholder.style.display = "block";
    return;
  }

  if (placeholder) placeholder.style.display = "none";

  const schoolsMap = new Map(state.schools.map(s => [s.id, s]));
  const categoriesMap = new Map(state.categories.map(c => [c.id, c]));

  const html = declaredEvents.map(evt => {
    const cat = categoriesMap.get(evt.categoryId) || { name: evt.categoryId, icon: "📌" };

    const firstSchool = schoolsMap.get(evt.winners?.first?.schoolId);
    const secondSchool = schoolsMap.get(evt.winners?.second?.schoolId);
    const thirdSchool = schoolsMap.get(evt.winners?.third?.schoolId);

    return `
      <div class="event-podium-card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="category-tag">
            <span>${cat.icon}</span> <span>${escapeHTML(cat.name)}</span>
          </span>
          <span class="status-badge completed">Winners Declared</span>
        </div>

        <h3 class="podium-event-title">${escapeHTML(evt.name)}</h3>

        <div class="podium-ranks-list">
          <!-- 1st Gold -->
          <div class="podium-rank-row gold-row">
            <span class="podium-medal-col">🥇</span>
            <div class="podium-winner-info">
              <span class="podium-winner-name">${escapeHTML(evt.winners?.first?.participant || "Winner")}</span>
              <span class="podium-winner-school">${escapeHTML(firstSchool?.name || "Independent")} (${escapeHTML(firstSchool?.shortCode || "1st")})</span>
            </div>
            <span style="font-weight: 800; color: var(--gold); font-size: 0.85rem;">1st Place</span>
          </div>

          <!-- 2nd Silver -->
          ${evt.winners?.second?.schoolId || evt.winners?.second?.participant ? `
            <div class="podium-rank-row silver-row">
              <span class="podium-medal-col">🥈</span>
              <div class="podium-winner-info">
                <span class="podium-winner-name">${escapeHTML(evt.winners?.second?.participant || "Runner Up")}</span>
                <span class="podium-winner-school">${escapeHTML(secondSchool?.name || "Independent")} (${escapeHTML(secondSchool?.shortCode || "2nd")})</span>
              </div>
              <span style="font-weight: 700; color: var(--silver); font-size: 0.85rem;">2nd Place</span>
            </div>
          ` : ""}

          <!-- 3rd Bronze -->
          ${evt.winners?.third?.schoolId || evt.winners?.third?.participant ? `
            <div class="podium-rank-row bronze-row">
              <span class="podium-medal-col">🥉</span>
              <div class="podium-winner-info">
                <span class="podium-winner-name">${escapeHTML(evt.winners?.third?.participant || "3rd Place")}</span>
                <span class="podium-winner-school">${escapeHTML(thirdSchool?.name || "Independent")} (${escapeHTML(thirdSchool?.shortCode || "3rd")})</span>
              </div>
              <span style="font-weight: 700; color: var(--bronze); font-size: 0.85rem;">3rd Place</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

/**
 * Apply Theme & Display Mode Controls
 */
export function applyThemeAndDisplayModes() {
  const state = getState();
  document.documentElement.setAttribute("data-theme", state.ui.theme);

  // Active theme card highlight
  document.querySelectorAll(".theme-card-option").forEach(card => {
    if (card.dataset.themeId === state.ui.theme) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });

  // Compact Grid Mode
  const mainPane = document.getElementById("pane-events");
  if (mainPane) {
    if (state.ui.compactMode) {
      mainPane.classList.add("compact-mode");
    } else {
      mainPane.classList.remove("compact-mode");
    }
  }

  // Toggles
  const toggleCompact = document.getElementById("toggle-compact");
  const toggleLive = document.getElementById("toggle-live-only");
  if (toggleCompact) toggleCompact.checked = state.ui.compactMode;
  if (toggleLive) toggleLive.checked = state.ui.liveOnlyMode;
}

/**
 * Switch Active View Tab
 */
export function switchTab(tabId) {
  if (!["events", "leaderboard", "winners", "themes"].includes(tabId)) {
    tabId = "events";
  }

  updateUIState({ activeTab: tabId });

  // Update hash without jumping
  if (window.location.hash !== `#${tabId}`) {
    history.replaceState(null, "", `#${tabId}`);
  }

  document.querySelectorAll(".nav-tab").forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  document.querySelectorAll(".view-pane").forEach(pane => {
    if (pane.id === `pane-${tabId}`) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });

  // Re-render target pane
  if (tabId === "events") renderEventsGrid();
  else if (tabId === "leaderboard") renderLeaderboard();
  else if (tabId === "winners") renderWinnersPodium();
  else if (tabId === "themes") applyThemeAndDisplayModes();
}

/**
 * Master Render Cycle: Renders the entire application
 */
export function renderAll() {
  applyThemeAndDisplayModes();
  renderHeader();
  renderKPIs();
  renderCategoryPills();
  renderEventsGrid();
  renderLeaderboard();
  renderWinnersPodium();
}
