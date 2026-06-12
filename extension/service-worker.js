// Service Worker - The brain of the extension
// Handles API calls, caching, and message routing

const CACHE_DB_NAME = "LogAnalyzerCache";
const CACHE_STORE_NAME = "analyses";
const CONFIG_STORE_NAME = "config";
const CACHE_EXPIRY_HOURS = 24;
const BACKEND_URL = "http://localhost:3000"; // Will be configurable in options

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        const store = db.createObjectStore(CACHE_STORE_NAME, { keyPath: "hash" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      if (!db.objectStoreNames.contains(CONFIG_STORE_NAME)) {
        db.createObjectStore(CONFIG_STORE_NAME);
      }
    };
  });
}

// Simple hash function for error text
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Calculate similarity between two strings (0-100)
function calculateSimilarity(text1, text2) {
  const len1 = text1.length;
  const len2 = text2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 100;

  // Levenshtein distance approach
  const dp = Array(len2 + 1)
    .fill(0)
    .map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[0][i] = i;
  for (let j = 0; j <= len2; j++) dp[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
      dp[j][i] = Math.min(
        dp[j][i - 1] + 1,
        dp[j - 1][i] + 1,
        dp[j - 1][i - 1] + cost
      );
    }
  }

  const distance = dp[len2][len1];
  const similarity = ((maxLen - distance) / maxLen) * 100;
  return Math.round(similarity);
}

// Check cache for exact or similar match
async function getCachedAnalysis(errorText, similarityThreshold = 75) {
  const db = await initDB();
  const hash = hashText(errorText);

  return new Promise((resolve) => {
    const transaction = db.transaction([CACHE_STORE_NAME], "readonly");
    const store = transaction.objectStore(CACHE_STORE_NAME);

    // Try exact match first
    const exactRequest = store.get(hash);
    exactRequest.onsuccess = () => {
      const cached = exactRequest.result;
      if (cached) {
        const now = Date.now();
        const age = (now - cached.timestamp) / (1000 * 60 * 60); // hours

        if (age < CACHE_EXPIRY_HOURS) {
          resolve({
            found: true,
            exact: true,
            analysis: cached.analysis,
            cached_text: cached.errorText,
          });
          return;
        }
      }

      // No exact match, try fuzzy match
      const indexRequest = store.index("timestamp").getAll();
      indexRequest.onsuccess = () => {
        const entries = indexRequest.result;
        let bestMatch = null;
        let bestSimilarity = 0;

        for (const entry of entries) {
          const similarity = calculateSimilarity(errorText, entry.errorText);
          if (similarity > bestSimilarity && similarity >= similarityThreshold) {
            bestSimilarity = similarity;
            bestMatch = entry;
          }
        }

        if (bestMatch) {
          const now = Date.now();
          const age = (now - bestMatch.timestamp) / (1000 * 60 * 60);

          if (age < CACHE_EXPIRY_HOURS) {
            resolve({
              found: true,
              exact: false,
              similarity: bestSimilarity,
              analysis: bestMatch.analysis,
              cached_text: bestMatch.errorText,
            });
            return;
          }
        }

        resolve({ found: false });
      };
    };
  });
}

// Store analysis in cache
async function cacheAnalysis(errorText, analysis) {
  const db = await initDB();
  const hash = hashText(errorText);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], "readwrite");
    const store = transaction.objectStore(CACHE_STORE_NAME);

    const request = store.put({
      hash,
      errorText,
      analysis,
      timestamp: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get stored token
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken"], (result) => {
      resolve(result.authToken || null);
    });
  });
}

// Store token
async function setAuthToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ authToken: token }, resolve);
  });
}

// Get backend URL from config
async function getBackendURL() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["backendURL"], (result) => {
      resolve(result.backendURL || BACKEND_URL);
    });
  });
}

// Call backend API
async function callAnalyzeAPI(errorText, token) {
  const backendURL = await getBackendURL();
  const response = await fetch(`${backendURL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ log: errorText }),
  });

  if (!response.ok) {
    throw new Error(
      `API error: ${response.status} - ${response.statusText}`
    );
  }

  return response.json();
}

// Get history from backend
async function getHistoryAPI(token, page = 1, limit = 20) {
  const backendURL = await getBackendURL();
  const response = await fetch(
    `${backendURL}/api/history?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `API error: ${response.status} - ${response.statusText}`
    );
  }

  return response.json();
}

// Check if user is authenticated
async function checkAuth() {
  const token = await getAuthToken();
  if (!token) {
    return { authenticated: false };
  }

  // TODO: Validate token with backend /api/auth/session
  return { authenticated: true, token };
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "EXPLAIN_ERROR") {
        const { errorText } = message;

        // Check cache first
        const cached = await getCachedAnalysis(errorText);
        if (cached.found) {
          sendResponse({
            success: true,
            source: cached.exact ? "cache_exact" : "cache_fuzzy",
            analysis: cached.analysis,
            cached_text: cached.cached_text,
            similarity: cached.similarity,
          });
          return;
        }

        // Check authentication
        const auth = await checkAuth();
        if (!auth.authenticated) {
          sendResponse({
            success: false,
            error: "NOT_AUTHENTICATED",
            message: "Please log in first",
          });
          return;
        }

        // Call backend API
        const result = await callAnalyzeAPI(errorText, auth.token);

        // Cache the result
        await cacheAnalysis(errorText, result);

        sendResponse({
          success: true,
          source: "api",
          analysis: result,
        });
      } else if (message.type === "GET_HISTORY") {
        const auth = await checkAuth();
        if (!auth.authenticated) {
          sendResponse({
            success: false,
            error: "NOT_AUTHENTICATED",
          });
          return;
        }

        const { page = 1, limit = 20 } = message;
        const history = await getHistoryAPI(auth.token, page, limit);

        sendResponse({
          success: true,
          history,
        });
      } else if (message.type === "CHECK_AUTH") {
        const auth = await checkAuth();
        sendResponse(auth);
      } else if (message.type === "SET_AUTH_TOKEN") {
        const { token } = message;
        await setAuthToken(token);
        sendResponse({ success: true });
      } else if (message.type === "CLEAR_AUTH") {
        await setAuthToken(null);
        sendResponse({ success: true });
      } else if (message.type === "GET_CONFIG") {
        const backendURL = await getBackendURL();
        sendResponse({ backendURL });
      } else if (message.type === "SET_CONFIG") {
        const { backendURL } = message;
        chrome.storage.local.set({ backendURL }, () => {
          sendResponse({ success: true });
        });
      }
    } catch (error) {
      console.error("Service worker error:", error);
      sendResponse({
        success: false,
        error: error.message || "Unknown error",
      });
    }
  })();

  // Return true to indicate we'll send a response asynchronously
  return true;
});
