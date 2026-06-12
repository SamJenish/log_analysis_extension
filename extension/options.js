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
});

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
    // TODO: Fetch and display user info
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
    // Get the backend URL
    const backendURL = backendUrlInput.value.trim() || "http://localhost:3000";

    // Open the login page in a new tab
    const loginUrl = `${backendURL}/api/auth/signin/github?callbackUrl=${encodeURIComponent(
      chrome.runtime.getURL("login-callback.html")
    )}`;

    chrome.tabs.create({ url: loginUrl }, (tab) => {
      showMessage(
        "Redirecting to GitHub login... Please complete the authentication.",
        "info"
      );

      // Listen for message from login callback
      const messageListener = (message, sender) => {
        if (message.type === "AUTH_TOKEN") {
          chrome.runtime.onMessage.removeListener(messageListener);

          // Store the token
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

                // Close the login tab
                chrome.tabs.remove(tab.id);
              }
            }
          );
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
    });
  } catch (error) {
    console.error("Login error:", error);
    showMessage(`Login error: ${error.message}`, "error");
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
