"use strict";

/*
 * GradeNova AI — frontend controller
 *
 * IMPORTANT:
 * Set API_BASE_URL to your deployed grading backend to enable real grading.
 * Until then, the grading page displays an honest demo-mode notice.
 */

const API_BASE_URL = "https://YOUR-SERVICE.onrender.com";

const THEMES = ["cosmic", "underwater", "forest", "fire", "ocean"];

const THEME_NAMES = {
  cosmic: "Cosmic",
  underwater: "Underwater",
  forest: "Forest",
  fire: "Fire",
  ocean: "Open water"
};

const STORAGE_KEYS = {
  theme: "gradenova-theme",
  history: "gradenova-history",
  animation: "gradenova-animation",
  glass: "gradenova-glass"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

const state = {
  currentPage: "dashboard",
  currentResult: null,
  busy: false
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  $("#currentYear").textContent = new Date().getFullYear();

  initializeTheme();
  initializeNavigation();
  initializeThemeButtons();
  initializeAppearanceSettings();
  initializeGradingForm();
  initializeHistory();
  initializeConnectionTest();
  initializeMobileMenu();

  renderHistory();
  updateDashboardStats();
  updateRubricTotal();
  updateConnectionStatus();
  updateCharacterCount();

  window.addEventListener("keydown", handleKeyboardShortcuts);
}

/* -------------------------------------------------------
   NAVIGATION
------------------------------------------------------- */

function initializeNavigation() {
  $$("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  $$("[data-go-page]").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.goPage);
    });
  });
}

function showPage(pageName) {
  const validPages = ["dashboard", "grade", "history", "settings"];

  if (!validPages.includes(pageName)) {
    return;
  }

  state.currentPage = pageName;

  $$(".page-view").forEach(section => {
    const active = section.dataset.view === pageName;
    section.classList.toggle("active", active);
    section.setAttribute("aria-hidden", String(!active));
  });

  $$("[data-page]").forEach(button => {
    const active = button.dataset.page === pageName;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const breadcrumb = $("#breadcrumbPage");
  if (breadcrumb) {
    const labels = {
      dashboard: "Dashboard",
      grade: "Grade work",
      history: "Grade history",
      settings: "Settings"
    };

    breadcrumb.textContent = labels[pageName];
  }

  document.body.classList.remove("sidebar-open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageName === "history") {
    renderHistory();
  }

  if (pageName === "dashboard") {
    updateDashboardStats();
  }
}

/* -------------------------------------------------------
   THEMES AND GRADUATION HAT
------------------------------------------------------- */

function initializeTheme() {
  let savedTheme = "cosmic";

  try {
    savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "cosmic";
  } catch (error) {
    console.warn("Theme preference could not be loaded.", error);
  }

  setTheme(THEMES.includes(savedTheme) ? savedTheme : "cosmic", false);
}

function initializeThemeButtons() {
  $$("[data-theme-choice]").forEach(button => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.themeChoice);
    });
  });

  const quickTheme = $("#quickTheme");

  if (quickTheme) {
    quickTheme.addEventListener("click", () => {
      const currentIndex = THEMES.indexOf(document.body.dataset.theme);
      const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];

      setTheme(nextTheme);
      showToast(`${THEME_NAMES[nextTheme]} environment activated.`);
    });
  }
}

function setTheme(theme, save = true) {
  if (!THEMES.includes(theme)) {
    theme = "cosmic";
  }

  document.body.dataset.theme = theme;
  document.documentElement.dataset.theme = theme;

  $$("[data-theme-choice]").forEach(button => {
    const selected = button.dataset.themeChoice === theme;

    button.classList.toggle("selected", selected);

    if (selected) {
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }
  });

  // The logo uses CSS variables, so the hat colors update automatically.
  const themeColor = getComputedStyle(document.body)
    .getPropertyValue("--bg")
    .trim();

  const themeMeta = $('meta[name="theme-color"]');

  if (themeMeta && themeColor) {
    themeMeta.setAttribute("content", themeColor);
  }

  if (save) {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch (error) {
      console.warn("Theme preference could not be saved.", error);
    }
  }
}

/* -------------------------------------------------------
   APPEARANCE SETTINGS
------------------------------------------------------- */

function initializeAppearanceSettings() {
  const animationToggle = $("#animationToggle");
  const glassToggle = $("#glassToggle");

  let animationEnabled = true;
  let glassEnabled = true;

  try {
    animationEnabled =
      localStorage.getItem(STORAGE_KEYS.animation) !== "false";

    glassEnabled =
      localStorage.getItem(STORAGE_KEYS.glass) !== "false";
  } catch (error) {
    console.warn("Appearance preferences could not be loaded.", error);
  }

  if (animationToggle) {
    animationToggle.checked = animationEnabled;
    applyAnimationPreference(animationEnabled);

    animationToggle.addEventListener("change", () => {
      applyAnimationPreference(animationToggle.checked);

      try {
        localStorage.setItem(
          STORAGE_KEYS.animation,
          String(animationToggle.checked)
        );
      } catch (error) {
        console.warn("Animation preference could not be saved.", error);
      }
    });
  }

  if (glassToggle) {
    glassToggle.checked = glassEnabled;
    applyGlassPreference(glassEnabled);

    glassToggle.addEventListener("change", () => {
      applyGlassPreference(glassToggle.checked);

      try {
        localStorage.setItem(
          STORAGE_KEYS.glass,
          String(glassToggle.checked)
        );
      } catch (error) {
        console.warn("Glass preference could not be saved.", error);
      }
    });
  }
}

function applyAnimationPreference(enabled) {
  document.body.classList.toggle("no-ambient", !enabled);
}

function applyGlassPreference(enabled) {
  document.body.classList.toggle("no-glass", !enabled);
}

/* -------------------------------------------------------
   MOBILE NAVIGATION
------------------------------------------------------- */

function initializeMobileMenu() {
  const menuButton = $("#mobileMenu");

  if (!menuButton) return;

  menuButton.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("sidebar-open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", event => {
    const sidebar = $("#sidebar");

    if (!sidebar || !document.body.classList.contains("sidebar-open")) {
      return;
    }

    const clickedInsideSidebar = sidebar.contains(event.target);
    const clickedMenu = menuButton.contains(event.target);

    if (!clickedInsideSidebar && !clickedMenu) {
      document.body.classList.remove("sidebar-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

/* -------------------------------------------------------
   RUBRIC EDITOR
------------------------------------------------------- */

function initializeGradingForm() {
  const form = $("#gradingForm");
  const addButton = $("#addCriterion");
  const criteriaList = $("#criteriaList");
  const studentAnswer = $("#studentAnswer");

  if (!form || !criteriaList) return;

  addButton.addEventListener("click", addCriterion);

  criteriaList.addEventListener("click", event => {
    const removeButton = event.target.closest(".remove-criterion");

    if (!removeButton) return;

    const rows = $$(".criterion-row", criteriaList);

    if (rows.length <= 1) {
      showToast("Keep at least one rubric criterion.", "error");
      return;
    }

    removeButton.closest(".criterion-row").remove();
    updateRubricTotal();
  });

  criteriaList.addEventListener("input", event => {
    if (event.target.matches(".criterion-points")) {
      updateRubricTotal();
    }
  });

  studentAnswer.addEventListener("input", updateCharacterCount);

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      updateRubricTotal();
      updateCharacterCount();

      state.currentResult = null;
      renderResultPlaceholder();
    }, 0);
  });

  form.addEventListener("submit", handleGradingSubmit);
}

function addCriterion() {
  const criteriaList = $("#criteriaList");
  if (!criteriaList) return;

  const rows = $$(".criterion-row", criteriaList);

  if (rows.length >= 20) {
    showToast("You can add up to 20 criteria.", "error");
    return;
  }

  const row = document.createElement("div");
  row.className = "criterion-row";

  const nameInput = document.createElement("input");
  nameInput.className = "text-input criterion-name";
  nameInput.type = "text";
  nameInput.maxLength = 100;
  nameInput.value = "";
  nameInput.placeholder = "New criterion";
  nameInput.setAttribute("aria-label", "Criterion name");

  const pointsInput = document.createElement("input");
  pointsInput.className = "text-input criterion-points";
  pointsInput.type = "number";
  pointsInput.min = "0";
  pointsInput.max = "1000";
  pointsInput.step = "1";
  pointsInput.value = "10";
  pointsInput.setAttribute("aria-label", "Criterion points");

  const removeButton = document.createElement("button");
  removeButton.className = "remove-criterion";
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", "Remove criterion");
  removeButton.textContent = "×";

  row.append(nameInput, pointsInput, removeButton);
  criteriaList.appendChild(row);

  updateRubricTotal();
  nameInput.focus();
}

function getRubric() {
  const criteria = $$(".criterion-row", $("#criteriaList")).map(row => {
    const name = $(".criterion-name", row).value.trim();
    const rawPoints = Number($(".criterion-points", row).value);

    return {
      name,
      points: Number.isFinite(rawPoints)
        ? Math.max(0, Math.min(1000, rawPoints))
        : 0
    };
  }).filter(item => item.name);

  const totalPoints = criteria.reduce((sum, item) => {
    return sum + item.points;
  }, 0);

  return {
    name: $("#rubricName").value.trim() || "Custom rubric",
    total_points: totalPoints,
    criteria
  };
}

function updateRubricTotal() {
  const totalElement = $("#rubricTotal");
  if (!totalElement) return;

  const rubric = getRubric();
  totalElement.textContent = `${rubric.total_points} pts`;
}

function updateCharacterCount() {
  const answer = $("#studentAnswer");
  const counter = $("#answerCount");

  if (!answer || !counter) return;

  const count = answer.value.length;
  counter.textContent = `${count.toLocaleString()} character${count === 1 ? "" : "s"}`;
}

/* -------------------------------------------------------
   GRADING REQUEST
------------------------------------------------------- */

async function handleGradingSubmit(event) {
  event.preventDefault();

  if (state.busy) return;

  const assignment = $("#assignmentName").value.trim();
  const answer = $("#studentAnswer").value.trim();
  const answerKey = $("#answerKey").value.trim();
  const student = $("#studentName").value.trim();
  const rubric = getRubric();

  if (!assignment || !answer) {
    showToast("Enter an assignment name and student response.", "error");
    return;
  }

  if (!rubric.criteria.length) {
    showToast("Add at least one named rubric criterion.", "error");
    return;
  }

  if (rubric.total_points <= 0) {
    showToast("Your rubric must have a total above zero points.", "error");
    return;
  }

  if (!isBackendConfigured()) {
    showDemoModeNotice();
    return;
  }

  setGradingBusy(true);

  try {
    const formData = new FormData();

    formData.append("test", assignment);
    formData.append("answers", answer);
    formData.append("answer_key", answerKey);
    formData.append("rubric_name", rubric.name);
    formData.append("rubric", JSON.stringify(rubric));

    if (student) {
      formData.append("student", student);
    }

    const response = await fetch(
      `${API_BASE_URL.replace(/\/+$/, "")}/api/grade`,
      {
        method: "POST",
        body: formData
      }
    );

    const responseData = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        responseData.error ||
        responseData.message ||
        `The grading server returned HTTP ${response.status}.`
      );
    }

    const normalized = normalizeGradeResponse(
      responseData,
      assignment,
      student,
      rubric
    );

    state.currentResult = normalized;
    renderGradeReport(normalized);

    showToast("Grading response received.", "success");
  } catch (error) {
    console.error("Grading request failed:", error);

    showResultError(error.message || "Unable to reach the grading server.");

    showToast(
      "The grading request failed. Check your backend connection.",
      "error"
    );
  } finally {
    setGradingBusy(false);
  }
}

function isBackendConfigured() {
  return Boolean(
    API_BASE_URL &&
    !API_BASE_URL.includes("YOUR-SERVICE") &&
    /^https?:\/\//i.test(API_BASE_URL)
  );
}

function showDemoModeNotice() {
  const panel = $("#resultPanel");

  panel.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = "result-report";

  const label = document.createElement("div");
  label.className = "report-label";
  label.textContent = "DEMO MODE";

  const heading = document.createElement("h3");
  heading.style.marginTop = "10px";
  heading.textContent = "Your workspace is ready.";

  const message = document.createElement("p");
  message.className = "report-message";
  message.textContent =
    "The interface is working, but no grading server is connected. No AI grade has been generated and no score has been assigned.";

  const warning = document.createElement("div");
  warning.className = "report-warning";
  warning.textContent =
    "To grade actual work, configure API_BASE_URL in script.js and connect a compatible backend at /api/grade.";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-button report-save";
  button.textContent = "Open connection settings";
  button.addEventListener("click", () => showPage("settings"));

  wrapper.append(label, heading, message, warning, button);
  panel.appendChild(wrapper);

  showToast("Demo mode: no AI grade was generated.");
}

function setGradingBusy(isBusy) {
  state.busy = isBusy;

  const button = $("#gradeButton");
  if (!button) return;

  button.disabled = isBusy;
  button.textContent = isBusy ? "Analyzing..." : "✳ Analyze work ↗";
}

async function readResponse(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The server response was not valid JSON.");
  }
}

function normalizeGradeResponse(data, assignment, student, rubric) {
  /*
   * Adapt the most common response formats.
   * Check your backend's actual response structure if its names differ.
   */
  const result = data.result && typeof data.result === "object"
    ? data.result
    : data;

  const rawScore = result.score ?? result.points_earned ?? result.points;
  const rawTotal = result.total_points ?? result.max_points ?? rubric.total_points;

  const score = Number(rawScore);
  const total = Number(rawTotal);

  const hasValidScore =
    Number.isFinite(score) &&
    Number.isFinite(total) &&
    total > 0;

  const feedback = result.feedback ??
    result.overall_feedback ??
    result.comments ??
    result.explanation ??
    "";

  const criteriaResults =
    Array.isArray(result.criteria_results) ? result.criteria_results :
    Array.isArray(result.breakdown) ? result.breakdown :
    Array.isArray(result.criteria) ? result.criteria :
    [];

  return {
    id: makeId(),
    assignment,
    student,
    date: new Date().toISOString(),
    score: hasValidScore ? score : null,
    total: hasValidScore ? total : null,
    percentage: hasValidScore ? (score / total) * 100 : null,
    feedback: typeof feedback === "string"
      ? feedback
      : JSON.stringify(feedback, null, 2),
    criteriaResults,
    rubricName: rubric.name,
    source: "backend"
  };
}

function renderGradeReport(result) {
  const panel = $("#resultPanel");
  panel.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = "result-report";

  const label = document.createElement("div");
  label.className = "report-label";
  label.textContent = "GRADING RESPONSE";

  const heading = document.createElement("h3");
  heading.style.marginTop = "8px";
  heading.textContent = result.assignment;

  const feedback = document.createElement("div");
  feedback.className = "report-feedback";

  if (result.feedback) {
    feedback.textContent = result.feedback;
  } else {
    feedback.textContent =
      "The server responded, but did not return a feedback summary.";
  }

  wrapper.append(label, heading);

  if (result.score !== null) {
    const score = document.createElement("div");
    score.className = "report-score";

    const percent = document.createElement("div");
    percent.textContent = `${result.percentage.toFixed(1)}%`;

    const points = document.createElement("small");
    points.textContent = ` ${formatNumber(result.score)} / ${formatNumber(result.total)} pts`;

    score.append(percent, points);
    wrapper.appendChild(score);
  } else {
    const noScore = document.createElement("p");
    noScore.className = "report-message";
    noScore.textContent =
      "The server did not return a recognizable numeric score. Review its response format.";
    wrapper.appendChild(noScore);
  }

  if (result.criteriaResults.length) {
    const breakdownHeading = document.createElement("h4");
    breakdownHeading.style.margin = "15px 0 7px";
    breakdownHeading.textContent = "Criteria breakdown";
    wrapper.appendChild(breakdownHeading);

    result.criteriaResults.forEach(item => {
      const row = document.createElement("div");
      row.className = "report-feedback";

      if (typeof item === "string") {
        row.textContent = item;
      } else {
        const criterionName =
          item.name ?? item.criterion ?? item.title ?? "Criterion";

        const criterionScore =
          item.score ?? item.points_earned ?? item.points_awarded;

        const criterionTotal =
          item.total_points ?? item.max_points ?? item.possible_points;

        const criterionFeedback =
          item.feedback ?? item.comment ?? item.explanation ?? "";

        const title = document.createElement("strong");
        title.textContent = String(criterionName);
        row.appendChild(title);

        if (criterionScore !== undefined) {
          const scoreLine = document.createElement("div");
          scoreLine.style.marginTop = "4px";

          scoreLine.textContent =
            `${criterionScore}` +
            (criterionTotal !== undefined ? ` / ${criterionTotal} pts` : " pts");

          row.appendChild(scoreLine);
        }

        if (criterionFeedback) {
          const comment = document.createElement("p");
          comment.style.margin = "5px 0 0";
          comment.textContent = String(criterionFeedback);
          row.appendChild(comment);
        }
      }

      wrapper.appendChild(row);
    });
  }

  const warning = document.createElement("div");
  warning.className = "report-warning";
  warning.textContent =
    "Review this result before using it for an official grade.";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "primary-button report-save";
  saveButton.textContent = "Save grading result";

  saveButton.addEventListener("click", () => {
    saveGradeResult(result);
    saveButton.disabled = true;
    saveButton.textContent = "✓ Result saved";
  });

  wrapper.append(feedback, warning, saveButton);
  panel.appendChild(wrapper);
}

function showResultError(message) {
  const panel = $("#resultPanel");
  panel.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = "result-report";

  const heading = document.createElement("h3");
  heading.textContent = "Unable to complete grading";

  const description = document.createElement("p");
  description.className = "report-message";
  description.textContent = message;

  const button = document.createElement("button");
  button.className = "secondary-button report-save";
  button.type = "button";
  button.textContent = "Review connection settings";
  button.addEventListener("click", () => showPage("settings"));

  wrapper.append(heading, description, button);
  panel.appendChild(wrapper);
}

function renderResultPlaceholder() {
  const panel = $("#resultPanel");
  if (!panel) return;

  panel.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = "result-placeholder";

  const icon = document.createElement("span");
  icon.className = "result-placeholder-icon";
  icon.textContent = "◈";

  const heading = document.createElement("h3");
  heading.textContent = "Your report will appear here";

  const description = document.createElement("p");
  description.textContent =
    "Complete the assessment details and submit the work to begin.";

  wrapper.append(icon, heading, description);
  panel.appendChild(wrapper);
}

/* -------------------------------------------------------
   LOCAL GRADING HISTORY
------------------------------------------------------- */

function initializeHistory() {
  const search = $("#historySearch");
  const clearButton = $("#clearHistory");
  const exportButton = $("#exportHistory");

  if (search) {
    search.addEventListener("input", renderHistory);
  }

  if (clearButton) {
    clearButton.addEventListener("click", clearHistory);
  }

  if (exportButton) {
    exportButton.addEventListener("click", exportHistory);
  }
}

function readHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.history);
    const records = stored ? JSON.parse(stored) : [];

    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.warn("History could not be read.", error);
    return [];
  }
}

function writeHistory(records) {
  try {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("History could not be saved.", error);
    showToast(
      "Could not save history. Browser storage may be full or disabled.",
      "error"
    );
    return false;
  }
}

function saveGradeResult(result) {
  const records = readHistory();

  // Prevent saving the same result more than once.
  if (records.some(record => record.id === result.id)) {
    showToast("This result is already saved.");
    return;
  }

  records.unshift(result);

  if (!writeHistory(records)) return;

  renderHistory();
  updateDashboardStats();

  showToast("Grading result saved to local history.", "success");
}

function renderHistory() {
  const list = $("#historyList");
  const count = $("#historyCount");

  if (!list) return;

  const records = readHistory();
  const query = ($("#historySearch")?.value || "").trim().toLowerCase();

  const filtered = records.filter(record => {
    const searchable = [
      record.assignment,
      record.student,
      record.rubricName,
      record.feedback
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });

  if (count) {
    count.textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;
  }

  list.replaceChildren();

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("span");
    icon.className = "empty-icon";
    icon.textContent = "◷";

    const heading = document.createElement("strong");
    heading.textContent = query ? "No matching records" : "No grading records yet";

    const description = document.createElement("p");
    description.textContent = query
      ? "Try another search term."
      : "Save a grading result to see it here.";

    empty.append(icon, heading, description);

    if (!query) {
      const button = document.createElement("button");
      button.className = "primary-button";
      button.type = "button";
      button.textContent = "Start grading ↗";
      button.addEventListener("click", () => showPage("grade"));
      empty.appendChild(button);
    }

    list.appendChild(empty);
    updateDashboardStats();
    return;
  }

  filtered.forEach(record => {
    const row = document.createElement("article");
    row.className = "history-row";

    const main = document.createElement("div");
    main.className = "history-main";

    const name = document.createElement("strong");
    name.textContent = record.assignment || "Untitled assignment";

    const meta = document.createElement("small");

    const parts = [];

    if (record.student) {
      parts.push(`Student: ${record.student}`);
    }

    if (record.rubricName) {
      parts.push(record.rubricName);
    }

    parts.push(formatDate(record.date));

    meta.textContent = parts.join(" · ");
    main.append(name, meta);

    const score = document.createElement("div");
    score.className = "history-score";

    if (
      Number.isFinite(Number(record.percentage)) &&
      record.percentage !== null
    ) {
      score.textContent = `${Number(record.percentage).toFixed(1)}%`;
    } else {
      score.textContent = "—";
    }

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const viewButton = document.createElement("button");
    viewButton.className = "small-icon-button";
    viewButton.type = "button";
    viewButton.textContent = "↗";
    viewButton.title = "View saved result";
    viewButton.setAttribute("aria-label", `View ${record.assignment || "saved result"}`);

    viewButton.addEventListener("click", () => {
      state.currentResult = record;
      showPage("grade");
      renderGradeReport(record);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "small-icon-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete record";
    deleteButton.setAttribute("aria-label", `Delete ${record.assignment || "saved result"}`);

    deleteButton.addEventListener("click", () => {
      deleteHistoryRecord(record.id);
    });

    actions.append(viewButton, deleteButton);
    row.append(main, score, actions);
    list.appendChild(row);
  });

  updateDashboardStats();
}

function deleteHistoryRecord(id) {
  const records = readHistory();
  const updated = records.filter(record => record.id !== id);

  if (!writeHistory(updated)) return;

  renderHistory();
  showToast("History record deleted.");
}

function clearHistory() {
  const records = readHistory();

  if (!records.length) {
    showToast("There are no records to clear.");
    return;
  }

  const confirmed = window.confirm(
    "Delete all saved grading records from this browser? This cannot be undone."
  );

  if (!confirmed) return;

  if (!writeHistory([])) return;

  renderHistory();
  updateDashboardStats();

  showToast("Grading history cleared.");
}

function exportHistory() {
  const records = readHistory();

  if (!records.length) {
    showToast("There are no records to export.", "error");
    return;
  }

  const exportData = JSON.stringify(records, null, 2);
  downloadTextFile(
    exportData,
    `gradenova-history-${dateForFilename()}.json`,
    "application/json;charset=utf-8"
  );

  showToast("History export prepared.", "success");
}

function updateDashboardStats() {
  const records = readHistory();

  const totalElement = $("#statTotal");
  const averageElement = $("#statAverage");
  const recentElement = $("#statRecent");
  const recentList = $("#recentList");

  if (totalElement) {
    totalElement.textContent = String(records.length);
  }

  const scoredRecords = records.filter(record => {
    return record.percentage !== null &&
      record.percentage !== undefined &&
      Number.isFinite(Number(record.percentage));
  });

  if (averageElement) {
    if (scoredRecords.length) {
      const average = scoredRecords.reduce(
        (sum, record) => sum + Number(record.percentage),
        0
      ) / scoredRecords.length;

      averageElement.textContent = `${average.toFixed(1)}%`;
    } else {
      averageElement.textContent = "—";
    }
  }

  if (recentElement) {
    recentElement.textContent = records.length
      ? formatDate(records[0].date, true)
      : "—";
  }

  if (recentList) {
    recentList.replaceChildren();

    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.textContent = "◷";

      const heading = document.createElement("strong");
      heading.textContent = "Your activity starts here";

      const description = document.createElement("p");
      description.textContent =
        "Grading sessions you save will appear here.";

      const button = document.createElement("button");
      button.className = "secondary-button small-button";
      button.type = "button";
      button.textContent = "Grade your first work";
      button.addEventListener("click", () => showPage("grade"));

      empty.append(icon, heading, description, button);
      recentList.appendChild(empty);
      return;
    }

    records.slice(0, 4).forEach(record => {
      const item = document.createElement("div");
      item.className = "history-row";

      const main = document.createElement("div");
      main.className = "history-main";

      const title = document.createElement("strong");
      title.textContent = record.assignment || "Untitled assignment";

      const date = document.createElement("small");
      date.textContent = formatDate(record.date);

      main.append(title, date);

      const score = document.createElement("div");
      score.className = "history-score";
      score.style.fontSize = "14px";

      score.textContent =
        record.percentage !== null &&
        record.percentage !== undefined &&
        Number.isFinite(Number(record.percentage))
          ? `${Number(record.percentage).toFixed(1)}%`
          : "Saved";

      item.append(main, score);

      item.style.gridTemplateColumns = "minmax(0, 1fr) auto";
      recentList.appendChild(item);
    });
  }
}

/* -------------------------------------------------------
   BACKEND CONNECTION STATUS
------------------------------------------------------- */

function initializeConnectionTest() {
  const button = $("#testConnection");

  if (!button) return;

  button.addEventListener("click", testConnection);
}

function updateConnectionStatus(connected = false, message = "") {
  const sidebarLabel = $("#connectionLabel");
  const title = $("#serviceStatusTitle");
  const description = $("#serviceStatusText");

  const configured = isBackendConfigured();

  if (sidebarLabel) {
    sidebarLabel.textContent = connected
      ? "Grading service connected"
      : "Local preview mode";
  }

  if (title) {
    title.textContent = connected
      ? "Grading service reachable"
      : configured
        ? "Backend configured"
        : "Local preview mode";
  }

  if (description) {
    description.textContent = message || (
      configured
        ? "A backend URL is configured. Test the connection to check availability."
        : "No grading server has been configured in script.js."
    );
  }
}

async function testConnection() {
  const button = $("#testConnection");

  if (!isBackendConfigured()) {
    updateConnectionStatus(
      false,
      "Set API_BASE_URL in script.js to your deployed backend address first."
    );

    showToast("Configure API_BASE_URL before testing.", "error");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Testing...";

  try {
    const base = API_BASE_URL.replace(/\/+$/, "");

    // This assumes your backend exposes a GET /health endpoint.
    const response = await fetch(`${base}/health`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Health check returned HTTP ${response.status}.`);
    }

    updateConnectionStatus(
      true,
      "The health endpoint responded successfully."
    );

    showToast("Backend connection successful.", "success");
  } catch (error) {
    updateConnectionStatus(
      false,
      `Connection failed: ${error.message}. Check the URL, server status, and CORS settings.`
    );

    showToast("Could not reach the backend.", "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

/* -------------------------------------------------------
   UTILITIES
------------------------------------------------------- */

function showToast(message, type = "") {
  const region = $("#toastRegion");
  if (!region) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`.trim();
  toast.textContent = message;
  region.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `gn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

function formatDate(value, compact = false) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, compact
    ? { month: "short", day: "numeric" }
    : {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
  );
}

function dateForFilename() {
  return new Date().toISOString().slice(0, 10);
}

function downloadTextFile(contents, filename, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function handleKeyboardShortcuts(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  ) {
    return;
  }

  if (event.key === "Escape") {
    document.body.classList.remove("sidebar-open");
  }
}

// GradeNova page navigation
// Add AFTER the existing script's final closing "});".

(() => {
  "use strict";

  function initGradeNovaNavigation() {
    const main = document.querySelector(".dashboard-main");
    if (!main) return;

    const hero = main.querySelector(".hero-card");
    const stats = main.querySelector(".stats-grid");
    const grading = document.querySelector("#grading");
    const rubric = document.querySelector("#rubric");
    const answerKey = document.querySelector("#answer-key");
    const results = document.querySelector("#results");
    const history = document.querySelector("#history");
    const settings = document.querySelector("#settings");

    const pages = {
      home: [hero, stats],
      grading: [grading],
      rubric: [grading],
      "answer-key": [grading],
      results: [results],
      history: [history],
      settings: [settings]
    };

    function navigate() {
      const requested = location.hash.replace(/^#/, "") || "home";
      const page = Object.hasOwn(pages, requested) ? requested : "home";
      const visible = new Set(pages[page]);

      // Hide all main sections that do not belong to this page.
      [...main.children].forEach((section) => {
        section.hidden = !visible.has(section);
      });

      // Keep the correct sidebar item highlighted.
      document.querySelectorAll(".nav-link").forEach((link) => {
        const active = link.getAttribute("href") === `#${page}`;
        link.classList.toggle("active", active);
        if (active) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      // Open the relevant subsection when selected.
      if (page === "answer-key" && answerKey) {
        answerKey.open = true;
      }

      // On the rubric and answer-key pages, move directly to that section.
      if (page === "rubric" && rubric) {
        requestAnimationFrame(() => {
          rubric.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      if (page === "answer-key" && answerKey) {
        requestAnimationFrame(() => {
          answerKey.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      // Keep navigation changes accessible to assistive technology.
      main.setAttribute("aria-label", `${page.replace("-", " ")} workspace`);
    }

    window.addEventListener("hashchange", navigate);
    navigate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGradeNovaNavigation, {
      once: true
    });
  } else {
    initGradeNovaNavigation();
  }
})();

/* =========================================
   GRADENOVA: WORKING THEME SELECTOR
   ========================================= */

(() => {
  const themeButtons = document.querySelectorAll(
    "[data-theme-choice], [data-set-theme]"
  );

  if (!themeButtons.length) {
    console.warn(
      "GradeNova: No theme buttons found. Check the theme button HTML."
    );
    return;
  }

  const supportedThemes = [
    "cosmic", "nebula", "matrix", "inferno", "cyberpunk",
    "aurora", "ocean", "deepsea", "forest", "emerald",
    "arctic", "solar", "volcanic", "moon", "holographic",
    "quantum", "synthwave", "sakura", "desert", "light"
  ];

  function applyTheme(themeName) {
    if (!supportedThemes.includes(themeName)) return;

    // Make the selected theme available to all CSS rules.
    document.documentElement.dataset.theme = themeName;
    document.body.dataset.theme = themeName;

    // Update selected button styling and accessibility state.
    themeButtons.forEach((button) => {
      const buttonTheme =
        button.dataset.themeChoice || button.dataset.setTheme;

      const selected = buttonTheme === themeName;

      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    try {
      localStorage.setItem("gradenova-theme", themeName);
    } catch (error) {
      console.warn("GradeNova couldn't save the theme preference.");
    }

    // Notify any other theme effects in the website.
    document.dispatchEvent(
      new CustomEvent("gradenova:themechange", {
        detail: { theme: themeName }
      })
    );
  }

  // Event delegation means theme buttons remain clickable
  // even if the theme list is re-rendered later.
  document.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-theme-choice], [data-set-theme]"
    );

    if (!button) return;

    const themeName =
      button.dataset.themeChoice || button.dataset.setTheme;

    if (supportedThemes.includes(themeName)) {
      event.preventDefault();
      applyTheme(themeName);
    }
  });

  // Restore the saved theme when the website opens.
  let savedTheme = "cosmic";

  try {
    savedTheme = localStorage.getItem("gradenova-theme") || "cosmic";
  } catch (error) {
    // Continue with the default theme.
  }

  applyTheme(savedTheme);
})();
