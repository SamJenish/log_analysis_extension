// Options Page Script
// Handles authentication and configuration

const backendUrlInput = document.getElementById("backend-url");
const saveConfigBtn = document.getElementById("save-config-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authBadge = document.getElementById("auth-badge");
const userInfoDiv = document.getElementById("user-info");
const userNameSpan = document.getElementById("user-name");
const userEmailSpan = document.getElementById("user-email");
const messageContainer = document.getElementById("message-container");

// Load configuration on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await checkAuthentication();
  setupMessageListener();
});

// Listen for messages from login callback window
function setupMessageListener() {
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return; // Ignore messages from other origins
    }

    if (event.data.type === "AUTH_TOKEN") {
      const { token, user } = event.data;

      if (token) {
        // Store the token
        chrome.runtime.sendMessage(
          {
            type: "SET_AUTH_TOKEN",
            token: token,
          },
          (response) => {
            if (response && response.success) {
              showMessage("Authentication successful!", "success");
              setTimeout(() => {
                checkAuthentication();
              }, 500);
            }
          }
        );
      }
    }
  });
}

// Load configuration
async function loadConfig() {
  chrome.storage.local.get(["backendURL"], (result) => {
    if (result.backendURL) {
      backendUrlInput.value = result.backendURL;
    }
  });
}

// Check authentication status
async function checkAuthentication() {
  chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (response) => {
    if (response && response.authenticated) {
      updateAuthUI(true);
    } else {
      updateAuthUI(false);
    }
  });
}

// Update authentication UI
function updateAuthUI(authenticated) {
  if (authenticated) {
    authBadge.textContent = "✓ Authenticated";
    authBadge.className = "status-badge authenticated";
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    authBadge.textContent = "Not Authenticated";
    authBadge.className = "status-badge not-authenticated";
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userInfoDiv.classList.add("hidden");
  }
}

// Save configuration
saveConfigBtn.addEventListener("click", () => {
  const backendURL = backendUrlInput.value.trim();

  if (backendURL && !isValidURL(backendURL)) {
    showMessage("Invalid URL format", "error");
    return;
  }

  chrome.storage.local.set({ backendURL: backendURL || "" }, () => {
    showMessage("Configuration saved successfully", "success");
  });
});

// Validate URL format
function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Login with GitHub
loginBtn.addEventListener("click", async () => {
  try {
    const backendURL = backendUrlInput.value.trim() || "http://localhost:3000";

    // Step 1: Open web app login page
    const loginUrl = `${backendURL}/api/auth/signin/github?callbackUrl=${encodeURIComponent(
      `${backendURL}/extension-auth-callback`
    )}`;

    const tab = await chrome.tabs.create({ url: loginUrl });

    showMessage(
      "GitHub login tab opened. Please complete the login flow.",
      "info"
    );

    // Step 2: Wait for message from the callback
    const messageListener = (message, sender) => {
      if (
        message.type === "AUTH_COMPLETE" &&
        sender.tab &&
        sender.tab.id === tab.id
      ) {
        chrome.runtime.onMessage.removeListener(messageListener);

        // Step 3: Call /api/auth/token to get JWT token
        getTokenFromBackend(backendURL, tab.id);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
  } catch (error) {
    console.error("Login error:", error);
    showMessage(`Login error: ${error.message}`, "error");
  }
});

// Get JWT token from backend after successful GitHub OAuth
async function getTokenFromBackend(backendURL, tabId) {
  try {
    // Execute script in the tab to get the token
    chrome.tabs.executeScript(
      tabId,
      {
        code: `
        fetch('${backendURL}/api/auth/token')
          .then(r => r.json())
          .then(data => {
            if (data.token) {
              chrome.runtime.sendMessage({
                type: "SET_AUTH_TOKEN_DIRECT",
                token: data.token
              });
            }
          })
          .catch(err => console.error('Token fetch error:', err));
      `,
      },
      (results) => {
        // Close the login tab
        chrome.tabs.remove(tabId);
      }
    );
  } catch (error) {
    console.error("Token fetch error:", error);
    showMessage("Failed to retrieve token. Please try again.", "error");
  }
}

// Listen for token from callback
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_AUTH_TOKEN_DIRECT") {
    chrome.runtime.sendMessage(
      {
        type: "SET_AUTH_TOKEN",
        token: message.token,
      },
      (response) => {
        if (response && response.success) {
          showMessage("Authentication successful!", "success");
          setTimeout(() => {
            checkAuthentication();
          }, 500);
        }
      }
    );
    sendResponse({ success: true });
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to log out?")) {
    chrome.runtime.sendMessage({ type: "CLEAR_AUTH" }, (response) => {
      if (response && response.success) {
        showMessage("Logged out successfully", "success");
        updateAuthUI(false);
      }
    });
  }
});

// Show message
function showMessage(text, type = "info") {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;

  messageContainer.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.remove();
  }, 4000);
}
