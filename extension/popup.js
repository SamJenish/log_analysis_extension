import { analyzeLog } from "./analysis.js";

const form = document.getElementById("analyze-form");
const logInput = document.getElementById("log-input");
const resultCard = document.getElementById("result-card");
const resultOutput = document.getElementById("result-output");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const log = logInput?.value || "";
  const result = analyzeLog(log);

  if (resultCard && resultOutput) {
    resultOutput.textContent = `${result.title}\n\n${result.details}`;
    resultCard.classList.remove("hidden");
  }
});
