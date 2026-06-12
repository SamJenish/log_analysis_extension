const SIDEBAR_ID = "log-failure-analyzer-sidebar";
const FLOAT_ID = "log-failure-analyzer-float-button";

function createSidebar() {
  const sidebar = document.createElement("aside");
  sidebar.id = SIDEBAR_ID;
  sidebar.className = "log-failure-analyzer-sidebar hidden";
  sidebar.innerHTML = `
    <div class="analyzer-header">
      <div>
        <h2>Log Failure Analyzer</h2>
        <p>Selected error explanation</p>
      </div>
      <button id="analyzer-close" aria-label="Close analyzer">×</button>
    </div>
    <div class="analyzer-body">
      <div class="selection-preview">
        <strong>Selected text</strong>
        <pre id="analyzer-selection"></pre>
      </div>
      <div class="analysis-result">
        <strong>Explanation</strong>
        <pre id="analyzer-output"></pre>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);
  const closeButton = sidebar.querySelector("#analyzer-close");
  closeButton?.addEventListener("click", () => {
    sidebar.classList.add("hidden");
  });
  return sidebar;
}

function createFloatingButton() {
  const button = document.createElement("button");
  button.id = FLOAT_ID;
  button.textContent = "Explain selection";
  button.className = "log-failure-analyzer-float-button hidden";
  button.type = "button";
  button.addEventListener("click", () => {
    const selectedText = getPageSelection();
    if (!selectedText) {
      return;
    }

    const result = window.LogFailureAnalyzer?.analyzeSelection(selectedText);
    if (!result) {
      return;
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
