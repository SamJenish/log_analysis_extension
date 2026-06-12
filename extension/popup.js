// Popup Script - UI for the extension popup
// Shows results, authentication, and history

const analyzeForm = document.getElementById("analyze-form");
const logInput = document.getElementById("log-input");
const resultCard = document.getElementById("result-card");
const resultOutput = document.getElementById("result-output");
const authSection = document.getElementById("auth-section");
const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");

// Check authentication on load
document.addEventListener("DOMContentLoaded", async () => {
  await checkAndUpdateAuth();
});

// Check authentication status
async function checkAndUpdateAuth() {
  chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (response) => {
    if (response && response.authenticated) {
      if (authSection) authSection.style.display = "none";
    } else {
      if (authSection) authSection.style.display = "block";
    }
  });
}

// Handle analyze form submission
analyzeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const log = logInput?.value || "";

  if (!log.trim()) {
    alert("Please paste a log");
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: "EXPLAIN_ERROR",
      errorText: log,
    },
    (response) => {
      if (!response) {
        alert("Error: No response from service worker");
        return;
      }

      if (!response.success) {
        if (response.error === "NOT_AUTHENTICATED") {
          alert("Please log in first. Click the Settings button to configure.");
        } else {
          alert(`Error: ${response.error || response.message}`);
        }
        return;
      }

      // Display result
      if (resultCard && resultOutput) {
        const analysis = response.analysis;
        const analysisText =
          typeof analysis === "string"
            ? analysis
            : JSON.stringify(analysis, null, 2);

        const sourceLabel =
          response.source === "cache_exact"
            ? "⚡ Cached (Exact)"
            : response.source === "cache_fuzzy"
              ? `⚡ Cached (${response.similarity}%)`
              : "🌐 Fresh Analysis";

        resultOutput.innerHTML = `<strong>${sourceLabel}</strong>\n\n${analysisText}`;
        resultCard.classList.remove("hidden");
      }
    }
  );
});

// Load history
async function loadHistory() {
  chrome.runtime.sendMessage(
    { type: "GET_HISTORY", page: 1, limit: 20 },
    (response) => {
      if (!response || !response.success) {
        if (historyList) {
          historyList.innerHTML =
            '<p style="color: #999;">Failed to load history. Please log in.</p>';
        }
        return;
      }

      if (!historyList) return;

      const entries = response.history?.data || [];

      if (entries.length === 0) {
        historyList.innerHTML = "<p style=\"color: #999;\">No history yet</p>";
        return;
      }

      historyList.innerHTML = entries
        .map(
          (entry) => `
        <div style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">
          <strong>${escapeHtml(entry.logInput.substring(0, 50))}...</strong>
          <br>
          <small style="color: #999;">${new Date(entry.createdAt).toLocaleDateString()}</small>
        </div>
      `
        )
        .join("");
    }
  );
}

// Helper to escape HTML
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Settings button
const settingsBtn = document.getElementById("settings-btn");
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

// History button
const historyBtn = document.getElementById("history-btn");
if (historyBtn) {
  historyBtn.addEventListener("click", () => {
    if (historySection) {
      historySection.classList.toggle("hidden");
      if (!historySection.classList.contains("hidden")) {
        loadHistory();
      }
    }
  });
}

// Login button (if present - actual OAuth handled in options page)
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

