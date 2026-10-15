const form = document.getElementById("grade-form");
const gradeButton = document.getElementById("grade-button");
const errorBox = document.getElementById("form-error");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const report = document.getElementById("report");

let latestReport = null;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function number(value, decimals = 1) {
  const result = Number(value);
  return Number.isFinite(result)
    ? result.toFixed(decimals).replace(/\.0$/, "")
    : "—";
}

// Convert the percentage to the selected 1–4 scale.
function getGrade(percentage, scale) {
  if (scale === "standards") {
    if (percentage >= 90) {
      return { number: 4, label: "Exceeds expectations" };
    }
    if (percentage >= 70) {
      return { number: 3, label: "Meets expectations" };
    }
    if (percentage >= 50) {
      return { number: 2, label: "Developing" };
    }
    return { number: 1, label: "Beginning" };
  }

  // Default percentage thresholds.
  if (percentage >= 97) return { number: 4, label: "A+" };
  if (percentage >= 90) return { number: 3, label: "A" };
  if (percentage >= 80) return { number: 2, label: "B" };

  return { number: 1, label: "C or below" };
}

function renderReport(data, targetPoints, scale) {
  const questions = data.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("No graded questions were returned. Please try again.");
  }

  const possibleRaw = questions.reduce(
    (sum, question) => sum + Math.max(0, Number(question.possible) || 0),
    0
  );

  const earnedRaw = questions.reduce(
    (sum, question) => sum + Math.max(0, Math.min(
      Number(question.possible) || 0,
      Number(question.earned) || 0
    )),
    0
  );

  if (possibleRaw <= 0) {
    throw new Error("The AI could not calculate the possible points.");
  }

  const percentage = Math.max(
    0,
    Math.min(100, earnedRaw / possibleRaw * 100)
  );

  const possible = Number(targetPoints);
  const earned = possible * percentage / 100;
  const grade = getGrade(percentage, scale);

  // Average the individual question percentages, expressed out of 4.
  const average = questions.reduce((sum, question) => {
    const p = Math.max(0.01, Number(question.possible) || 1);
    const e = Math.max(0, Math.min(p, Number(question.earned) || 0));
    return sum + (e / p) * 4;
  }, 0) / questions.length;

  latestReport = {
    assignment: document.getElementById("assignment").value.trim()
      || "Untitled assignment",
    questions,
    percentage,
    earned,
    possible,
    grade,
    average,
    overallFeedback: data.overallFeedback || ""
  };

  document.getElementById("report-title").textContent =
    latestReport.assignment;

  document.getElementById("grade-number").textContent = grade.number;
  document.getElementById("grade-label").textContent = grade.label;
  document.getElementById("percentage").textContent =
    `${number(percentage)}%`;

  document.getElementById("points-line").textContent =
    `${number(earned)} / ${number(possible)} points`;

  document.getElementById("average").textContent =
    `${number(average, 2)} / 4`;

  document.getElementById("summary-note").textContent =
    latestReport.overallFeedback ||
    "Review the individual answers before recording the grade.";

  document.getElementById("question-count").textContent =
    `${questions.length} question${questions.length === 1 ? "" : "s"}`;

  const questionList = document.getElementById("question-list");

  questionList.innerHTML = questions.map((question, index) => `
    <article class="question-card">
      <div class="question-top">
        <div class="question-name">
          ${index + 1}. ${escapeHTML(question.question || "Question")}
        </div>
        <span class="points-badge">
          ${number(question.earned, 2)} /
          ${number(question.possible, 2)} pts
        </span>
      </div>

      <p><strong>Student answer:</strong>
        ${escapeHTML(question.studentAnswer || "No answer identified")}
      </p>

      <p><strong>Feedback:</strong>
        ${escapeHTML(question.feedback || "No feedback provided.")}
      </p>

      ${question.correctAnswer ? `
        <p><strong>Suggested answer:</strong>
          ${escapeHTML(question.correctAnswer)}
        </p>
      ` : ""}
    </article>
  `).join("");

  emptyState.hidden = true;
  loadingState.hidden = true;
  report.hidden = false;
  document.getElementById("copy-status").textContent = "";
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  errorBox.hidden = true;
  errorBox.textContent = "";
  report.hidden = true;
  emptyState.hidden = true;
  loadingState.hidden = false;
  gradeButton.disabled = true;
  gradeButton.textContent = "Grading in progress...";

  const payload = {
    assignment: document.getElementById("assignment").value.trim(),
    questions: document.getElementById("questions").value.trim(),
    answers: document.getElementById("answers").value.trim(),
    answerKey: document.getElementById("key").value.trim(),
    instructions: document.getElementById("instructions").value.trim(),
    totalPoints: Number(document.getElementById("points").value) || 100
  };

  try {
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The grading request failed.");
    }

    renderReport(
      result,
      payload.totalPoints,
      document.getElementById("scale").value
    );

  } catch (error) {
    loadingState.hidden = true;
    emptyState.hidden = false;
    errorBox.textContent = error.message || "An unexpected error occurred.";
    errorBox.hidden = false;

  } finally {
    gradeButton.disabled = false;
    gradeButton.textContent = "Grade test with AI →";
  }
});

// Format the short copyable grade summary.
function makeShortReport(data) {
  return [
    `Assignment: ${data.assignment}`,
    `Grade: ${data.grade.number} (${data.grade.label})`,
    `Percentage: ${number(data.percentage)}%`,
    `Points: ${number(data.earned)} / ${number(data.possible)}`,
    `Average: ${number(data.average, 2)} / 4`
  ].join("\n");
}

// Format the detailed report.
function makeFullReport(data) {
  const details = data.questions.map((question, index) => [
    `Question ${index + 1}: ${question.question}`,
    `Score: ${question.earned} / ${question.possible}`,
    `Student answer: ${question.studentAnswer || "Not provided"}`,
    `Feedback: ${question.feedback || "No feedback provided"}`,
    question.correctAnswer
      ? `Suggested answer: ${question.correctAnswer}`
      : ""
  ].filter(Boolean).join("\n")).join("\n\n");

  return [
    makeShortReport(data),
    "",
    "QUESTION-BY-QUESTION FEEDBACK",
    details,
    "",
    "Overall feedback:",
    data.overallFeedback || "No additional feedback.",
    "",
    "AI-assisted grade. Teacher review recommended."
  ].join("\n");
}

async function copyToClipboard(text) {
  const status = document.getElementById("copy-status");

  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Copied successfully!";
  } catch {
    // Fallback for browsers where Clipboard API is unavailable.
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    const success = document.execCommand("copy");
    textarea.remove();

    status.textContent = success
      ? "Copied successfully!"
      : "Copy failed. Please copy the report manually.";
  }
}

document.getElementById("copy-button").addEventListener("click", () => {
  if (latestReport) {
    copyToClipboard(makeShortReport(latestReport));
  }
});

document.getElementById("copy-detail-button").addEventListener("click", () => {
  if (latestReport) {
    copyToClipboard(makeFullReport(latestReport));
  }
});
