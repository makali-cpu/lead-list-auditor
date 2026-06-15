import { auditRows, parseCsv, toCsv } from "./auditor.js";

const fileInput = document.querySelector("#csv-file");
const dropZone = document.querySelector("#drop-zone");
const sampleButton = document.querySelector("#load-sample");
const exportButton = document.querySelector("#export-clean");
const keywordInput = document.querySelector("#blocked-keywords");
const summary = document.querySelector("#summary");
const results = document.querySelector("#results");
let currentRows = [];
let auditedRows = [];

function runAudit(rows) {
  currentRows = rows;
  auditedRows = auditRows(rows, {
    blockedKeywords: keywordInput.value.split(",")
  });
  render();
}

function render() {
  const ready = auditedRows.filter((row) => row.status === "ready").length;
  const review = auditedRows.length - ready;
  summary.hidden = false;
  summary.innerHTML = `
    <article><strong>${auditedRows.length}</strong><span>Total rows</span></article>
    <article class="good"><strong>${ready}</strong><span>Ready</span></article>
    <article class="warn"><strong>${review}</strong><span>Needs review</span></article>
  `;
  exportButton.disabled = ready === 0;

  results.innerHTML = auditedRows.map((row) => {
    const values = Object.values(row.data);
    const company = values[0] || "(no company)";
    const issues = row.issues.length
      ? row.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")
      : "<li>No issues detected</li>";
    return `
      <article class="result ${row.status}">
        <div><span class="badge">Row ${row.rowNumber}</span><h3>${escapeHtml(company)}</h3></div>
        <ul>${issues}</ul>
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  })[char]);
}

async function loadFile(file) {
  if (!file) return;
  runAudit(parseCsv(await file.text()));
}

fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
keywordInput.addEventListener("change", () => currentRows.length && runAudit(currentRows));
sampleButton.addEventListener("click", async () => {
  const response = await fetch("sample-leads.csv");
  runAudit(parseCsv(await response.text()));
});
exportButton.addEventListener("click", () => {
  const cleanRows = auditedRows.filter((row) => row.status === "ready").map((row) => row.data);
  const blob = new Blob(["\uFEFF", toCsv(cleanRows)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "clean-leads.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
}
dropZone.addEventListener("drop", (event) => loadFile(event.dataTransfer.files[0]));
