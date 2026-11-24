/**
 * SPECTRUM TRACKER — State Management, Offline Storage & Cloud Synchronization
 *
 * Provides:
 * - Instant 0ms boot from localStorage
 * - Safe cloud sync that strictly preserves live round progress and declared winners
 * - Page Visibility API aware 10-second background polling
 * - Automated Leaderboard & Medal Tally calculations
 */

import {
  DEFAULT_FEST_SETTINGS,
  DEFAULT_CATEGORIES,
  DEFAULT_SCHOOLS,
  DEFAULT_EVENTS
} from "./schema.js";

import { FirestoreClient } from "./firebase-config.js";

const STORAGE_KEY = "SPECTRUM_TRACKER_STORE_V1";
const THEME_KEY = "SPECTRUM_TRACKER_THEME";

// Internal in-memory reactive state
const state = {
  settings: { ...DEFAULT_FEST_SETTINGS },
  categories: [...DEFAULT_CATEGORIES],
  schools: [...DEFAULT_SCHOOLS],
  events: [...DEFAULT_EVENTS],
  ui: {
    activeTab: "events",          // 'events' | 'leaderboard' | 'winners' | 'settings'
    activeCategory: "all",
    statusFilter: "all",          // 'all' | 'Live' | 'Judging' | 'Upcoming' | 'Completed'
    searchQuery: "",
    theme: "midnight-stage",      // 'midnight-stage' | 'crimson-spotlight' | 'daylight-light' | 'emerald-arena'
    compactMode: false,
    liveOnlyMode: false,
    isOrganizer: false,
    organizerRole: null,          // 'master' | 'coordinator'
    organizerCategoryId: null,
    organizerCategoryName: null
  },
  sync: {
    status: "cached",             // 'live' | 'cached' | 'syncing' | 'error'
    lastSynced: null,
    isPolling: false,
    errorMessage: ""
  }
};

// Subscribers listening for state changes
const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (e) {
      console.error("[State] Listener error:", e);
    }
  }
}

/**
 * Saves current events, schools, categories, and settings to localStorage
 */
export function saveToLocalCache() {
  try {
    const payload = {
      settings: state.settings,
      categories: state.categories,
      schools: state.schools,
      events: state.events,
      lastSaved: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[State] Could not save to localStorage:", err);
  }
}

/**
 * Synchronous instant boot from localStorage (0ms first paint)
 */
export function initLocalState() {
  try {
    // Restore saved theme & display mode preferences
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      state.ui.theme = savedTheme;
    }
    const savedCompact = localStorage.getItem("SPECTRUM_TRACKER_COMPACT");
    if (savedCompact !== null) {
      state.ui.compactMode = savedCompact === "true";
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.settings) state.settings = { ...DEFAULT_FEST_SETTINGS, ...parsed.settings };
      if (Array.isArray(parsed.categories) && parsed.categories.length > 0) state.categories = parsed.categories;
      if (Array.isArray(parsed.schools) && parsed.schools.length > 0) state.schools = parsed.schools;
      if (Array.isArray(parsed.events) && parsed.events.length > 0) state.events = parsed.events;
      state.sync.lastSynced = parsed.lastSaved || Date.now();
    } else {
      // First time launch: save defaults
      saveToLocalCache();
    }
  } catch (err) {
    console.error("[State] Error parsing cached state, falling back to schema defaults:", err);
  }
  return state;
}

/**
 * State getters
 */
export function getState() {
  return state;
}

/**
 * Update UI state & notify
 */
export function updateUIState(updates) {
  state.ui = { ...state.ui, ...updates };
  if ("theme" in updates) {
    localStorage.setItem(THEME_KEY, state.ui.theme);
  }
  if ("compactMode" in updates) {
    localStorage.setItem("SPECTRUM_TRACKER_COMPACT", String(state.ui.compactMode));
  }
  notifyListeners();
}

/**
 * Get KPI Counts for the top statistics strip
 */
export function getKpiCounts() {
  const events = state.events || [];
  return {
    total: events.length,
    live: events.filter(e => e.status === "Live").length,
    judging: events.filter(e => e.status === "Judging").length,
    upcoming: events.filter(e => e.status === "Upcoming" || e.status === "Delayed").length,
    completed: events.filter(e => e.status === "Completed").length
  };
}

/**
 * Filtered events list according to category, status, liveOnly, and search
 */
export function getFilteredEvents() {
  const { activeCategory, statusFilter, searchQuery, liveOnlyMode } = state.ui;
  let list = [...state.events];

  // Live-Only Focus Mode
  if (liveOnlyMode) {
    list = list.filter(e => e.status === "Live" || e.status === "Judging");
  }

  // Category Filter
  if (activeCategory && activeCategory !== "all") {
    list = list.filter(e => e.categoryId === activeCategory);
  }

  // Status Filter (from KPI strip)
  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "Upcoming") {
      list = list.filter(e => e.status === "Upcoming" || e.status === "Delayed");
    } else {
      list = list.filter(e => e.status === statusFilter);
    }
  }

  // Search Filter
  if (searchQuery && searchQuery.trim() !== "") {
    const q = searchQuery.trim().toLowerCase();
    const schoolsMap = new Map(state.schools.map(s => [s.id, s.name.toLowerCase()]));

    list = list.filter(e => {
      const matchName = e.name && e.name.toLowerCase().includes(q);
      const matchVenue = e.venue && e.venue.toLowerCase().includes(q);
      const matchStatus = e.status && e.status.toLowerCase().includes(q);
      const matchRound = e.roundInfo && e.roundInfo.toLowerCase().includes(q);
      const matchJudges = Array.isArray(e.judges) && e.judges.some(j => j.toLowerCase().includes(q));

      // Winners / School search
      let matchWinner = false;
      if (e.winners) {
        for (const place of ["first", "second", "third"]) {
          const w = e.winners[place];
          if (w) {
            if (w.participant && w.participant.toLowerCase().includes(q)) matchWinner = true;
            if (w.schoolId && schoolsMap.get(w.schoolId)?.includes(q)) matchWinner = true;
          }
        }
      }

      return matchName || matchVenue || matchStatus || matchRound || matchJudges || matchWinner;
    });
  }

  return list;
}

/**
 * Computes live inter-school championship leaderboard
 */
export function getLeaderboard() {
  const rules = state.settings.pointRules || DEFAULT_FEST_SETTINGS.pointRules;
  const p1 = Number(rules.firstPlace) || 10;
  const p2 = Number(rules.secondPlace) || 7;
  const p3 = Number(rules.thirdPlace) || 5;

  const tally = {};
  for (const school of state.schools) {
    tally[school.id] = {
      id: school.id,
      name: school.name,
      shortCode: school.shortCode || school.name.slice(0, 4).toUpperCase(),
      city: school.city || "",
      gold: 0,
      silver: 0,
      bronze: 0,
      eventsWon: 0,
      bonusPoints: Number(school.bonusPoints) || 0,
      penaltyPoints: Number(school.penaltyPoints) || 0,
      totalPoints: (Number(school.bonusPoints) || 0) - (Number(school.penaltyPoints) || 0)
    };
  }

  // Tally declared winners across all events
  for (const event of state.events) {
    if (!event.winners) continue;

    if (event.winners.first?.schoolId && tally[event.winners.first.schoolId]) {
      tally[event.winners.first.schoolId].gold += 1;
      tally[event.winners.first.schoolId].eventsWon += 1;
      tally[event.winners.first.schoolId].totalPoints += p1;
    }
    if (event.winners.second?.schoolId && tally[event.winners.second.schoolId]) {
      tally[event.winners.second.schoolId].silver += 1;
      tally[event.winners.second.schoolId].eventsWon += 1;
      tally[event.winners.second.schoolId].totalPoints += p2;
    }
    if (event.winners.third?.schoolId && tally[event.winners.third.schoolId]) {
      tally[event.winners.third.schoolId].bronze += 1;
      tally[event.winners.third.schoolId].eventsWon += 1;
      tally[event.winners.third.schoolId].totalPoints += p3;
    }
  }

  // Convert to array and sort descending by points, then gold, silver, bronze
  const ranked = Object.values(tally).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  // Assign ranks with tie handling
  let currentRank = 1;
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].totalPoints < ranked[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    ranked[i].rank = currentRank;
  }

  return ranked;
}

/**
 * Returns events that have declared winners
 */
export function getEventsWithWinners() {
  return state.events.filter(e => {
    if (!e.winners) return false;
    return Boolean(
      (e.winners.first && (e.winners.first.schoolId || e.winners.first.participant)) ||
      (e.winners.second && (e.winners.second.schoolId || e.winners.second.participant)) ||
      (e.winners.third && (e.winners.third.schoolId || e.winners.third.participant))
    );
  });
}

/**
 * Synchronize from Firestore REST API
 */
export async function syncFromCloud() {
  if (!FirestoreClient.isConfigured()) {
    state.sync.status = "cached";
    state.sync.lastSynced = Date.now();
    notifyListeners();
    return { ok: true, offline: true, message: "Local Cache Active" };
  }

  state.sync.status = "syncing";
  notifyListeners();

  try {
    const [eventsRes, schoolsRes, categoriesRes, settingsRes] = await Promise.all([
      FirestoreClient.getCollection("fest_events"),
      FirestoreClient.getCollection("fest_schools"),
      FirestoreClient.getCollection("fest_categories"),
      FirestoreClient.getCollection("fest_settings")
    ]);

    let changed = false;

    if (eventsRes.ok && eventsRes.data.length > 0) {
      state.events = eventsRes.data;
      changed = true;
    }
    if (schoolsRes.ok && schoolsRes.data.length > 0) {
      state.schools = schoolsRes.data;
      changed = true;
    }
    if (categoriesRes.ok && categoriesRes.data.length > 0) {
      state.categories = categoriesRes.data;
      changed = true;
    }
    if (settingsRes.ok && settingsRes.data.length > 0) {
      const cloudSettings = settingsRes.data[0];
      state.settings = { ...state.settings, ...cloudSettings };
      changed = true;
    }

    state.sync.status = "live";
    state.sync.lastSynced = Date.now();
    state.sync.errorMessage = "";
    if (changed) {
      saveToLocalCache();
    }
    notifyListeners();
    return { ok: true, status: "live" };
  } catch (err) {
    console.warn("[Sync] Cloud sync fallback to local cache:", err);
    state.sync.status = "cached";
    state.sync.errorMessage = err.message;
    notifyListeners();
    return { ok: false, offline: true, error: err.message };
  }
}

/**
 * Save / Update a single event in local state, cache, and cloud
 */
export async function updateEvent(eventData) {
  const index = state.events.findIndex(e => e.id === eventData.id);
  if (index >= 0) {
    state.events[index] = { ...state.events[index], ...eventData };
  } else {
    state.events.push(eventData);
  }

  saveToLocalCache();
  notifyListeners();

  if (FirestoreClient.isConfigured()) {
    FirestoreClient.saveDocument("fest_events", eventData.id, eventData)
      .catch(e => console.warn("[Sync] Background event save error:", e));
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId) {
  state.events = state.events.filter(e => e.id !== eventId);
  saveToLocalCache();
  notifyListeners();

  if (FirestoreClient.isConfigured()) {
    FirestoreClient.deleteDocument("fest_events", eventId)
      .catch(e => console.warn("[Sync] Background event delete error:", e));
  }
}

/**
 * CRITICAL RULE: Safe Schedule Metadata Sync
 * Updates schedule metadata (name, venue, start/closing times, duration, format, judges)
 * without overwriting active status, progress, roundInfo, or winners!
 */
export function safeSyncScheduleMetadata(incomingScheduleList) {
  const existingMap = new Map(state.events.map(e => [e.id, e]));

  const merged = incomingScheduleList.map(item => {
    const existing = existingMap.get(item.id);
    if (!existing) {
      return item; // new event
    }
    return {
      ...item,
      // Strictly preserve live state
      status: existing.status ?? item.status ?? "Upcoming",
      progress: existing.progress ?? item.progress ?? 0,
      roundInfo: existing.roundInfo ?? item.roundInfo ?? "",
      winners: existing.winners ?? item.winners ?? {
        first: { schoolId: "", participant: "" },
        second: { schoolId: "", participant: "" },
        third: { schoolId: "", participant: "" }
      }
    };
  });

  state.events = merged;
  saveToLocalCache();
  notifyListeners();

  if (FirestoreClient.isConfigured()) {
    // Background cloud sync
    for (const evt of merged) {
      FirestoreClient.saveDocument("fest_events", evt.id, evt).catch(() => {});
    }
  }
}

/**
 * Save schools list
 */
export function updateSchools(schoolsList) {
  state.schools = schoolsList;
  saveToLocalCache();
  notifyListeners();

  if (FirestoreClient.isConfigured()) {
    for (const sch of schoolsList) {
      FirestoreClient.saveDocument("fest_schools", sch.id, sch).catch(() => {});
    }
  }
}

/**
 * Save settings and point rules
 */
export function updateSettings(newSettings) {
  state.settings = { ...state.settings, ...newSettings };
  saveToLocalCache();
  notifyListeners();

  if (FirestoreClient.isConfigured()) {
    FirestoreClient.saveDocument("fest_settings", "general", state.settings).catch(() => {});
  }
}

/**
 * Master Reset: resets to clean initial default seeds (Requires Master Admin confirm)
 */
export function masterResetToDefaults() {
  state.settings = { ...DEFAULT_FEST_SETTINGS };
  state.categories = [...DEFAULT_CATEGORIES];
  state.schools = [...DEFAULT_SCHOOLS];
  state.events = [...DEFAULT_EVENTS];
  saveToLocalCache();
  notifyListeners();

  if (FirestoreClient.isConfigured()) {
    for (const evt of state.events) FirestoreClient.saveDocument("fest_events", evt.id, evt).catch(() => {});
    for (const sch of state.schools) FirestoreClient.saveDocument("fest_schools", sch.id, sch).catch(() => {});
    for (const cat of state.categories) FirestoreClient.saveDocument("fest_categories", cat.id, cat).catch(() => {});
    FirestoreClient.saveDocument("fest_settings", "general", state.settings).catch(() => {});
  }
}

/**
 * Background 10-Second Poller with Page Visibility API support
 */
let pollIntervalId = null;

export function startBackgroundPolling() {
  if (state.sync.isPolling) return;
  state.sync.isPolling = true;

  // Immediate first poll
  syncFromCloud();

  pollIntervalId = setInterval(() => {
    // Only poll if the tab is actively visible to user
    if (document.visibilityState === "visible") {
      syncFromCloud();
    }
  }, 10000);

  // Resume immediately on tab re-focus
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncFromCloud();
    }
  });
}

export function stopBackgroundPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  state.sync.isPolling = false;
}
