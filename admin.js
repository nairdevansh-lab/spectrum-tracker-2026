/**
 * SPECTRUM TRACKER — Role-Based Organizer Access & Admin Modals
 *
 * Provides:
 * - Master Admin PIN (full CRUD, schools & point rules, cloud sync)
 * - Category Coordinator PIN (category-restricted stage updates & winners declaration)
 * - Smart status-to-progress auto-fill
 * - Safe Schedule Metadata Sync vs Master Reset
 * - One-click Winners CSV export for certificate printing
 */

import {
  getState,
  updateUIState,
  updateEvent,
  deleteEvent,
  updateSchools,
  updateSettings,
  getEventsWithWinners
} from "./state.js";

import { createEmptyEvent, getSuggestedProgress } from "./schema.js";
import { showToast, renderAll } from "./ui.js";

// PIN Entry State
let enteredPin = "";

/**
 * Opens a modal dialog by ID
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.removeAttribute("hidden");
    modal.classList.add("active");
  }
}

/**
 * Closes a modal dialog by ID
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute("hidden", "");
  }
}

/**
 * Update the visual display of PIN digits
 */
function updatePinDisplay() {
  for (let i = 0; i < 4; i++) {
    const box = document.getElementById(`pin-box-${i}`);
    if (box) {
      if (i < enteredPin.length) {
        box.textContent = "•";
        box.classList.add("filled");
      } else {
        box.textContent = "";
        box.classList.remove("filled");
      }
    }
  }
}

/**
 * Validates the entered PIN against Master and Category Coordinator PINs
 */
function verifyPin() {
  const state = getState();
  const errorMsg = document.getElementById("pin-error-msg");

  // 1. Check Master Admin PIN
  if (enteredPin === state.settings.masterPin) {
    updateUIState({
      isOrganizer: true,
      organizerRole: "master",
      organizerCategoryId: null,
      organizerCategoryName: "Master Admin"
    });
    closeModal("modal-pin");
    enteredPin = "";
    updatePinDisplay();
    if (errorMsg) errorMsg.textContent = "";
    showToast("Master Admin Mode Unlocked", "success");
    renderAll();
    return;
  }

  // 2. Check Category Coordinator PINs
  for (const cat of state.categories) {
    if (cat.pin && enteredPin === cat.pin) {
      updateUIState({
        isOrganizer: true,
        organizerRole: "coordinator",
        organizerCategoryId: cat.id,
        organizerCategoryName: `${cat.name} Coordinator`
      });
      closeModal("modal-pin");
      enteredPin = "";
      updatePinDisplay();
      if (errorMsg) errorMsg.textContent = "";
      showToast(`${cat.name} Coordinator Mode Unlocked`, "success");
      renderAll();
      return;
    }
  }

  // 3. Invalid PIN
  if (errorMsg) errorMsg.textContent = "Incorrect PIN. Please try again.";
  enteredPin = "";
  updatePinDisplay();
}

/**
 * Handle PIN Keypad presses
 */
export function handlePinKey(key, action) {
  const errorMsg = document.getElementById("pin-error-msg");
  if (errorMsg) errorMsg.textContent = "";

  if (action === "clear") {
    enteredPin = "";
    updatePinDisplay();
    return;
  }

  if (action === "backspace") {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDisplay();
    return;
  }

  if (key !== undefined && key !== null) {
    if (enteredPin.length < 4) {
      enteredPin += key.toString();
      updatePinDisplay();
      if (enteredPin.length === 4) {
        setTimeout(verifyPin, 150);
      }
    }
  }
}

/**
 * Populate Category Dropdowns
 */
function populateCategorySelect(selectedId = "") {
  const state = getState();
  const select = document.getElementById("edit-event-category");
  if (!select) return;

  // If Category Coordinator, restrict dropdown to their own category
  let allowedCategories = state.categories;
  if (state.ui.organizerRole === "coordinator" && state.ui.organizerCategoryId) {
    allowedCategories = state.categories.filter(c => c.id === state.ui.organizerCategoryId);
  }

  select.innerHTML = allowedCategories.map(cat => `
    <option value="${cat.id}" ${cat.id === selectedId ? "selected" : ""}>
      ${cat.icon || ""} ${cat.name}
    </option>
  `).join("");
}

/**
 * Populate School Dropdowns in Winner Selectors
 */
function populateSchoolWinnerSelects(firstId = "", secondId = "", thirdId = "") {
  const state = getState();
  const selects = [
    { el: document.getElementById("edit-winner-1-school"), sel: firstId },
    { el: document.getElementById("edit-winner-2-school"), sel: secondId },
    { el: document.getElementById("edit-winner-3-school"), sel: thirdId }
  ];

  const optionsHTML = `
    <option value="">— Select Winning School —</option>
    ${state.schools.map(s => `
      <option value="${s.id}">${s.name} (${s.shortCode})</option>
    `).join("")}
  `;

  for (const { el, sel } of selects) {
    if (el) {
      el.innerHTML = optionsHTML;
      el.value = sel || "";
    }
  }
}

/**
 * Open Event Editor Modal in Add or Edit Mode
 */
export function openEventEditor(eventId = null) {
  const state = getState();
  const modalTitle = document.getElementById("event-editor-title");
  const deleteBtn = document.getElementById("btn-delete-event");
  const idInput = document.getElementById("edit-event-id");
  const nameInput = document.getElementById("edit-event-name");
  const formatInput = document.getElementById("edit-event-format");
  const statusSelect = document.getElementById("edit-event-status");
  const progressInput = document.getElementById("edit-event-progress");
  const progressBadge = document.getElementById("edit-progress-badge");
  const roundInput = document.getElementById("edit-event-round");
  const venueInput = document.getElementById("edit-event-venue");
  const durationInput = document.getElementById("edit-event-duration");
  const judgesInput = document.getElementById("edit-event-judges");

  const win1Name = document.getElementById("edit-winner-1-name");
  const win2Name = document.getElementById("edit-winner-2-name");
  const win3Name = document.getElementById("edit-winner-3-name");

  let evt;
  if (eventId) {
    evt = state.events.find(e => e.id === eventId);
    if (!evt) return;
    if (modalTitle) modalTitle.textContent = `Edit Event: ${evt.name}`;
    if (deleteBtn) deleteBtn.style.display = state.ui.organizerRole === "master" ? "inline-flex" : "none";
  } else {
    // New Event
    const defaultCat = state.ui.organizerCategoryId || state.categories[0]?.id || "tech";
    evt = createEmptyEvent(defaultCat);
    if (modalTitle) modalTitle.textContent = "Create New Event";
    if (deleteBtn) deleteBtn.style.display = "none";
  }

  // Populate Fields
  if (idInput) idInput.value = evt.id;
  if (nameInput) nameInput.value = evt.name || "";
  if (formatInput) formatInput.value = evt.format || "Solo";
  if (statusSelect) statusSelect.value = evt.status || "Upcoming";
  if (progressInput) progressInput.value = evt.progress ?? 0;
  if (progressBadge) progressBadge.textContent = `${evt.progress ?? 0}%`;
  if (roundInput) roundInput.value = evt.roundInfo || "";
  if (venueInput) venueInput.value = evt.venue || "";
  if (durationInput) durationInput.value = evt.duration || "";
  if (judgesInput) judgesInput.value = Array.isArray(evt.judges) ? evt.judges.join(", ") : "";

  // Dropdowns
  populateCategorySelect(evt.categoryId);
  populateSchoolWinnerSelects(
    evt.winners?.first?.schoolId,
    evt.winners?.second?.schoolId,
    evt.winners?.third?.schoolId
  );

  // Winner participant names
  if (win1Name) win1Name.value = evt.winners?.first?.participant || "";
  if (win2Name) win2Name.value = evt.winners?.second?.participant || "";
  if (win3Name) win3Name.value = evt.winners?.third?.participant || "";

  openModal("modal-event-editor");
}

/**
 * Handle Event Form Submission
 */
export function handleEventFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("edit-event-id")?.value;
  const name = document.getElementById("edit-event-name")?.value?.trim();
  const categoryId = document.getElementById("edit-event-category")?.value;
  const format = document.getElementById("edit-event-format")?.value?.trim() || "Solo";
  const status = document.getElementById("edit-event-status")?.value;
  const progress = parseInt(document.getElementById("edit-event-progress")?.value || "0", 10);
  const roundInfo = document.getElementById("edit-event-round")?.value?.trim() || "";
  const venue = document.getElementById("edit-event-venue")?.value?.trim() || "TBA";
  const duration = document.getElementById("edit-event-duration")?.value?.trim() || "";
  const judgesRaw = document.getElementById("edit-event-judges")?.value || "";
  const judges = judgesRaw.split(",").map(j => j.trim()).filter(Boolean);

  const win1School = document.getElementById("edit-winner-1-school")?.value || "";
  const win1Name = document.getElementById("edit-winner-1-name")?.value?.trim() || "";
  const win2School = document.getElementById("edit-winner-2-school")?.value || "";
  const win2Name = document.getElementById("edit-winner-2-name")?.value?.trim() || "";
  const win3School = document.getElementById("edit-winner-3-school")?.value || "";
  const win3Name = document.getElementById("edit-winner-3-name")?.value?.trim() || "";

  const eventPayload = {
    id: id || `evt-${Date.now()}`,
    name,
    categoryId,
    format,
    status,
    progress,
    roundInfo,
    venue,
    duration,
    judges,
    winners: {
      first: { schoolId: win1School, participant: win1Name },
      second: { schoolId: win2School, participant: win2Name },
      third: { schoolId: win3School, participant: win3Name }
    }
  };

  updateEvent(eventPayload);
  closeModal("modal-event-editor");
  showToast(`Event "${name}" updated successfully!`, "success");
}

/**
 * Delete Current Event
 */
export function handleDeleteCurrentEvent() {
  const id = document.getElementById("edit-event-id")?.value;
  if (!id) return;

  if (confirm("Are you sure you want to permanently delete this event?")) {
    deleteEvent(id);
    closeModal("modal-event-editor");
    showToast("Event deleted successfully", "success");
  }
}

/**
 * Open Schools & Point Rules Manager Modal (Master Admin Only)
 */
export function openSchoolsManager() {
  const state = getState();
  const rules = state.settings.pointRules || {};

  const rule1 = document.getElementById("rule-first");
  const rule2 = document.getElementById("rule-second");
  const rule3 = document.getElementById("rule-third");
  if (rule1) rule1.value = rules.firstPlace ?? 10;
  if (rule2) rule2.value = rules.secondPlace ?? 7;
  if (rule3) rule3.value = rules.thirdPlace ?? 5;

  renderSchoolsTable();
  openModal("modal-schools-manager");
}

/**
 * Render Schools Management Rows
 */
function renderSchoolsTable() {
  const state = getState();
  const tbody = document.getElementById("schools-tbody");
  if (!tbody) return;

  tbody.innerHTML = state.schools.map(s => `
    <tr data-school-id="${s.id}" style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 0.4rem 0.6rem;">
        <input type="text" class="form-input sch-name-input" value="${s.name}" style="padding: 0.25rem 0.4rem; font-size: 0.8rem;">
      </td>
      <td style="padding: 0.4rem 0.6rem;">
        <input type="text" class="form-input sch-code-input" value="${s.shortCode}" style="padding: 0.25rem 0.4rem; font-size: 0.8rem;">
      </td>
      <td style="padding: 0.4rem 0.6rem; text-align: center;">
        <input type="number" class="form-input sch-bonus-input" value="${s.bonusPoints || 0}" style="padding: 0.25rem 0.2rem; font-size: 0.8rem; text-align: center;">
      </td>
      <td style="padding: 0.4rem 0.6rem; text-align: center;">
        <input type="number" class="form-input sch-penalty-input" value="${s.penaltyPoints || 0}" style="padding: 0.25rem 0.2rem; font-size: 0.8rem; text-align: center;">
      </td>
      <td style="padding: 0.4rem 0.6rem; text-align: center;">
        <button class="delete-school-row-btn" data-del-school="${s.id}" style="color: #ef4444; font-size: 0.9rem;" title="Delete School">✕</button>
      </td>
    </tr>
  `).join("");
}

/**
 * Save School Rows & Point Rules
 */
export function saveSchoolRowsFromTable() {
  const rows = document.querySelectorAll("#schools-tbody tr");
  const schoolsList = [];

  rows.forEach(row => {
    const id = row.dataset.schoolId;
    const name = row.querySelector(".sch-name-input")?.value?.trim();
    const shortCode = row.querySelector(".sch-code-input")?.value?.trim()?.toUpperCase();
    const bonus = parseInt(row.querySelector(".sch-bonus-input")?.value || "0", 10);
    const penalty = parseInt(row.querySelector(".sch-penalty-input")?.value || "0", 10);

    if (name) {
      schoolsList.push({
        id,
        name,
        shortCode: shortCode || name.slice(0, 4).toUpperCase(),
        bonusPoints: bonus,
        penaltyPoints: penalty
      });
    }
  });

  updateSchools(schoolsList);
}

export function savePointRules() {
  const p1 = parseInt(document.getElementById("rule-first")?.value || "10", 10);
  const p2 = parseInt(document.getElementById("rule-second")?.value || "7", 10);
  const p3 = parseInt(document.getElementById("rule-third")?.value || "5", 10);

  updateSettings({
    pointRules: { firstPlace: p1, secondPlace: p2, thirdPlace: p3, participation: 0 }
  });
  saveSchoolRowsFromTable();
  showToast("Point rules & school records updated!", "success");
}

/**
 * Add a new school row
 */
export function addSchoolRow() {
  const state = getState();
  const newSchool = {
    id: `sch-${Date.now()}`,
    name: "New Participating School",
    shortCode: "NEW",
    bonusPoints: 0,
    penaltyPoints: 0
  };
  state.schools.push(newSchool);
  renderSchoolsTable();
}

/**
 * Delete a school row
 */
export function deleteSchoolRow(schoolId) {
  const state = getState();
  state.schools = state.schools.filter(s => s.id !== schoolId);
  renderSchoolsTable();
}

/**
 * Export Declared Winners to CSV for Certificate Printing
 */
export function exportWinnersCSV() {
  const state = getState();
  const declared = getEventsWithWinners();

  if (declared.length === 0) {
    showToast("No declared winners to export yet.", "info");
    return;
  }

  const schoolsMap = new Map(state.schools.map(s => [s.id, s]));
  const categoriesMap = new Map(state.categories.map(c => [c.id, c]));

  const headers = [
    "Event Name",
    "Category",
    "Format",
    "Venue",
    "1st Place Participant",
    "1st Place School",
    "2nd Place Participant",
    "2nd Place School",
    "3rd Place Participant",
    "3rd Place School",
    "Exported Date"
  ];

  const escapeCSV = val => `"${(val || "").toString().replace(/"/g, '""')}"`;

  const rows = declared.map(evt => {
    const cat = categoriesMap.get(evt.categoryId)?.name || evt.categoryId;
    const w1 = evt.winners?.first;
    const w2 = evt.winners?.second;
    const w3 = evt.winners?.third;

    const s1 = schoolsMap.get(w1?.schoolId)?.name || "";
    const s2 = schoolsMap.get(w2?.schoolId)?.name || "";
    const s3 = schoolsMap.get(w3?.schoolId)?.name || "";

    return [
      escapeCSV(evt.name),
      escapeCSV(cat),
      escapeCSV(evt.format || "Solo"),
      escapeCSV(evt.venue || "TBA"),
      escapeCSV(w1?.participant || ""),
      escapeCSV(s1),
      escapeCSV(w2?.participant || ""),
      escapeCSV(s2),
      escapeCSV(w3?.participant || ""),
      escapeCSV(s3),
      escapeCSV(new Date().toLocaleDateString())
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spectrum_fest_winners_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Winners CSV downloaded successfully!", "success");
}

/**
 * Setup Admin & Modal Event Listeners
 */
export function setupAdminListeners() {
  // Organizer Mode Toggle Button
  const orgBtn = document.getElementById("btn-organizer-toggle");
  if (orgBtn) {
    orgBtn.addEventListener("click", () => {
      const state = getState();
      if (state.ui.isOrganizer) {
        // Lock / Sign out
        updateUIState({
          isOrganizer: false,
          organizerRole: null,
          organizerCategoryId: null,
          organizerCategoryName: null
        });
        showToast("Organizer Mode Locked", "info");
        renderAll();
      } else {
        enteredPin = "";
        updatePinDisplay();
        const err = document.getElementById("pin-error-msg");
        if (err) err.textContent = "";
        openModal("modal-pin");
      }
    });
  }

  // PIN Keypad clicks
  const keypad = document.querySelector(".pin-keypad");
  if (keypad) {
    keypad.addEventListener("click", e => {
      const btn = e.target.closest(".pin-key");
      if (!btn) return;
      const num = btn.dataset.num;
      const act = btn.dataset.action;
      handlePinKey(num, act);
    });
  }

  // Close Modal Buttons
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.closeModal;
      if (modalId) closeModal(modalId);
    });
  });

  // Modal Backdrop Click to Close
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Add Event Button
  const addBtn = document.getElementById("btn-add-event");
  if (addBtn) {
    addBtn.addEventListener("click", () => openEventEditor(null));
  }

  // Manage Schools Button
  const manageSchoolsBtn = document.getElementById("btn-manage-schools");
  if (manageSchoolsBtn) {
    manageSchoolsBtn.addEventListener("click", openSchoolsManager);
  }

  // Status auto-fill for progress slider
  const statusSelect = document.getElementById("edit-event-status");
  const progressInput = document.getElementById("edit-event-progress");
  const progressBadge = document.getElementById("edit-progress-badge");

  if (statusSelect && progressInput && progressBadge) {
    statusSelect.addEventListener("change", () => {
      const suggested = getSuggestedProgress(statusSelect.value);
      progressInput.value = suggested;
      progressBadge.textContent = `${suggested}%`;
    });

    progressInput.addEventListener("input", () => {
      progressBadge.textContent = `${progressInput.value}%`;
    });
  }

  // Event Form Submit
  const eventForm = document.getElementById("form-event-editor");
  if (eventForm) {
    eventForm.addEventListener("submit", handleEventFormSubmit);
  }

  // Delete Event Button
  const deleteBtn = document.getElementById("btn-delete-event");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleDeleteCurrentEvent);
  }

  // Save Point Rules Button
  const saveRulesBtn = document.getElementById("btn-save-point-rules");
  if (saveRulesBtn) {
    saveRulesBtn.addEventListener("click", savePointRules);
  }

  // Add School Row Button
  const addSchoolBtn = document.getElementById("btn-add-school-row");
  if (addSchoolBtn) {
    addSchoolBtn.addEventListener("click", addSchoolRow);
  }

  // Delegated Delete School Row Click
  const schoolsTbody = document.getElementById("schools-tbody");
  if (schoolsTbody) {
    schoolsTbody.addEventListener("click", e => {
      const delBtn = e.target.closest(".delete-school-row-btn");
      if (delBtn) {
        deleteSchoolRow(delBtn.dataset.delSchool);
      }
    });
  }

  // Export Winners CSV Button
  const exportBtn = document.getElementById("btn-export-winners-csv");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportWinnersCSV);
  }
}
