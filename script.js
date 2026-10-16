
"use strict";

/*
 * GradeNova — script.js
 *
 * Requires server.py running at http://127.0.0.1:8000.
 * The Gemini API key stays on the Python backend.
 */

const $ = (id) => document.getElementById(id);

const GradeNova = {
  grading: false,
  lastReport: null,
  historyKey: "gn-history-v3",
  correctionsKey: "gn-notes-v3"
};

/* ---------- Safe math verification ---------- */

/*
 * Supports ordinary numeric arithmetic without eval().
 * Examples: 5 × 5, 15 - 7, (8 + 2) * 3, 12 / 4.
 * This is intentionally not a full algebra solver.
 */

function tokenizeMath(expression) {
  const input = String(expression)
    .replace(/[−–—]/g, "-")
    .replace(/[×✕]/g, "*")
    .replace(/÷/g, "/")
    .replace(/\*\*/g, "^")
    .replace(/(\d)\s*[xX]\s*(?=\d|\()/g, "$1*")
    .replace(/\s+/g, "");

  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const rest = input.slice(i);
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);

    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }

    const char = input[i];

    if ("+-*/^()".includes(char)) {
      tokens.push({ type: char, value: char });
      i++;
      continue;
    }

    throw new Error("Unsupported math symbol");
  }

  return tokens;
}

function calculateMath(expression) {
  const tokens = tokenizeMath(expression);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function take(type) {
    if (!peek() || peek().type !== type) {
      throw new Error("Unexpected math expression");
    }
    return tokens[index++];
  }

  function primary() {
    if (peek()?.type === "+") {
      take("+");
      return primary();
    }

    if (peek()?.type === "-") {
      take("-");
      return -primary();
    }

    if (peek()?.type === "number") {
      return take("number").value;
    }

    if (peek()?.type === "(") {
      take("(");
      const value = addSub();
      take(")");
      return value;
    }

    throw new Error("Expected a number");
  }

  function power() {
    let value = primary();
    if (peek()?.type === "^") {
      take("^");
      value = Math.pow(value, unaryPower());
    }
    return value;
  }

  function unaryPower() {
    if (peek()?.type === "+") {
      take("+");
      return unaryPower();
    }
    if (peek()?.type === "-") {
      take("-");
      return -unaryPower();
    }
    return power();
  }

  function multiplyDivide() {
    let value = power();

    while (peek()?.type === "*" || peek()?.type === "/") {
      const op = tokens[index++].type;
      const right = power();

      if (op === "/" && right === 0) {
        throw new Error("Division by zero");
      }

      value = op === "*" ? value * right : value / right;
    }

    return value;
  }

  function addSub() {
    let value = multiplyDivide();

    while (peek()?.type === "+" || peek()?.type === "-") {
      const op = tokens[index++].type;
      const right = multiplyDivide();
      value = op === "+" ? value + right : value - right;
    }

    return value;
  }

  if (!tokens.length) throw new Error("Empty expression");

  const result = addSub();

  if (index !== tokens.length || !Number.isFinite(result)) {
    throw new Error("Invalid expression");
  }

  return result;
}

function extractNumericAnswer(value) {
  const text = String(value ?? "").trim().replace(/,/g, "");
  const match = text.match(/^[\s$]*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?:\s*[%])?(?:\s*[a-zA-Z]+)?\s*$/i);

  if (!match) return null;

  const number = Number(match[1]);
  return Number.isFinite(number) ? number : null;
}

function verifySimpleMath(question, studentAnswer, expectedAnswer) {
  const q = String(question ?? "").trim();

  // Only attempt deterministic verification on explicit arithmetic
  // questions, avoiding general algebra and word problems.
  const match = q.match(
    /(?:what\s+is\s+)?([0-9().+\-−–—×✕*÷/^ ]+(?:[xX][ ]*[0-9(]+)?)[?=]\s*$/i
  );

  if (!match) return { checked: false };

  const expression = match[1].trim();

  // Require at least one arithmetic operator.
  if (!/[+\-−×✕*÷/^]/.test(expression)) {
    return { checked: false };
  }

  try {
    const correct = calculateMath(expression);
    const student = extractNumericAnswer(studentAnswer);

    if (student === null) {
      return {
        checked: true,
        correctValue: correct,
        matches: false,
        reason: "The student's answer was not a plain numeric answer."
      };
    }

    const matches =
      Math.abs(student - correct) <=
      1e-9 * Math.max(1, Math.abs(correct));

    return {
      checked: true,
      correctValue: correct,
      studentValue: student,
      matches,
      reason: matches ? "Arithmetic verified." : "Arithmetic mismatch."
    };
  } catch {
    return { checked: false };
  }
}

/* ---------- Corrections and learning notes ---------- */

function getCorrections() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(GradeNova.correctionsKey) || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCorrection(question, answer, explanation) {
  const notes = getCorrections();

  notes.unshift({
    question: String(question).slice(0, 1000),
    answer: String(answer).slice(0, 1000),
    explanation: String(explanation).slice(0, 1000),
    date: new Date().toISOString()
  });

  localStorage.setItem(
    GradeNova.correctionsKey,
    JSON.stringify(notes.slice(0, 50))
  );

  renderCorrections();
}

function renderCorrections() {
  const container = $("correctionList");
  if (!container) return;

  const notes = getCorrections();

  if (!notes.length) {
    container.textContent = "No corrections saved yet.";
    return;
  }

  container.replaceChildren();

  notes.forEach((note) => {
    const item = document.createElement("div");
    item.className = "correction-item";

    const question = document.createElement("strong");
    question.textContent = note.question;

    const answer = document.createElement("p");
    answer.textContent = "Expected answer: " + note.answer;

    const explanation = document.createElement("p");
    explanation.textContent = note.explanation;

    item.append(question, answer, explanation);
    container.appendChild(item);
  });
}

/* ---------- Prompt construction ---------- */

function buildGradingPrompt() {
  const test = $("testInput")?.value?.trim() || "";
  const answers = $("answersInput")?.value?.trim() || "";
  const title = $("testTitle")?.value?.trim() || "Untitled test";
  const grade = $("gradeLevel")?.value || "Not specified";
  const style = $("gradingStyle")?.value || "fair";

  if (!test) {
    throw new Error("Paste the test questions first.");
  }

  const corrections = getCorrections()
    .slice(0, 20)
    .map((note, i) =>
      `${i + 1}. Question: ${note.question}\n` +
      `Expected answer: ${note.answer}\n` +
      `Explanation: ${note.explanation}`
    )
    .join("\n\n");

  return `
GRADE NOVA TEST GRADING REQUEST

Test title: ${title}
Grade level: ${grade}
Grading style: ${style}

TEST QUESTIONS AND STUDENT ANSWERS:
${test}

${answers ? `SEPARATE ANSWER KEY:\n${answers}` : "No separate answer key supplied. Solve each question independently."}

PREVIOUS TEACHER CORRECTIONS:
${corrections || "No saved corrections."}

IMPORTANT:
- Grade every question.
- Use exact arithmetic for numeric calculations.
- Check multiplication, subtraction, order of operations, fractions,
  decimals, and negative numbers carefully.
- Do not confuse × with + or -.
- Show the correct answer and explain each mistake.
- Accept equivalent wording and mathematically equivalent answers.
- If a problem is ambiguous, mark it for review.
- Use Google Search for factual questions when it would help.
- Never invent a citation or pretend you searched if no source was found.
- Return the JSON report format requested by the server.
`;
}

/* ---------- AI request ---------- */

async function askGradeNovaAI(prompt) {
  const response = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok) {
    throw new Error(result.error || "The AI grading request failed.");
  }

  return result;
}

/* ---------- Independent grading checks ---------- */

function strengthenMathResults(report) {
  if (!Array.isArray(report.questions)) return report;

  for (const question of report.questions) {
    const check = verifySimpleMath(
      question.question,
      question.studentAnswer,
      question.correctAnswer
    );

    if (!check.checked) continue;

    question.mathVerified = true;
    question.mathVerification = check;

    if (!check.matches) {
      question.needsReview = true;
      question.isCorrect = false;
      question.correctAnswer = String(check.correctValue);

      question.feedback =
        (question.feedback ? question.feedback + " " : "") +
        `Independent arithmetic check: the correct result is ${check.correctValue}. ` +
        "This item has been flagged for review.";

      // Correct the score conservatively for a clear numeric mismatch.
      question.pointsEarned = 0;
    } else {
      question.isCorrect = true;
      question.correctAnswer = String(check.correctValue);
      question.pointsEarned = question.pointsPossible;
      question.feedback =
        (question.feedback ? question.feedback + " " : "") +
        "Independent arithmetic check confirms the numeric answer.";
    }
  }

  const reviewed = report.questions.filter((q) => !q.needsReview);

  // Recalculate score only if all items use valid point values.
  const validScores = report.questions.every((q) =>
    Number.isFinite(Number(q.pointsEarned)) &&
    Number.isFinite(Number(q.pointsPossible))
  );

  if (validScores) {
    report.score = report.questions.reduce(
      (sum, q) => sum + Number(q.pointsEarned), 0
    );

    report.maxScore = report.questions.reduce(
      (sum, q) => sum + Number(q.pointsPossible), 0
    );

    report.percentage = report.maxScore
      ? Math.round(report.score / report.maxScore * 100)
      : 0;
  }

  report.reviewCount = report.questions.filter(
    (q) => q.needsReview
  ).length;

  return report;
}

/* ---------- Report display ---------- */

function addTextElement(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text ?? "";

  if (className) element.className = className;

  parent.appendChild(element);
  return element;
}

function renderSources(report, parent) {
  const metadata = report._groundingMetadata || {};
  const chunks = metadata.groundingChunks || [];

  const sources = [
    ...(report.sources || []),
    ...chunks
      .filter((chunk) => chunk.web?.uri)
      .map((chunk) => ({
        title: chunk.web.title || chunk.web.uri,
        url: chunk.web.uri
      }))
  ];

  const unique = [
    ...new Map(
      sources
        .filter((source) => source.url)
        .map((source) => [source.url, source])
    ).values()
  ];

  if (!unique.length) return;

  addTextElement(parent, "h3", "Sources");

  const list = document.createElement("ul");

  unique.forEach((source) => {
    try {
      const url = new URL(source.url);

      if (!["https:", "http:"].includes(url.protocol)) return;

      const item = document.createElement("li");
      const link = document.createElement("a");

      link.href = url.href;
      link.textContent = source.title || url.hostname;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      item.appendChild(link);
      list.appendChild(item);
    } catch {
      // Ignore invalid URLs.
    }
  });

  parent.appendChild(list);
}

function renderReport(report) {
  const panel = $("reportPanel");
  const content = $("reportContent");

  if (!panel || !content) {
    console.warn("GradeNova report elements were not found.");
    return;
  }

  content.replaceChildren();

  addTextElement(content, "h2", report.title || "Grading report");
  addTextElement(content, "p", report.summary || "");

  const score = `${report.score ?? 0} / ${report.maxScore ?? 0}`;
  const percentage = `${report.percentage ?? 0}%`;

  addTextElement(content, "h3", `Score: ${score} (${percentage})`);

  if (report.reviewCount) {
    addTextElement(
      content,
      "p",
      `${report.reviewCount} question(s) need a human review.`
    );
  }

  const questions = Array.isArray(report.questions)
    ? report.questions
    : [];

  questions.forEach((question, index) => {
    const card = document.createElement("section");
    card.className = "graded-question";

    addTextElement(
      card,
      "h3",
      `Question ${question.number ?? index + 1}: ` +
      `${question.isCorrect ? "Correct" : "Incorrect / review"}`
    );

    addTextElement(card, "p", question.question || "");
    addTextElement(
      card,
      "p",
      "Student answer: " + (question.studentAnswer ?? "Not supplied")
    );
    addTextElement(
      card,
      "p",
      "Expected answer: " + (question.correctAnswer ?? "Not determined")
    );
    addTextElement(
      card,
      "p",
      `Points: ${question.pointsEarned ?? 0} / ${question.pointsPossible ?? 1}`
    );
    addTextElement(card, "p", question.feedback || "");

    if (question.needsReview) {
      addTextElement(
        card,
        "p",
        "Please check this question manually.",
        "review-warning"
      );
    }

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save correction";

    saveButton.addEventListener("click", () => {
      const expected = window.prompt(
        "Enter the correct answer:",
        String(question.correctAnswer ?? "")
      );

      if (expected === null) return;

      const explanation = window.prompt(
        "Explain the correction:",
        String(question.feedback ?? "")
      );

      if (explanation === null) return;

      saveCorrection(question.question, expected, explanation);
      showToast("Correction saved.");
    });

    card.appendChild(saveButton);
    content.appendChild(card);
  });

  renderSources(report, content);
  panel.hidden = false;

  const scoreValue = $("scoreValue");
  if (scoreValue) scoreValue.textContent = percentage;

  const pointsValue = $("pointsValue");
  if (pointsValue) pointsValue.textContent = score;

  const questionCount = $("questionCount");
  if (questionCount) questionCount.textContent = String(questions.length);

  const exportButton = $("exportReport");
  if (exportButton) exportButton.disabled = false;

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- History and export ---------- */

function getHistory() {
  try {
    const history = JSON.parse(
      localStorage.getItem(GradeNova.historyKey) || "[]"
    );
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveHistory(report) {
  const history = getHistory();

  history.unshift({
    date: new Date().toISOString(),
    title: report.title || "Untitled test",
    score: report.score ?? 0,
    maxScore: report.maxScore ?? 0,
    percentage: report.percentage ?? 0
  });

  localStorage.setItem(
    GradeNova.historyKey,
    JSON.stringify(history.slice(0, 50))
  );

  renderHistory();
}

function renderHistory() {
  const container = $("historyList");
  if (!container) return;

  container.replaceChildren();
  const history = getHistory();

  if (!history.length) {
    container.textContent = "No grading history yet.";
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "history-item";

    addTextElement(row, "strong", entry.title);
    addTextElement(
      row,
      "p",
      `${entry.percentage}% — ${entry.score}/${entry.maxScore}`
    );
    addTextElement(
      row,
      "small",
      new Date(entry.date).toLocaleString()
    );

    container.appendChild(row);
  });
}

function exportReport() {
  if (!GradeNova.lastReport) {
    showToast("Grade a test before exporting.");
    return;
  }

  const blob = new Blob(
    [JSON.stringify(GradeNova.lastReport, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "gradenova-report.json";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- UI helpers ---------- */

function showToast(message) {
  const toast = $("toast");

  if (toast) {
    toast.textContent = message;
    toast.hidden = false;
    toast.setAttribute("role", "status");
  } else {
    console.info("GradeNova:", message);
  }
}

function setGradingState(isGrading) {
  GradeNova.grading = isGrading;

  const button = $("gradeButton");
  if (button) {
    button.disabled = isGrading;
    button.textContent = isGrading ? "Grading..." : "Grade test";
  }

  const progress = $("progressArea");
  if (progress) {
    progress.hidden = !isGrading;
    progress.textContent = isGrading
      ? "Checking answers and researching facts..."
      : "";
  }
}

/* ---------- Main grading workflow ---------- */

async function gradeTest() {
  if (GradeNova.grading) return;

  setGradingState(true);

  try {
    const prompt = buildGradingPrompt();
    let report = await askGradeNovaAI(prompt);

    report = strengthenMathResults(report);

    GradeNova.lastReport = report;
    renderReport(report);
    saveHistory(report);

    showToast("Grading finished. Review flagged questions.");
  } catch (error) {
    console.error("GradeNova grading error:", error);
    showToast(error.message || "Grading failed. Please try again.");
  } finally {
    setGradingState(false);
  }
}

/* ---------- Appearance and navigation ---------- */

function initializeNavigation() {
  document.querySelectorAll(".nav[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.page;

      document.querySelectorAll("[data-page-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.pagePanel !== target;
      });

      document.querySelectorAll(".nav[data-page]").forEach((nav) => {
        nav.classList.toggle("active", nav === button);
      });

      const crumb = $("crumb");
      if (crumb) crumb.textContent = button.textContent.trim();
    });
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(
        `[data-page-panel="${CSS.escape(button.dataset.go)}"]`
      );

      if (!target) return;

      document.querySelectorAll("[data-page-panel]").forEach((panel) => {
        panel.hidden = panel !== target;
      });
    });
  });
}

function initializeAppearance() {
  const key = "gn-appearance-v3";

  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    settings = {};
  }

  if (settings.theme) {
    document.documentElement.dataset.theme = settings.theme;
  }

  if (settings.background) {
    document.body.style.background = settings.background;
  }

  const themeSelect = $("themeSelect");
  if (themeSelect) {
    if (settings.theme) themeSelect.value = settings.theme;

    themeSelect.addEventListener("change", () => {
      document.documentElement.dataset.theme = themeSelect.value;
      settings.theme = themeSelect.value;
      localStorage.setItem(key, JSON.stringify(settings));
    });
  }

  const toggle = $("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      const next = current === "light" ? "dark" : "light";

      document.documentElement.dataset.theme = next;
      settings.theme = next;
      localStorage.setItem(key, JSON.stringify(settings));
    });
  }

  const photoInput = $("photoInput");
  if (photoInput) {
    photoInput.addEventListener("change", () => {
      const file = photoInput.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("Choose an image file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast("Choose an image smaller than 5 MB.");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const background = `url("${reader.result}") center / cover fixed`;
        document.body.style.background = background;
        settings.background = background;
        localStorage.setItem(key, JSON.stringify(settings));
      };

      reader.readAsDataURL(file);
    });
  }

  const reset = $("resetAppearance");
  if (reset) {
    reset.addEventListener("click", () => {
      localStorage.removeItem(key);
      document.documentElement.dataset.theme = "dark";
      document.body.style.background = "";
      showToast("Appearance reset.");
    });
  }
}

/* ---------- Start ---------- */

document.addEventListener("DOMContentLoaded", () => {
  $("gradeButton")?.addEventListener("click", gradeTest);
  $("exportReport")?.addEventListener("click", exportReport);

  $("clearHistory")?.addEventListener("click", () => {
    if (!window.confirm("Clear all grading history?")) return;

    localStorage.removeItem(GradeNova.historyKey);
    renderHistory();
    showToast("History cleared.");
  });

  $("clearCorrectionsBtn")?.addEventListener("click", () => {
    if (!window.confirm("Clear all saved corrections?")) return;

    localStorage.removeItem(GradeNova.correctionsKey);
    renderCorrections();
    showToast("Corrections cleared.");
  });

  $("saveCorrectionBtn")?.addEventListener("click", () => {
    const question = $("learningInput")?.value?.trim();
    const answer = $("learningMessage")?.value?.trim();

    if (!question || !answer) {
      showToast("Enter both a question and its correct answer.");
      return;
    }

    saveCorrection(question, answer, "Teacher-provided correction.");
    showToast("Correction saved.");
  });

  initializeNavigation();
  initializeAppearance();
  renderHistory();
  renderCorrections();

  console.info("GradeNova initialized.");
});
