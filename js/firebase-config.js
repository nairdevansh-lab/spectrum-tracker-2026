/**
 * SPECTRUM TRACKER — Lightweight Firestore REST API v1 Client
 *
 * - ZERO external gstatic.com WebChannel SDKs (no stream hangs or reload locks)
 * - Native fetch() with strict 5-second AbortController timeouts
 * - Transparent JS Object <-> Firestore Document format serialization
 * - Graceful fallback to offline/cached mode
 */

export const FIREBASE_CONFIG = {
  // Replace with your actual Firebase Project ID from console.firebase.google.com
  projectId: "spectrum-tracker-2026",

  // Set to true once your Firebase project + Firestore database + rules are set up
  enabled: true,

  // REST API Timeout in milliseconds
  timeoutMs: 5000
};

const BASE_URL = () =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

function toFirestoreValue(val) {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(typedVal) {
  if (!typedVal) return null;
  if ("stringValue" in typedVal) return typedVal.stringValue;
  if ("integerValue" in typedVal) return parseInt(typedVal.integerValue, 10);
  if ("doubleValue" in typedVal) return parseFloat(typedVal.doubleValue);
  if ("booleanValue" in typedVal) return typedVal.booleanValue;
  if ("nullValue" in typedVal) return null;
  if ("arrayValue" in typedVal) {
    const arr = typedVal.arrayValue.values || [];
    return arr.map(fromFirestoreValue);
  }
  if ("mapValue" in typedVal) {
    const obj = {};
    const fields = typedVal.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function toFirestoreDocument(data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (k !== "id") {
      fields[k] = toFirestoreValue(v);
    }
  }
  return { fields };
}

function fromFirestoreDocument(rawDoc) {
  const obj = {};
  if (rawDoc.name) {
    const segments = rawDoc.name.split("/");
    obj.id = segments[segments.length - 1];
  }
  if (rawDoc.fields) {
    for (const [k, v] of Object.entries(rawDoc.fields)) {
      obj[k] = fromFirestoreValue(v);
    }
  }
  return obj;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FIREBASE_CONFIG.timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const FirestoreClient = {
  isConfigured() {
    return Boolean(
      FIREBASE_CONFIG.enabled &&
      typeof FIREBASE_CONFIG.projectId === "string" &&
      FIREBASE_CONFIG.projectId.trim() !== ""
    );
  },

  async checkConnection() {
    if (!this.isConfigured()) {
      return { ok: false, offline: true, message: "Firebase not configured (Local Cache Mode)" };
    }
    try {
      const url = `${BASE_URL()}/fest_settings?pageSize=1`;
      const res = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, 3000);
      if (res.ok) {
        return { ok: true, message: "Live Sync Active" };
      }
      return { ok: false, status: res.status, message: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, offline: true, message: err.name === "AbortError" ? "Network timeout" : err.message };
    }
  },

  async getCollection(collectionName) {
    if (!this.isConfigured()) {
      return { ok: false, offline: true, data: [] };
    }

    try {
      const url = `${BASE_URL()}/${collectionName}?pageSize=100`;
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });

      if (!res.ok) {
        return { ok: false, status: res.status, error: `Error ${res.status}: ${res.statusText}`, data: [] };
      }

      const json = await res.json();
      const documents = json.documents || [];
      const data = documents.map(fromFirestoreDocument);
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        offline: true,
        error: err.name === "AbortError" ? "Request timed out (5s)" : err.message,
        data: []
      };
    }
  },

  async saveDocument(collectionName, docId, data) {
    if (!this.isConfigured()) {
      return { ok: false, offline: true, data };
    }

    try {
      const url = `${BASE_URL()}/${collectionName}/${docId}`;
      const payload = toFirestoreDocument(data);

      const res = await fetchWithTimeout(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { ok: false, status: res.status, error: errorText };
      }

      const updated = await res.json();
      return { ok: true, data: fromFirestoreDocument(updated) };
    } catch (err) {
      return {
        ok: false,
        offline: true,
        error: err.name === "AbortError" ? "Save timed out (5s)" : err.message
      };
    }
  },

  async deleteDocument(collectionName, docId) {
    if (!this.isConfigured()) {
      return { ok: false, offline: true };
    }

    try {
      const url = `${BASE_URL()}/${collectionName}/${docId}`;
      const res = await fetchWithTimeout(url, { method: "DELETE" });
      return { ok: res.ok };
    } catch (err) {
      return { ok: false, offline: true, error: err.message };
    }
  }
};
