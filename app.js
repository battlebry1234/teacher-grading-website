
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const themes = {
  violet: { accent: "#9b7bff", rgb: "155, 123, 255", second: "#51d9ff" },
  blue: { accent: "#438dff", rgb: "67, 141, 255", second: "#42dcff" },
  emerald: { accent: "#36d6a0", rgb: "54, 214, 160", second: "#67e7ed" },
  rose: { accent: "#ff6eaa", rgb: "255, 110, 170", second: "#ffad8c" },
  amber: { accent: "#ffb547", rgb: "255, 181, 71", second: "#ffe07a" }
};

let currentReport = null;
let backgroundData = "";
let settingsBeforeOpen = null;

function applyTheme(name) {
  const theme = themes[name] || themes.violet;
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-rgb", theme.rgb);
  document.documentElement.style.setProperty("--accent-2", theme.second);

  $$(".theme-swatch").forEach((button) => {
    button.classList.toggle("selected", button.dataset.theme === name);
  });

  try { localStorage.setItem("gn-theme", name); } catch {}
}

function applyStyle(style) {
  document.body.classList.toggle("solid-mode", style === "solid");
  $$(".style-choice").forEach((button) => {
    button.classList.toggle("selected", button.dataset.style === style);
  });
  try { localStorage.setItem("gn-style", style); } catch {}
}

function setBackground(data) {
  backgroundData = data || "";
  const photo = $("#backgroundPhoto");

  if (backgroundData) {
    photo.style.backgroundImage = `url("${backgroundData}")`;
    document.body.classList.add("has-background");
  } else {
    photo.style.backgroundImage = "none";
    document.body.classList.remove("has-background");
  }
}

function applyIntensity(value) {
  const intensity = Math.max(5, Math.min(45, Number(value) || 18));
  $("#backgroundIntensity").value = intensity;
  $("#intensityValue").textContent = `${intensity}%`;
  $("#ambientOverlay").style.background =
    `rgba(6, 8, 19, ${1 - intensity / 100})`;
  try { localStorage.setItem("gn-intensity", String(intensity)); } catch {}
}

function loadPreferences() {
  let theme = "violet";
  let style = "glass";
  let intensity = 18;
  let savedBackground = "";

  try {
    theme = localStorage.getItem("gn-theme") || theme;
    style = localStorage.getItem("gn-style") || style;
    intensity = Number(localStorage.getItem("gn-intensity")) || intensity;
    savedBackground = localStorage.getItem("gn-background") || "";
  } catch {}

  applyTheme(theme);
  applyStyle(style);
  applyIntensity(intensity);

  if (savedBackground) setBackground(savedBackground);
}

function openSettings() {
  settingsBeforeOpen = {
    theme: (() => { try { return localStorage.getItem("gn-theme") || "violet"; } catch { return "violet"; } })(),
    style: document.body.classList.contains("solid-mode") ? "solid" : "glass",
    intensity: Number($("#backgroundIntensity").value) || 18,
    background: backgroundData
  };
  $("#settingsBackdrop").hidden = false;
  document.body.style.overflow = "hidden";
  $("#closeSettings").focus();
}

function closeSettings() {
  $("#settingsBackdrop").hidden = true;
  document.body.style.overflow = "";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function letterGrade(percent) {
  if (percent >= 97) return "A+";
  if (percent >= 93) return "A";
  if (percent >= 90) return "A−";
  if (percent >= 87) return "B+";
  if (percent >= 83) return "B";
  if (percent >= 80) return "B−";
  if (percent >= 77) return "C+";
  if (percent >= 73) return "C";
  if (percent >= 70) return "C−";
  if (percent >= 67) return "D+";
  if (percent >= 63) return "D";
  if (percent >= 60) return "D−";
  return "F";
}

function numberGrade(percent) {
  if (percent >= 90) return "4";
  if (percent >= 80) return "3";
  if (percent >= 70) return "2";
  if (percent >= 60) return "1";
  return "0";
}

function displayGrade(percent, mode) {
  const letter = letterGrade(percent);
  const number = numberGrade(percent);
  if (mode === "letter") return letter;
  if (mode === "numeric") return number;
  return `${letter} / ${number}`;
}

function metricCard(label, value, note) {
  return `
    <div class="metric-card">
      <div class="metric-label">${escapeHTML(label)}</div>
      <div class="metric-value">${escapeHTML(value)}</div>
      <div class="metric-note">${escapeHTML(note)}</div>
    </div>`;
}

function renderReport(data, mode, totalPoints) {
  currentReport = data;

  const questions = Array.isArray(data.questions) ? data.questions : [];
  const earned = Number(data.earned ?? data.score ?? 0);
  const possible = Number(data.possible ?? totalPoints) || totalPoints;
  const percent = Math.max(0, Math.min(100, Number(data.percentage ?? (possible ? earned / possible * 100 : 0))));
  const shownGrade = displayGrade(percent, mode);
  const correct = questions.filter(q => Number(q.earned) >= Number(q.possible || 1) && Number(q.possible || 1) > 0).length;
  const needsWork = questions.filter(q => Number(q.earned) < Number(q.possible || 1)).length;

  $("#emptyState").hidden = true;
  $("#reportContent").hidden = false;
  $("#copyReport").disabled = false;
  $("#reportSubtitle").textContent = "Your AI-generated grading summary is ready.";

  const scoreValue = `${Number(earned.toFixed(2))} / ${Number(possible.toFixed(2))}`;
  const modeGrade = mode === "letter" ? "Letter grade" : mode === "numeric" ? "Number grade" : "Letter + number";
  $("#resultMetrics").innerHTML = [
    metricCard("PERCENTAGE", `${percent.toFixed(1)}%`, "Overall result"),
    metricCard("FINAL GRADE", shownGrade, modeGrade),
    metricCard("POINTS EARNED", scoreValue, "Points awarded"),
    metricCard("QUESTIONS", String(questions.length), `${correct} full-credit · ${needsWork} to review`)
  ].join("");

  const overview = Array.isArray(data.strengths) ? data.strengths : [];
  const improvements = Array.isArray(data.improvements) ? data.improvements : [];

  $("#performanceOverview").innerHTML = `
    <p><strong>Score:</strong> ${escapeHTML(scoreValue)} (${percent.toFixed(1)}%)</p>
    <p><strong>Grade:</strong> ${escapeHTML(shownGrade)}</p>
    ${overview.length ? `<p><strong>Strengths</strong></p><ul>${overview.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>` : ""}
    ${improvements.length ? `<p><strong>Areas to improve</strong></p><ul>${improvements.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>` : ""}
  `;

  const feedback = data.overallFeedback || data.feedback || "Review the question-by-question feedback below. AI grading can make mistakes, so check important results.";
  $("#overallFeedback").innerHTML = `<p>${escapeHTML(feedback)}</p>`;

  $("#questionCount").textContent = `${questions.length} questions`;

  $("#questionList").innerHTML = questions.map((q, index) => {
    const qEarned = Number(q.earned) || 0;
    const qPossible = Number(q.possible) || 0;
    const qPercent = qPossible > 0 ? qEarned / qPossible * 100 : 0;
    const chipClass = qPercent >= 80 ? "good" : qPercent < 50 ? "bad" : "";
    const questionTitle = q.question || `Question ${index + 1}`;

    return `
      <article class="question-card">
        <div class="question-card-top">
          <div><h4>${index + 1}. ${escapeHTML(questionTitle)}</h4></div>
          <span class="score-chip ${chipClass}">${qEarned} / ${qPossible} pts</span>
        </div>
        ${q.studentAnswer ? `<div class="question-answer"><strong>Student answer:</strong> ${escapeHTML(q.studentAnswer)}</div>` : ""}
        ${q.expectedAnswer ? `<div class="question-answer"><strong>Expected answer:</strong> ${escapeHTML(q.expectedAnswer)}</div>` : ""}
        <div class="question-answer question-feedback"><strong>Feedback:</strong> ${escapeHTML(q.feedback || "No additional feedback supplied.")}</div>
      </article>`;
  }).join("") || `<p class="question-answer">The AI returned a score but no individual question breakdown.</p>`;
}

function makePlainReport() {
  if (!currentReport) return "";

  const questions = Array.isArray(currentReport.questions) ? currentReport.questions : [];
  const earned = Number(currentReport.earned ?? currentReport.score ?? 0);
  const possible = Number(currentReport.possible ?? Number($("#totalPoints").value) ?? 100);
  const percent = Number(currentReport.percentage ?? (possible ? earned / possible * 100 : 0));
  const mode = $('input[name="gradeMode"]:checked')?.value || "both";

  const lines = [
    "GRADENOVA — AI GRADING REPORT",
    `Score: ${earned} / ${possible}`,
    `Percentage: ${percent.toFixed(1)}%`,
    `Grade: ${displayGrade(percent, mode)}`,
    "",
    "OVERALL FEEDBACK",
    currentReport.overallFeedback || currentReport.feedback || "No overall feedback provided.",
    "",
    "QUESTION BREAKDOWN"
  ];

  questions.forEach((q, i) => {
    lines.push(
      `${i + 1}. ${q.question || "Question"}`,
      `Score: ${q.earned ?? 0} / ${q.possible ?? 0}`,
      `Student answer: ${q.studentAnswer || "Not supplied"}`,
      `Expected answer: ${q.expectedAnswer || "Not supplied"}`,
      `Feedback: ${q.feedback || "No feedback"}`,
      ""
    );
  });

  return lines.join("\n");
}

async function gradeTest() {
  const test = $("#testInput").value.trim();
  const totalPoints = Number($("#totalPoints").value);
  const strictness = $("#strictness").value;
  const mode = $('input[name="gradeMode"]:checked')?.value || "both";

  $("#errorMessage").hidden = true;

  if (!test) {
    $("#errorMessage").textContent = "Paste your test and the student's answers into the workspace first.";
    $("#errorMessage").hidden = false;
    $("#testInput").focus();
    return;
  }

  if (!Number.isFinite(totalPoints) || totalPoints <= 0 || totalPoints > 10000) {
    $("#errorMessage").textContent = "Enter a total point value between 1 and 10,000.";
    $("#errorMessage").hidden = false;
    return;
  }

  const button = $("#gradeButton");
  button.disabled = true;
  $("#gradeButtonText").textContent = "AI is reviewing your test…";
  button.querySelector(".button-sparkle").textContent = "◌";

  try {
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test, totalPoints, strictness, gradeMode: mode })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `The grading server returned error ${response.status}.`);
    }

    renderReport(data, mode, totalPoints);
    $("#formatStat").textContent = mode === "letter" ? "Letter grades" : mode === "numeric" ? "Number grades" : "Letter + 1–4";
    $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    $("#errorMessage").textContent =
      `${error.message || "Could not grade the test."} Make sure the Node server is running and its AI API key is configured.`;
    $("#errorMessage").hidden = false;
  } finally {
    button.disabled = false;
    $("#gradeButtonText").textContent = "Grade my test with AI";
    button.querySelector(".button-sparkle").textContent = "✦";
  }
}

async function prepareBackground(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    alert("That image is larger than 15 MB. Choose a smaller image.");
    return;
  }

  const button = $("#chooseBackground");
  button.disabled = true;
  button.querySelector("strong").textContent = "Preparing your image…";

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read this image."));
      reader.readAsDataURL(file);
    });

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not open this image."));
      img.src = dataUrl;
    });

    // Resize the picture to reduce browser storage use.
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compactImage = canvas.toDataURL("image/jpeg", 0.82);

    setBackground(compactImage);

    try {
      localStorage.setItem("gn-background", compactImage);
      $("#settingsSaved").textContent = "Background saved in this browser";
    } catch {
      // Still apply the image for this session if storage is full.
      $("#settingsSaved").textContent = "Background applied for this session";
      alert("The image is active, but your browser storage is full. It may not be saved after you close the browser.");
    }
  } catch (error) {
    alert(error.message || "Could not use that image.");
  } finally {
    button.disabled = false;
    button.querySelector("strong").textContent = "Choose an image";
    $("#backgroundFile").value = "";
  }
}

// Navigation and settings
$("#openSettings").addEventListener("click", openSettings);
$("#topSettings").addEventListener("click", openSettings);
$("#sidebarCustomize").addEventListener("click", openSettings);
$("#miniCustomize").addEventListener("click", openSettings);
$("#footerSettings").addEventListener("click", openSettings);
$("#closeSettings").addEventListener("click", closeSettings);
$("#doneSettings").addEventListener("click", closeSettings);

$("#settingsBackdrop").addEventListener("click", (event) => {
  if (event.target === $("#settingsBackdrop")) closeSettings();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#settingsBackdrop").hidden) closeSettings();
});

$$("[data-scroll]").forEach(button => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.scroll);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });

    $$(".nav-item").forEach(item => item.classList.toggle("active", item === button));
  });
});

// Theme selection
$$(".theme-swatch").forEach(button => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.theme);
    $("#settingsSaved").textContent = "Theme updated";
  });
});

$$(".style-choice").forEach(button => {
  button.addEventListener("click", () => {
    applyStyle(button.dataset.style);
    $("#settingsSaved").textContent = "Interface style updated";
  });
});

// Background image selection
$("#chooseBackground").addEventListener("click", () => $("#backgroundFile").click());
$("#backgroundFile").addEventListener("change", (event) => prepareBackground(event.target.files?.[0]));
$("#removeBackground").addEventListener("click", () => {
  setBackground("");
  try { localStorage.removeItem("gn-background"); } catch {}
  $("#settingsSaved").textContent = "Background removed";
});

$("#backgroundIntensity").addEventListener("input", (event) => {
  applyIntensity(event.target.value);
});

// Grading workspace
$("#testInput").addEventListener("input", () => {
  $("#characterCount").textContent = `${$("#testInput").value.length.toLocaleString()} characters`;
});

$("#clearInput").addEventListener("click", () => {
  $("#testInput").value = "";
  $("#characterCount").textContent = "0 characters";
  $("#testInput").focus();
});

$$('input[name="gradeMode"]').forEach(input => {
  input.addEventListener("change", () => {
    const mode = $('input[name="gradeMode"]:checked').value;
    $("#formatStat").textContent = mode === "letter" ? "Letter grades" : mode === "numeric" ? "Number grades" : "Letter + 1–4";
  });
});

$("#gradeButton").addEventListener("click", gradeTest);

$("#copyReport").addEventListener("click", async () => {
  const text = makePlainReport();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    $("#copyReport").textContent = "✓ Copied!";
    setTimeout(() => { $("#copyReport").textContent = "▣ Copy report"; }, 1800);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand("copy");
    textarea.remove();
    $("#copyReport").textContent = succeeded ? "✓ Copied!" : "Select report text to copy";
    setTimeout(() => { $("#copyReport").textContent = "▣ Copy report"; }, 1800);
  }
});

loadPreferences();
