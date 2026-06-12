# Browser Extension

This folder contains a simple browser extension version of the Log Failure Analyzer.

## How to load the extension

1. Open Chrome, Edge, or Firefox.
2. Navigate to the browser's extensions page.
   - Chrome/Edge: `chrome://extensions`
   - Firefox: `about:debugging#/runtime/this-firefox`
3. Enable developer mode.
4. Click "Load unpacked" and select the `extension/` folder.

## Usage

- Click the extension icon to open the popup, or select error text directly in a CI/CD pipeline page.
- If you select an error on a page, a small "Explain selection" button will appear near the highlighted text.
- Click the button to show a detailed explanation in a right-side panel.

## Notes

- This extension runs entirely in the browser.
- It uses local analysis patterns and does not require server access.
- The right-side explanation panel is designed for selected CI/CD error text and provides a longer analysis summary.
