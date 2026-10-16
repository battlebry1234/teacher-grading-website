
"use strict";

const $ = (id) => document.getElementById(id);
const HISTORY_KEY = "gn-history-v4";
const NOTES_KEY = "gn-notes-v4";
const THEME_KEY = "gn-theme-v4";

let currentReport = null;
let grading = false;
let toastTimer;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    toast("Browser storage is full. Some data could not be saved.");
  }
}

function showPage(name) {
  const page = document.querySelector(`[data-page-panel="${name}"]`);
  if (!page) return;

  document.querySelectorAll("[data-page-panel]").forEach((el) => {
    el.hidden = el !== page;
    el.classList.toggle("active", el === page);
  });

  document.querySelectorAll(".nav-item[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  const titles = {
    dashboard: "Dashboard",
    grader: "AI Grader",
    history: "Grading history",
    settings: "Settings"
  };

  $("pageTitle").textContent = titles[name] || "GradeNova";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initializeNavigation() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(button.dataset.page);
    });
  });

  document.querySelectorAll("[data-open-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.openPage));
  });
}

function setTheme(theme) {
  const allowed = ["dark", "light", "ocean", "forest"];
  const selected = allowed.includes(theme) ? theme : "dark";
  document.documentElement.dataset.theme = selected;
  $("themeSelect").value = selected;
  localStorage.setItem(THEME_KEY, selected);
}

function initializeTheme() {
  setTheme(localStorage.getItem(THEME_KEY) || "dark");
  $("themeSelect").addEventListener("change", (event) => {
    setTheme(event.target.value);
  });
  $("themeToggle").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    setTheme(current === "light" ? "dark" : "light");
  });
}

async function checkConnection() {
  const label = $("connectionLabel");
  const detail = $("connectionDetail");

  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const result = await response.json();

    if (!response.ok || !result.ok) throw new Error(result.error || "Not ready");

    label.textContent = result.apiConfigured ? "AI ready" : "API key needed";
    detail.textContent = result.apiConfigured
      ? "Backend connected"
      : "Set GEMINI_API_KEY";
    label.style.color = result.apiConfigured ? "var(--good)" : "var(--bad)";
  } catch {
    label.textContent = "Server unavailable";
    detail.textContent = "Start server.py and reload";
    label.style.color = "var(--bad)";
  }
}

function buildPrompt() {
  const questions = $("testInput").value.trim();
  const answers = $("answersInput").value.trim();

  if (!questions) throw new Error("Enter the test questions first.");
  if (!answers) throw new Error("Enter the student's answers first.");

  const notes = readList(NOTES_KEY).slice(0, 20).map((n, i) =>
    `${i + 1}. Question: ${n.question}\nExpected: ${n.answer}\nExplanation: ${n.explanation}`
  ).join("\n\n");

  return JSON.stringify({
    task: "Grade a student's test.",
    title: $("testTitle").value.trim() || "Untitled test",
    gradeLevel: $("gradeLevel").value,
    gradingStyle: $("gradingStyle").value,
    pointsPerQuestion: Number($("pointsPerQuestion").value) || 1,
    questions,
    studentAnswers: answers,
    answerKey: $("answerKey").value.trim() || null,
    useWebSearch: $("useWebSearch").checked,
    includeFeedback: $("showFeedback").checked,
    teacherCorrections: notes || "None"
  });
}

async function requestGrade(prompt) {
  const response = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) throw new Error(result.error || "Grading failed.");
  return result;
}

function addText(parent, tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text == null ? "" : String(text);
  if (className) el.className = className;
  parent.appendChild(el);
  return el;
}

function renderSources(report) {
  const container = $("sourceList");
  container.replaceChildren();

  const sources = Array.isArray(report.sources) ? report.sources : [];
  if (!sources.length) return;

  addText(container, "h3", "Research sources");
  const list = document.createElement("ul");

  sources.forEach((source) => {
    try {
      const url = new URL(source.url);
      if (url.protocol !== "https:" && url.protocol !== "http:") return;

      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title || url.hostname;
      li.appendChild(link);
      list.appendChild(li);
    } catch {
      // Ignore malformed source links.
    }
  });

  container.appendChild(list);
}

function renderReport(report) {
  $("reportPanel").hidden = false;
  $("reportTitle").textContent = report.title || "Grading report";
  $("scoreValue").textContent = `${report.percentage ?? 0}%`;
  $("pointsValue").textContent =
    `${report.score ?? 0} / ${report.maxScore ?? 0}`;
  $("questionCount").textContent = String(report.questions?.length ?? 0);
  $("reviewCount").textContent = String(report.reviewCount ?? 0);
  $("reportSummary").textContent = report.summary || "";
  $("reportContent").replaceChildren();

  (report.questions || []).forEach((q, index) => {
    const card = document.createElement("article");
    card.className = "graded-question";

    const number = q.number ?? index + 1;
    const state = q.needsReview
      ? "Needs review"
      : q.isCorrect ? "Correct" : "Incorrect";

    addText(card, "h3", `Question ${number} — ${state}`);
    addText(card, "p", q.question || "");
    addText(card, "p", `Student answer: ${q.studentAnswer ?? "Not provided"}`);
    addText(card, "p", `Expected answer: ${q.correctAnswer ?? "Not determined"}`);
    addText(card, "p", `Points: ${q.pointsEarned ?? 0} / ${q.pointsPossible ?? 1}`);

    if ($("showFeedback").checked) {
      addText(card, "p", q.feedback || "No explanation supplied.");
    }

    if (q.needsReview) {
      addText(card, "p", "Please check this question manually.", "review-warning");
    }

    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save teacher correction";
    save.addEventListener("click", () => {
      const answer = window.prompt("Correct answer:", String(q.correctAnswer || ""));
      if (answer === null) return;
      const explanation = window.prompt("Explanation:", String(q.feedback || ""));
      if (explanation === null) return;
      addCorrection(q.question || "", answer, explanation);
      toast("Correction saved.");
    });

    card.appendChild(save);
    $("reportContent").appendChild(card);
  });

  renderSources(report);
  $("reportPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveHistory(report) {
  const history = readList(HISTORY_KEY);
  history.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    title: report.title || "Untitled test",
    score: report.score ?? 0,
    maxScore: report.maxScore ?? 0,
    percentage: report.percentage ?? 0,
    report
  });
  saveList(HISTORY_KEY, history.slice(0, 30));
  renderHistory();
  updateStats();
}

function renderHistory() {
  const container = $("historyList");
  container.replaceChildren();
  const history = readList(HISTORY_KEY);

  if (!history.length) {
    addText(container, "p", "No reports saved yet.");
    return;
  }

  history.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "history-item";
    addText(card, "strong", entry.title);
    addText(card, "p", `${entry.percentage}% — ${entry.score}/${entry.maxScore}`);
    addText(card, "small", new Date(entry.date).toLocaleString());

    const view = document.createElement("button");
    view.type = "button";
    view.className = "secondary-button";
    view.textContent = "Open report";
    view.addEventListener("click", () => {
      if (!entry.report) return toast("This older history item has no saved report.");
      currentReport = entry.report;
      showPage("grader");
      renderReport(currentReport);
    });

    card.appendChild(view);
    container.appendChild(card);
  });
}

function updateStats() {
  const history = readList(HISTORY_KEY);
  $("statTests").textContent = String(history.length);
  $("statScore").textContent = history.length ? `${history[0].percentage}%` : "—";
  $("statCorrections").textContent = String(readList(NOTES_KEY).length);
}

function addCorrection(question, answer, explanation) {
  const notes = readList(NOTES_KEY);
  notes.unshift({
    question: String(question).slice(0, 1000),
    answer: String(answer).slice(0, 1000),
    explanation: String(explanation).slice(0, 1000),
    date: new Date().toISOString()
  });
  saveList(NOTES_KEY, notes.slice(0, 50));
  renderCorrections();
  updateStats();
}

function renderCorrections() {
  const container = $("correctionList");
  container.replaceChildren();
  const notes = readList(NOTES_KEY);

  if (!notes.length) {
    addText(container, "p", "No corrections saved yet.");
    return;
  }

  notes.forEach((note) => {
    const card = document.createElement("article");
    card.className = "history-item";
    addText(card, "strong", note.question);
    addText(card, "p", `Expected answer: ${note.answer}`);
    addText(card, "small", note.explanation);
    container.appendChild(card);
  });
}

function exportReport() {
  if (!currentReport) return toast("Grade a test before exporting.");

  const blob = new Blob([JSON.stringify(currentReport, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gradenova-report.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function gradeTest(event) {
  event.preventDefault();
  if (grading) return;

  grading = true;
  $("gradeButton").disabled = true;
  $("gradeButton").textContent = "Grading…";
  $("progressArea").hidden = false;
  $("errorBox").hidden = true;
  $("reportPanel").hidden = true;
  $("progressMessage").textContent =
    "Solving questions, checking calculations, and researching facts when needed.";

  try {
    const report = await requestGrade(buildPrompt());
    if (!Array.isArray(report.questions)) {
      throw new Error("The AI report did not contain a question list. Please try again.");
    }

    currentReport = report;
    renderReport(report);
    saveHistory(report);
    toast("Grading complete. Review flagged questions.");
  } catch (error) {
    $("errorBox").textContent = error.message || "Something went wrong.";
    $("errorBox").hidden = false;
    toast("Grading failed. See the error message.");
  } finally {
    grading = false;
    $("gradeButton").disabled = false;
    $("gradeButton").textContent = "✦ Grade test";
    $("progressArea").hidden = true;
    checkConnection();
  }
}

function initializeControls() {
  $("gradingForm").addEventListener("submit", gradeTest);

  $("clearForm").addEventListener("click", () => {
    if (!window.confirm("Clear all test fields?")) return;
    $("gradingForm").reset();
    $("reportPanel").hidden = true;
    $("errorBox").hidden = true;
    currentReport = null;
  });

  $("clearHistory").addEventListener("click", () => {
    if (!window.confirm("Delete saved grading history?")) return;
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    updateStats();
    toast("History cleared.");
  });

  $("saveCorrectionBtn").addEventListener("click", () => {
    const question = $("learningInput").value.trim();
    const answer = $("learningAnswer").value.trim();
    const explanation = $("learningMessage").value.trim();

    if (!question || !answer) {
      toast("Enter a question and its correct answer.");
      return;
    }

    addCorrection(question, answer, explanation);
    $("learningInput").value = "";
    $("learningAnswer").value = "";
    $("learningMessage").value = "";
    toast("Correction saved.");
  });

  $("clearCorrectionsBtn").addEventListener("click", () => {
    if (!window.confirm("Delete all saved corrections?")) return;
    localStorage.removeItem(NOTES_KEY);
    renderCorrections();
    updateStats();
    toast("Corrections cleared.");
  });

  $("exportReport").addEventListener("click", exportReport);
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    initializeNavigation();
    initializeTheme();
    initializeControls();
    renderHistory();
    renderCorrections();
    updateStats();
    checkConnection();
  } catch (error) {
    console.error("GradeNova initialization failed:", error);
    const box = $("errorBox");
    if (box) {
      box.hidden = false;
      box.textContent = "GradeNova could not initialize. Open the browser Console (F12) for details.";
    }
  }
});
