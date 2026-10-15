const form = document.getElementById("grade-form");
const gradeButton = document.getElementById("grade-button");
const buttonLabel = document.getElementById("button-label");
const submission = document.getElementById("submission");
const errorBox = document.getElementById("form-error");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const report = document.getElementById("report");

let latestReport = null;

submission.addEventListener("input", () => {
  document.getElementById("character-count").textContent =
    `${submission.value.length.toLocaleString()} / 80,000`;
});

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function num(value, decimals = 1) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed.toFixed(decimals).replace(/\.0$/, "")
    : "—";
}

function getLetterGrade(percent) {
  if (percent >= 97) return "A+";
  if (percent >= 93) return "A";
  if (percent >= 90) return "A-";
  if (percent >= 87) return "B+";
  if (percent >= 83) return "B";
  if (percent >= 80) return "B-";
  if (percent >= 77) return "C+";
  if (percent >= 73) return "C";
  if (percent >= 70) return "C-";
  if (percent >= 67) return "D+";
  if (percent >= 63) return "D";
  if (percent >= 60) return "D-";
  return "F";
}

function getNumberGrade(percent) {
  // Default standards-based thresholds.
  if (percent >= 90) return 4;
  if (percent >= 70) return 3;
  if (percent >= 50) return 2;
  return 1;
}

function getMode() {
  return document.querySelector(
    'input[name="gradeMode"]:checked'
  ).value;
}

function getGradeText(letter, numeric, mode) {
  if (mode === "letter") return letter;
  if (mode === "numeric") return String(numeric);
  return `${letter} · ${numeric}`;
}

function buildReport(data, totalPoints, mode) {
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error(
      "No questions were identified. Make sure the pasted text includes the test questions and the student's answers."
    );
  }

  const questions = data.questions;

  let rawEarned = 0;
  let rawPossible = 0;
  let correct = 0;
  let partial = 0;
  let incorrect = 0;
  let questionRatingTotal = 0;

  for (const q of questions) {
    const possible = Math.max(0.01, Number(q.possible) || 1);
    const earned = Math.max(
      0,
      Math.min(possible, Number(q.earned) || 0)
    );

    q.possible = possible;
    q.earned = earned;

    rawPossible += possible;
    rawEarned += earned;

    const ratio = earned / possible;

    if (ratio >= 0.999) {
      correct++;
    } else if (ratio > 0) {
      partial++;
    } else {
      incorrect++;
    }

    questionRatingTotal += ratio * 4;
  }

  if (rawPossible <= 0) {
    throw new Error("The AI did not return valid possible points.");
  }

  const percentage = Math.max(
    0,
    Math.min(100, rawEarned / rawPossible * 100)
  );

  const pointsPossible = Number(totalPoints);
  const pointsEarned = pointsPossible * percentage / 100;
  const letter = getLetterGrade(percentage);
  const numeric = getNumberGrade(percentage);
  const average = questionRatingTotal / questions.length;

  latestReport = {
    questions,
    percentage,
    pointsEarned,
    pointsPossible,
    letter,
    numeric,
    average,
    mode,
    assignment: "Test grading report",
    overallFeedback: data.overallFeedback || "",
    strengths: data.strengths || "",
    improvements: data.improvements || "",
    correct,
    partial,
    incorrect
  };

  renderReport(latestReport);
}

function renderReport(result) {
  const mode = result.mode;
  const gradeText = getGradeText(
    result.letter,
    result.numeric,
    mode
  );

  document.getElementById("report-title").textContent =
    "Your test results";

  document.getElementById("report-subtitle").textContent =
    `${result.questions.length} questions analyzed`;

  document.getElementById("percentage").textContent =
    `${num(result.percentage)}%`;

  document.getElementById("score-ring").style.setProperty(
    "--score",
    `${result.percentage}%`
  );

  document.getElementById("main-grade").textContent = gradeText;

  document.getElementById("grade-secondary").textContent =
    mode === "both"
      ? "Letter + number grade"
      : mode === "letter"
        ? "Letter grade"
        : "Number grade out of 4";

  document.getElementById("score-description").textContent =
    `${num(result.pointsEarned)} of ${num(result.pointsPossible)} points earned.`;

  document.getElementById("points-earned").textContent =
    num(result.pointsEarned, 2);

  document.getElementById("points-possible").textContent =
    `Out of ${num(result.pointsPossible, 2)} points`;

  document.getElementById("average").textContent =
    `${num(result.average, 2)}`;

  document.getElementById("correct-count").textContent =
    result.correct;

  document.getElementById("partial-count").textContent =
    result.partial;

  document.getElementById("incorrect-count").textContent =
    result.incorrect;

  document.getElementById("total-questions").textContent =
    result.questions.length;

  document.getElementById("letter-grade").textContent =
    result.letter;

  document.getElementById("number-grade").textContent =
    `${result.numeric} / 4`;

  document.getElementById("correct-caption").textContent =
    `Out of ${result.questions.length} questions`;

  document.getElementById("question-count").textContent =
    `${result.questions.length} questions`;

  document.getElementById("summary-note").textContent =
    result.overallFeedback ||
    "Review the question-level feedback below.";

  document.getElementById("strengths").textContent =
    result.strengths || "No specific strengths were identified.";

  document.getElementById("improvements").textContent =
    result.improvements || "Review the missed questions below.";

  const list = document.getElementById("question-list");

  list.innerHTML = result.questions.map((q, index) => {
    const ratio = q.earned / q.possible;

    let status;
    if (ratio >= 0.999) {
      status = "CORRECT";
    } else if (ratio > 0) {
      status = "PARTIAL";
    } else {
      status = "INCORRECT";
    }

    return `
      <article class="question-card">
        <div class="question-top">
          <div class="question-name">
            ${index + 1}. ${escapeHTML(q.question || "Question")}
          </div>
          <span class="points-badge">
            ${num(q.earned, 2)} / ${num(q.possible, 2)} pts
          </span>
        </div>

        <p><strong>Status:</strong> ${status}</p>

        <p><strong>Student answer:</strong><br>
          ${escapeHTML(q.studentAnswer || "No answer identified")}
        </p>

        <p><strong>Feedback:</strong><br>
          ${escapeHTML(q.feedback || "No feedback provided")}
        </p>

        ${q.correctAnswer ? `
          <p><strong>Suggested answer:</strong><br>
            ${escapeHTML(q.correctAnswer)}
          </p>
        ` : ""}
      </article>
    `;
  }).join("");

  emptyState.hidden = true;
  loadingState.hidden = true;
  report.hidden = false;

  report.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

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
  buttonLabel.textContent = "AI is grading...";

  const payload = {
    submission: submission.value.trim(),
    totalPoints: Number(
      document.getElementById("total-points").value
    ) || 100,
    strictness: document.getElementById("strictness").value
  };

  try {
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "The grading request failed."
      );
    }

    buildReport(data, payload.totalPoints, getMode());

  } catch (error) {
    loadingState.hidden = true;
    emptyState.hidden = false;

    errorBox.textContent =
      error.message || "An unexpected error occurred.";

    errorBox.hidden = false;

  } finally {
    gradeButton.disabled = false;
    buttonLabel.textContent = "Analyze & Grade Test";
  }
});

function makeShortReport(result) {
  const mode = result.mode;

  const grade = getGradeText(
    result.letter,
    result.numeric,
    mode
  );

  return [
    "GRADEPILOT AI — GRADE REPORT",
    `Grade: ${grade}`,
    `Percentage: ${num(result.percentage)}%`,
    `Points: ${num(result.pointsEarned, 2)} / ${num(result.pointsPossible, 2)}`,
    `Average question rating: ${num(result.average, 2)} / 4`,
    `Fully correct: ${result.correct}`,
    `Partially correct: ${result.partial}`,
    `Incorrect or unanswered: ${result.incorrect}`,
    `Questions analyzed: ${result.questions.length}`
  ].join("\n");
}

function makeFullReport(result) {
  const questionDetails = result.questions.map((q, index) => [
    `Question ${index + 1}: ${q.question}`,
    `Score: ${num(q.earned, 2)} / ${num(q.possible, 2)}`,
    `Student answer: ${q.studentAnswer || "Not identified"}`,
    `Feedback: ${q.feedback || "None"}`,
    q.correctAnswer
      ? `Suggested answer: ${q.correctAnswer}`
      : ""
  ].filter(Boolean).join("\n")).join("\n\n");

  return [
    makeShortReport(result),
    "",
    "QUESTION BREAKDOWN",
    questionDetails,
    "",
    "OVERALL FEEDBACK",
    result.overallFeedback || "No overall feedback.",
    "",
    "STRENGTHS",
    result.strengths || "Not specified.",
    "",
    "AREAS TO IMPROVE",
    result.improvements || "Not specified.",
    "",
    "AI-generated grades should be reviewed by the teacher."
  ].join("\n");
}

async function copyText(text) {
  const status = document.getElementById("copy-status");

  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "✓ Copied to clipboard!";
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.left = "-9999px";

    document.body.appendChild(field);
    field.select();

    const success = document.execCommand("copy");
    field.remove();

    status.textContent = success
      ? "✓ Copied to clipboard!"
      : "Copy failed. Please select and copy the report manually.";
  }
}

document.getElementById("copy-button").addEventListener("click", () => {
  if (latestReport) {
    copyText(makeShortReport(latestReport));
  }
});

document.getElementById("copy-detail-button").addEventListener("click", () => {
  if (latestReport) {
    copyText(makeFullReport(latestReport));
  }
});

document.getElementById("copy-score-button").addEventListener("click", () => {
  if (latestReport) {
    const result = latestReport;
    copyText(
      `${getGradeText(result.letter, result.numeric, result.mode)} — ${num(result.percentage)}%`
    );
  }
});
