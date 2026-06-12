// Content Script - Runs in the web page context
// Detects text selection and shows floating button

const FLOAT_BTN_ID = "log-analyzer-float-btn";
const MIN_SELECTION_LENGTH = 10;

// Create floating button element
function createFloatingButton() {
  if (document.getElementById(FLOAT_BTN_ID)) {
    return document.getElementById(FLOAT_BTN_ID);
  }

  const button = document.createElement("button");
  button.id = FLOAT_BTN_ID;
  button.innerHTML = "⚡ Explain";
  button.style.cssText = `
    position: fixed;
    z-index: 999999;
    padding: 6px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    display: none;
  `;

  button.addEventListener("click", handleExplainClick);
  button.addEventListener("mouseenter", () => {
    button.style.transform = "scale(1.05)";
    button.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "scale(1)";
    button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  });

  document.body.appendChild(button);
  return button;
}

// Handle explain button click
function handleExplainClick(event) {
  event.preventDefault();
  event.stopPropagation();

  const selectedText = window.getSelection().toString().trim();
  if (!selectedText) {
    alert("No text selected");
    return;
  }

  // Send message to service worker to explain the error
  chrome.runtime.sendMessage(
    {
      type: "EXPLAIN_ERROR",
      errorText: selectedText,
    },
    (response) => {
      if (!response) {
        alert("Extension error: No response from service worker");
        return;
      }

      if (!response.success) {
        if (response.error === "NOT_AUTHENTICATED") {
          alert(
            "Please log in to the extension first. Click the extension icon to open settings."
          );
        } else {
          alert(`Error: ${response.error || response.message}`);
        }
        return;
      }

      // Display the analysis result
      showAnalysisPopup(selectedText, response);
    }
  );
}

// Show analysis result popup
function showAnalysisPopup(selectedText, response) {
  // Remove existing popup if any
  const existingPopup = document.getElementById("log-analyzer-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "log-analyzer-popup";
  popup.style.cssText = `
    position: fixed;
    z-index: 999998;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    max-height: 70vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const sourceLabel =
    response.source === "cache_exact"
      ? "⚡ Cached (Exact Match)"
      : response.source === "cache_fuzzy"
        ? `⚡ Cached (${response.similarity}% Similar)`
        : "🌐 Fresh Analysis";

  const analysis = response.analysis;
  const analysisText =
    typeof analysis === "string" ? analysis : JSON.stringify(analysis, null, 2);

  popup.innerHTML = `
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; color: #333;">Error Analysis</h2>
        <button id="close-popup" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
      </div>
      
      <div style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px; font-size: 12px; color: #666;">
        ${sourceLabel}
      </div>

      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Selected Text</h3>
        <pre style="margin: 0; background: #f8f8f8; padding: 12px; border-radius: 4px; font-size: 12px; color: #333; overflow-x: auto; border-left: 3px solid #667eea;">${escapeHtml(selectedText)}</pre>
      </div>

      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Explanation</h3>
        <pre style="margin: 0; background: #f8f8f8; padding: 12px; border-radius: 4px; font-size: 12px; color: #333; overflow-x: auto; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(analysisText)}</pre>
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="copy-btn" style="flex: 1; padding: 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Copy Explanation</button>
        <button id="close-popup-alt" style="flex: 1; padding: 10px; background: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Setup button handlers
  document.getElementById("close-popup").addEventListener("click", () => {
    popup.remove();
  });

  document.getElementById("close-popup-alt").addEventListener("click", () => {
    popup.remove();
  });

  document.getElementById("copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(analysisText).then(() => {
      alert("Explanation copied to clipboard!");
      popup.remove();
    });
  });

  // Close popup when clicking outside
  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });
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

// Listen for text selection
document.addEventListener("mouseup", () => {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length >= MIN_SELECTION_LENGTH) {
    const button = createFloatingButton();
    const selection = window.getSelection();

    if (selection.rangeCount === 0) {
      button.style.display = "none";
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position button near the selection
    button.style.top = Math.max(rect.top + window.scrollY - 40, 10) + "px";
    button.style.left =
      Math.max(rect.left + window.scrollX + rect.width / 2 - 40, 10) + "px";
    button.style.display = "block";
  } else {
    const button = document.getElementById(FLOAT_BTN_ID);
    if (button) {
      button.style.display = "none";
    }
  }
});

// Hide button when clicking elsewhere
document.addEventListener("mousedown", (e) => {
  const button = document.getElementById(FLOAT_BTN_ID);
  const popup = document.getElementById("log-analyzer-popup");

  if (
    button &&
    !button.contains(e.target) &&
    (!popup || !popup.contains(e.target))
  ) {
    button.style.display = "none";
  }
});

console.log("LogAnalyzer content script loaded");

    }

    showSidebar(selectedText, `${result.title}\n\n${result.details}`);
  });

  document.body.appendChild(button);
  return button;
}

function getPageSelection() {
  const selection = window.getSelection();
  if (!selection) {
    return "";
  }

  return selection.toString().trim();
}

function showFloatingButton(rect) {
  const button = document.getElementById(FLOAT_ID);
  if (!button) {
    return;
  }

  button.style.top = `${Math.min(window.innerHeight - 52, rect.bottom + 10)}px`;
  button.style.left = `${Math.min(window.innerWidth - 240, rect.right + 10)}px`;
  button.classList.remove("hidden");
}

function hideFloatingButton() {
  const button = document.getElementById(FLOAT_ID);
  button?.classList.add("hidden");
}

function showSidebar(selectedText, content) {
  const sidebar = document.getElementById(SIDEBAR_ID) || createSidebar();
  const selectionDisplay = sidebar.querySelector("#analyzer-selection");
  const output = sidebar.querySelector("#analyzer-output");

  if (selectionDisplay) {
    selectionDisplay.textContent = selectedText;
  }

  if (output) {
    output.textContent = content;
  }

  sidebar.classList.remove("hidden");
}

function onSelectionChange(event) {
  const selectedText = getPageSelection();
  const button = document.getElementById(FLOAT_ID);

  if (!button) {
    return;
  }

  if (!selectedText || selectedText.length < 10) {
    hideFloatingButton();
    return;
  }

  const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) {
    hideFloatingButton();
    return;
  }

  showFloatingButton(rect);
}

function init() {
  if (document.getElementById(SIDEBAR_ID)) {
    return;
  }

  createSidebar();
  createFloatingButton();

  document.addEventListener("mouseup", onSelectionChange);
  document.addEventListener("keyup", onSelectionChange);
  document.addEventListener("scroll", hideFloatingButton, true);
}

init();
