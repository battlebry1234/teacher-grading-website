
/* ============================================================
   GradeNova — Application Controller
   Frontend interactions, preferences, history, and grading API
   ============================================================ */

"use strict";

const GradeNova = (() => {
  const STORAGE = {
    settings: "gradenova_settings_v1",
    history: "gradenova_history_v1",
    rubrics: "gradenova_rubrics_v1"
  };

  const DEFAULTS = {
    backendUrl: "",
    theme: "light",
    density: "comfortable",
    animations: true,
    defaultTone: "encouraging",
    confirmSave: true,
    showTips: true
  };

  const state = {
    settings: { ...DEFAULTS },
    history: [],
    rubrics: [],
    busy: false,
    activePage: "dashboard"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("GradeNova could not read saved data:", error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("GradeNova could not save local data:", error);
      showToast(
        "Your browser could not save this data. Check available storage.",
        "error"
      );
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "gn-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 10);
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function formatPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return `${Math.round(number * 10) / 10}%`;
  }

  function loadState() {
    const savedSettings = readJSON(STORAGE.settings, {});
    const savedHistory = readJSON(STORAGE.history, []);
    const savedRubrics = readJSON(STORAGE.rubrics, []);

    state.settings = {
      ...DEFAULTS,
      ...(savedSettings && typeof savedSettings === "object"
        ? savedSettings
        : {})
    };

    state.history = Array.isArray(savedHistory) ? savedHistory : [];
    state.rubrics = Array.isArray(savedRubrics) ? savedRubrics : [];
  }

  /* ----------------------------------------------------------
     Notifications
     ---------------------------------------------------------- */

  function showToast(message, type = "info") {
    let container = $("#toastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");

      Object.assign(container.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "9999",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "min(380px, calc(100vw - 36px))",
        pointerEvents: "none"
      });

      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `alert alert-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;

    Object.assign(toast.style, {
      pointerEvents: "auto",
      boxShadow: "var(--shadow)",
      animation: "page-enter 180ms ease both"
    });

    container.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();

      if (container && !container.children.length) {
        container.remove();
      }
    }, 4200);
  }

  /* ----------------------------------------------------------
     Preferences and themes
     ---------------------------------------------------------- */

  function applySettings() {
    const settings = state.settings;
    const body = document.body;

    body.classList.remove(
      "theme-dark",
      "theme-ocean",
      "theme-forest",
      "dark",
      "ocean",
      "forest",
      "density-compact",
      "animations-off"
    );

    body.dataset.theme = settings.theme === "dark"
      ? "light"
      : settings.theme;

    if (settings.theme === "dark") {
      body.classList.add("theme-dark");
    } else if (settings.theme === "ocean") {
      body.classList.add("theme-ocean");
    } else if (settings.theme === "forest") {
      body.classList.add("theme-forest");
    }

    if (settings.density === "compact") {
      body.classList.add("density-compact");
    }

    if (!settings.animations) {
      body.classList.add("animations-off");
    }

    const themeSelect = $("#themeSelect");
    const densitySelect = $("#densitySelect");
    const animationsToggle = $("#animationsToggle");
    const defaultTone = $("#defaultTone");
    const confirmSave = $("#confirmSave");
    const showTips = $("#showTips");
    const backendUrl = $("#backendUrl");

    if (themeSelect) themeSelect.value = settings.theme;
    if (densitySelect) densitySelect.value = settings.density;
    if (animationsToggle) animationsToggle.checked = !!settings.animations;
    if (defaultTone) defaultTone.value = settings.defaultTone;
    if (confirmSave) confirmSave.checked = !!settings.confirmSave;
    if (showTips) showTips.checked = !!settings.showTips;
    if (backendUrl) backendUrl.value = settings.backendUrl || "";

    updateThemeColorMeta();
    updateTipsVisibility();
  }

  function updateThemeColorMeta() {
    let meta = $('meta[name="theme-color"]');

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    const dark = state.settings.theme === "dark";
    meta.content = dark ? "#191b27" : "#f5f6fc";
  }

  function saveSettingsFromForm() {
    const themeSelect = $("#themeSelect");
    const densitySelect = $("#densitySelect");
    const animationsToggle = $("#animationsToggle");
    const defaultTone = $("#defaultTone");
    const confirmSave = $("#confirmSave");
    const showTips = $("#showTips");
    const backendUrl = $("#backendUrl");

    if (themeSelect) {
      const allowed = ["light", "dark", "ocean", "forest"];
      if (allowed.includes(themeSelect.value)) {
        state.settings.theme = themeSelect.value;
      }
    }

    if (densitySelect) {
      state.settings.density =
        densitySelect.value === "compact" ? "compact" : "comfortable";
    }

    if (animationsToggle) {
      state.settings.animations = animationsToggle.checked;
    }

    if (defaultTone) {
      const allowedTones = [
        "encouraging",
        "balanced",
        "direct",
        "detailed"
      ];

      if (allowedTones.includes(defaultTone.value)) {
        state.settings.defaultTone = defaultTone.value;
      }
    }

    if (confirmSave) {
      state.settings.confirmSave = confirmSave.checked;
    }

    if (showTips) {
      state.settings.showTips = showTips.checked;
    }

    if (backendUrl) {
      const result = validateBackendURL(backendUrl.value);

      if (!result.valid) {
        showToast(result.message, "error");
        return false;
      }

      state.settings.backendUrl = result.url;
    }

    const saved = writeJSON(STORAGE.settings, state.settings);

    if (saved) {
      applySettings();
      showToast("Your preferences have been saved.", "success");
    }

    return saved;
  }

  function updateTipsVisibility() {
    const visible = !!state.settings.showTips;

    $$(".tip, [data-tip], .grading-notice").forEach(element => {
      element.hidden = !visible;
    });
  }

  function validateBackendURL(rawValue) {
    const value = String(rawValue || "").trim();

    if (!value) {
      return {
        valid: true,
        url: "",
        message: ""
      };
    }

    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) {
        return {
          valid: false,
          message: "Use a valid HTTP or HTTPS backend URL."
        };
      }

      if (url.username || url.password) {
        return {
          valid: false,
          message: "Do not include a username or password in the backend URL."
        };
      }

      if (url.search || url.hash) {
        return {
          valid: false,
          message: "Remove query parameters and fragments from the backend URL."
        };
      }

      if (
        location.protocol === "https:" &&
        url.protocol === "http:" &&
        !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      ) {
        return {
          valid: false,
          message: "Your HTTPS website needs an HTTPS backend URL."
        };
      }

      return {
        valid: true,
        url: url.origin + url.pathname.replace(/\/+$/, ""),
        message: ""
      };
    } catch {
      return {
        valid: false,
        message: "Enter a complete backend URL, such as https://your-app.onrender.com."
      };
    }
  }

  function getBackendBase() {
    return String(state.settings.backendUrl || "").replace(/\/+$/, "");
  }

  /* ----------------------------------------------------------
     Page navigation
     ---------------------------------------------------------- */

  function navigateTo(pageName) {
    const page = String(pageName || "dashboard")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    const aliases = {
      home: "dashboard",
      grade: "grader",
      grading: "grader",
      "new-grade": "grader"
    };

    const target = aliases[page] || page;
    const pageElement =
      $(`#${target}Page`) ||
      $(`[data-page-content="${target}"]`) ||
      $(`[data-page="${target}"].page`);

    if (!pageElement) {
      return false;
    }

    state.activePage = target;

    $$(".page, .page-content, [data-page-content]").forEach(element => {
      element.hidden = element !== pageElement;
    });

    $$("[data-page], [data-nav]").forEach(element => {
      const name = element.dataset.page || element.dataset.nav;
      const normalized = aliases[name] || name;

      if (element !== pageElement) {
        element.classList.toggle("active", normalized === target);
        if (normalized === target) {
          element.setAttribute("aria-current", "page");
        } else {
          element.removeAttribute("aria-current");
        }
      }
    });

    if (target === "history") renderHistory();
    if (target === "rubrics") renderRubrics();
    if (target === "dashboard") renderDashboard();

    window.scrollTo({ top: 0, behavior: "smooth" });

    return true;
  }

  function setupNavigation() {
    $$("[data-page], [data-nav]").forEach(element => {
      const name = element.dataset.page || element.dataset.nav;

      if (!name || element.matches(".page, .page-content")) {
        return;
      }

      element.addEventListener("click", event => {
        const destination = element.dataset.page || element.dataset.nav;

        if (destination) {
          const target =
            $(`#${destination}Page`) ||
            $(`[data-page-content="${destination}"]`) ||
            $(`[data-page="${destination}"].page`);

          if (target) {
            event.preventDefault();
            navigateTo(destination);
          }
        }
      });
    });

    $$("[data-go-to]").forEach(element => {
      element.addEventListener("click", () => {
        navigateTo(element.dataset.goTo);
      });
    });
  }

  /* ----------------------------------------------------------
     Grading form and backend
     ---------------------------------------------------------- */

  function getFormValues() {
    const form = $("#gradeForm");

    const read = (name, fallback = "") => {
      const element =
        form?.elements?.namedItem(name) ||
        $(`#${name}`);

      return element ? String(element.value ?? "").trim() : fallback;
    };

    return {
      title:
        read("assignmentTitle") ||
        read("title") ||
        "Untitled assignment",
      studentName: read("studentName"),
      assignment: read("assignmentPrompt") || read("prompt"),
      studentWork: read("studentWork") || read("work"),
      subject: read("subject"),
      gradeLevel: read("gradeLevel"),
      rubric: read("rubric"),
      tone: read("tone", state.settings.defaultTone) ||
        state.settings.defaultTone,
      maxPoints: read("maxPoints", "100"),
      additionalInstructions: read("additionalInstructions")
    };
  }

  function validateGradeForm(values) {
    if (!values.studentWork) {
      return "Please enter the student's work before grading.";
    }

    if (values.studentWork.length < 10) {
      return "Please provide a little more student work so it can be evaluated fairly.";
    }

    if (values.studentWork.length > 50000) {
      return "The student work is too long. Please keep it under 50,000 characters.";
    }

    const maxPoints = Number(values.maxPoints);

    if (!Number.isFinite(maxPoints) || maxPoints <= 0 || maxPoints > 10000) {
      return "Maximum points must be a number between 1 and 10,000.";
    }

    return "";
  }

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();

    return { message: text };
  }

  function extractError(payload, status) {
    if (payload && typeof payload === "object") {
      if (typeof payload.error === "string") return payload.error;
      if (typeof payload.detail === "string") return payload.detail;
      if (typeof payload.message === "string") return payload.message;
    }

    return `The grading request failed (HTTP ${status}). Please try again.`;
  }

  async function requestGrade(values) {
    const base = getBackendBase();

    if (!base) {
      throw new Error(
        "Your backend URL isn't configured yet. Open Settings and enter your deployed Render backend URL."
      );
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(`${base}/api/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(values),
        signal: controller.signal
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(extractError(payload, response.status));
      }

      if (!payload || typeof payload !== "object") {
        throw new Error("The backend returned an unexpected response.");
      }

      return payload;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Grading took too long. Please try again.");
      }

      if (error instanceof TypeError) {
        throw new Error(
          "Couldn't reach the backend. Check the Render URL, deployment status, and backend CORS settings."
        );
      }

      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function setGradingBusy(busy) {
    state.busy = busy;

    const submit = $('#gradeForm button[type="submit"]');

    if (submit) {
      if (!submit.dataset.originalText) {
        submit.dataset.originalText = submit.textContent.trim();
      }

      submit.disabled = busy;
      submit.textContent = busy
        ? "Grading in progress…"
        : submit.dataset.originalText || "Grade work";
    }

    const panel = $("#reportPanel");

    if (panel && busy) {
      panel.hidden = false;
      panel.setAttribute("aria-live", "polite");
      panel.innerHTML = `
        <div class="loading-state">
          <span class="spinner" aria-hidden="true"></span>
          <span>Evaluating the work. This may take a moment…</span>
        </div>
      `;
    }
  }

  function normalizeGradeResult(payload, values) {
    const result = payload.result && typeof payload.result === "object"
      ? payload.result
      : payload;

    const rawScore = result.score ??
      result.points ??
      result.total_score ??
      result.grade;

    const maxPoints = Number(
      result.maxPoints ??
      result.max_points ??
      values.maxPoints ??
      100
    );

    let score = Number(rawScore);

    if (!Number.isFinite(score)) {
      score = null;
    }

    const percentage = score === null
      ? null
      : (
          result.percentage !== undefined
            ? Number(result.percentage)
            : (maxPoints > 0 ? score / maxPoints * 100 : null)
        );

    return {
      id: createId(),
      title: values.title,
      studentName: values.studentName,
      subject: values.subject,
      gradeLevel: values.gradeLevel,
      createdAt: new Date().toISOString(),
      score,
      maxPoints,
      percentage: Number.isFinite(percentage) ? percentage : null,
      letterGrade: result.letterGrade ?? result.letter_grade ?? "",
      summary: result.summary ?? result.overall_feedback ?? result.feedback ?? "",
      strengths: normalizeList(result.strengths ?? result.positive_points),
      improvements: normalizeList(
        result.improvements ??
        result.areas_for_improvement ??
        result.suggestions
      ),
      criteria: normalizeList(result.criteria ?? result.rubric_scores),
      raw: result
    };
  }

  function normalizeList(value) {
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const title = item.title ?? item.name ?? item.criterion ?? "";
          const detail = item.feedback ?? item.comment ?? item.description ?? "";
          const score = item.score ?? item.points;

          return [title, detail, score !== undefined ? `Score: ${score}` : ""]
            .filter(Boolean)
            .join(" — ");
        }

        return String(item ?? "");
      });
    }

    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }

    return [];
  }

  async function handleGradeSubmit(event) {
    event.preventDefault();

    if (state.busy) return;

    const values = getFormValues();
    const validationError = validateGradeForm(values);

    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setGradingBusy(true);

    try {
      const payload = await requestGrade(values);
      const record = normalizeGradeResult(payload, values);

      state.history.unshift(record);
      state.history = state.history.slice(0, 200);

      const saved = writeJSON(STORAGE.history, state.history);

      renderReport(record);
      renderDashboard();

      if (saved) {
        showToast("Grading completed and saved to history.", "success");
      }

      const panel = $("#reportPanel");

      if (panel) {
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      console.error("GradeNova grading error:", error);

      const panel = $("#reportPanel");

      if (panel) {
        panel.hidden = false;
        panel.innerHTML = `
          <div class="alert alert-danger" role="alert">
            <div>
              <strong>Grading couldn't be completed.</strong>
              <p>${escapeHTML(error.message || "An unexpected error occurred.")}</p>
            </div>
          </div>
        `;
      }

      showToast(error.message || "Something went wrong while grading.", "error");
    } finally {
      setGradingBusy(false);
    }
  }

  /* ----------------------------------------------------------
     Report rendering
     ---------------------------------------------------------- */

  function renderReport(record) {
    const panel = $("#reportPanel");

    if (!panel) return;

    const scoreText = record.score === null
      ? "Not provided"
      : `${escapeHTML(record.score)} / ${escapeHTML(record.maxPoints)}`;

    const percentage = record.percentage === null
      ? null
      : Math.max(0, Math.min(100, record.percentage));

    const listHTML = (items, emptyText) => {
      if (!items.length) {
        return `<p class="muted">${escapeHTML(emptyText)}</p>`;
      }

      return `
        <ul class="feedback-list">
          ${items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}
        </ul>
      `;
    };

    const criteriaHTML = record.criteria.length
      ? record.criteria.map(item => `
          <div class="rubric-row">
            <span>${escapeHTML(item)}</span>
          </div>
        `).join("")
      : `<p class="muted">No separate rubric breakdown was returned.</p>`;

    panel.hidden = false;
    panel.innerHTML = `
      <div class="card report-card">
        <div class="report-header">
          <div>
            <span class="eyebrow">Grading report</span>
            <h2>${escapeHTML(record.title)}</h2>
            <p class="muted">
              ${escapeHTML(record.subject || "General")}
              ${record.gradeLevel ? ` · ${escapeHTML(record.gradeLevel)}` : ""}
            </p>
          </div>
          <div class="report-score">
            <strong>${percentage === null ? "—" : `${Math.round(percentage)}%`}</strong>
            <span>${scoreText}</span>
            ${record.letterGrade
              ? `<span>${escapeHTML(record.letterGrade)}</span>`
              : ""}
          </div>
        </div>

        ${percentage === null ? "" : `
          <div
            class="score-bar"
            role="progressbar"
            aria-label="Grade percentage"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${Math.round(percentage)}"
          >
            <span style="width:${percentage}%"></span>
          </div>
        `}

        <div class="report-section">
          <h3>Overall feedback</h3>
          <p>${escapeHTML(record.summary || "No overall feedback was returned.")}</p>
        </div>

        <div class="report-section">
          <h3>Strengths</h3>
          ${listHTML(record.strengths, "No separate strengths were returned.")}
        </div>

        <div class="report-section">
          <h3>Areas to improve</h3>
          ${listHTML(record.improvements, "No separate improvement suggestions were returned.")}
        </div>

        <div class="report-section">
          <h3>Rubric breakdown</h3>
          ${criteriaHTML}
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-export-report="${escapeHTML(record.id)}">
            Export report
          </button>
          <button class="btn btn-ghost" type="button" data-copy-report="${escapeHTML(record.id)}">
            Copy feedback
          </button>
        </div>
      </div>
    `;

    const exportButton = $("[data-export-report]", panel);
    const copyButton = $("[data-copy-report]", panel);

    if (exportButton) {
      exportButton.addEventListener("click", () => exportReport(record));
    }

    if (copyButton) {
      copyButton.addEventListener("click", () => copyReport(record));
    }
  }

  function reportAsText(record) {
    return [
      `GradeNova Report: ${record.title}`,
      `Date: ${formatDate(record.createdAt)}`,
      `Subject: ${record.subject || "General"}`,
      `Student: ${record.studentName || "Not specified"}`,
      `Score: ${record.score === null ? "Not provided" : `${record.score} / ${record.maxPoints}`}`,
      `Percentage: ${record.percentage === null ? "Not provided" : formatPercent(record.percentage)}`,
      "",
      "OVERALL FEEDBACK",
      record.summary || "No overall feedback.",
      "",
      "STRENGTHS",
      ...(record.strengths.length ? record.strengths : ["None provided."])
        .map(item => `- ${item}`),
      "",
      "AREAS TO IMPROVE",
      ...(record.improvements.length ? record.improvements : ["None provided."])
        .map(item => `- ${item}`),
      "",
      "RUBRIC BREAKDOWN",
      ...(record.criteria.length ? record.criteria : ["None provided."])
        .map(item => `- ${item}`)
    ].join("\n");
  }

  function exportReport(record) {
    const blob = new Blob([reportAsText(record)], {
      type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `gradenova-report-${record.id.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyReport(record) {
    try {
      await navigator.clipboard.writeText(reportAsText(record));
      showToast("Report copied to clipboard.", "success");
    } catch {
      showToast("Clipboard access isn't available in this browser.", "error");
    }
  }

  /* ----------------------------------------------------------
     History
     ---------------------------------------------------------- */

  function renderHistory(filter = "") {
    const container =
      $("#historyList") ||
      $("#historyContainer") ||
      $("[data-history-list]");

    if (!container) return;

    const query = filter.trim().toLowerCase();

    const records = state.history.filter(record => {
      const searchable = [
        record.title,
        record.studentName,
        record.subject,
        record.summary
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">▤</div>
          <h3>${query ? "No matching reports" : "Your history is empty"}</h3>
          <p>
            ${query
              ? "Try a different search term."
              : "Completed grading reports will appear here on this device."}
          </p>
          ${query ? "" : `
            <button class="btn btn-primary" type="button" data-go-to="grader">
              Grade an assignment
            </button>
          `}
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="history-list">
        ${records.map(record => `
          <article class="history-item">
            <div class="min-w-0">
              <h3>${escapeHTML(record.title || "Untitled assignment")}</h3>
              <p>
                ${escapeHTML(record.subject || "General")}
                ${record.studentName ? ` · ${escapeHTML(record.studentName)}` : ""}
                · ${escapeHTML(formatDate(record.createdAt))}
              </p>
              <div class="history-meta">
                ${record.percentage === null
                  ? '<span class="badge">Score unavailable</span>'
                  : `<span class="badge badge-primary">${escapeHTML(formatPercent(record.percentage))}</span>`}
                ${record.letterGrade
                  ? `<span class="badge">${escapeHTML(record.letterGrade)}</span>`
                  : ""}
              </div>
            </div>
            <div class="action-group">
              <button class="btn btn-secondary btn-sm" type="button" data-view-report="${escapeHTML(record.id)}">
                View
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-export-history="${escapeHTML(record.id)}">
                Export
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-delete-history="${escapeHTML(record.id)}">
                Delete
              </button>
            </div>
          </article>
        `).join("")}
      </div>
    `;

    $$("[data-view-report]", container).forEach(button => {
      button.addEventListener("click", () => {
        const record = state.history.find(item =>
          item.id === button.dataset.viewReport
        );

        if (record) {
          navigateTo("grader");
          renderReport(record);
        }
      });
    });

    $$("[data-export-history]", container).forEach(button => {
      button.addEventListener("click", () => {
        const record = state.history.find(item =>
          item.id === button.dataset.exportHistory
        );

        if (record) exportReport(record);
      });
    });

    $$("[data-delete-history]", container).forEach(button => {
      button.addEventListener("click", () => {
        deleteHistoryRecord(button.dataset.deleteHistory);
      });
    });

    $$("[data-go-to]", container).forEach(button => {
      button.addEventListener("click", () => {
        navigateTo(button.dataset.goTo);
      });
    });
  }

  function deleteHistoryRecord(id) {
    const record = state.history.find(item => item.id === id);

    if (!record) return;

    if (
      state.settings.confirmSave &&
      !window.confirm(`Delete the report "${record.title}" from this device?`)
    ) {
      return;
    }

    state.history = state.history.filter(item => item.id !== id);

    if (writeJSON(STORAGE.history, state.history)) {
      renderHistory($("#historySearch")?.value || "");
      renderDashboard();
      showToast("Report deleted from this device.", "success");
    }
  }

  function setupHistorySearch() {
    const search = $("#historySearch");

    if (!search) return;

    search.addEventListener("input", () => {
      renderHistory(search.value);
    });
  }

  /* ----------------------------------------------------------
     Dashboard
     ---------------------------------------------------------- */

  function renderDashboard() {
    const count = state.history.length;

    const scored = state.history.filter(record =>
      Number.isFinite(record.percentage)
    );

    const average = scored.length
      ? scored.reduce((total, record) => total + record.percentage, 0) /
        scored.length
      : null;

    const values = {
      totalGrades: String(count),
      averageGrade: average === null ? "—" : formatPercent(average),
      reportsThisWeek: String(
        state.history.filter(record => {
          const date = new Date(record.createdAt);
          const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

          return !Number.isNaN(date.getTime()) && date.getTime() >= cutoff;
        }).length
      )
    };

    Object.entries(values).forEach(([id, value]) => {
      const element = $(`#${id}`);

      if (element) element.textContent = value;
    });

    const recent = $("#recentActivity");

    if (recent) {
      const records = state.history.slice(0, 5);

      if (!records.length) {
        recent.innerHTML = `
          <div class="empty-state">
            <h3>Welcome to GradeNova</h3>
            <p>Your recent grading reports will appear here.</p>
            <button class="btn btn-primary" type="button" data-go-to="grader">
              Start grading
            </button>
          </div>
        `;
      } else {
        recent.innerHTML = records.map(record => `
          <div class="history-item">
            <div class="min-w-0">
              <h3>${escapeHTML(record.title)}</h3>
              <p>${escapeHTML(formatDate(record.createdAt))}</p>
            </div>
            <span class="badge badge-primary">
              ${record.percentage === null
                ? "—"
                : escapeHTML(formatPercent(record.percentage))}
            </span>
          </div>
        `).join("");
      }

      $$("[data-go-to]", recent).forEach(button => {
        button.addEventListener("click", () => navigateTo(button.dataset.goTo));
      });
    }
  }

  /* ----------------------------------------------------------
     Rubrics
     ---------------------------------------------------------- */

  function renderRubrics() {
    const container =
      $("#rubricList") ||
      $("#rubricsList") ||
      $("[data-rubric-list]");

    if (!container) return;

    if (!state.rubrics.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">✓</div>
          <h3>No saved rubrics yet</h3>
          <p>Save reusable grading criteria here as this feature is developed.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.rubrics.map(rubric => `
      <article class="rubric-card">
        <div class="rubric-card-header">
          <div>
            <h3>${escapeHTML(rubric.name)}</h3>
            <p>${escapeHTML(rubric.description || "No description")}</p>
          </div>
          <span class="badge">${escapeHTML(rubric.criteria.length)} criteria</span>
        </div>
        <div class="rubric-actions">
          <button class="btn btn-secondary btn-sm" type="button" data-use-rubric="${escapeHTML(rubric.id)}">
            Use rubric
          </button>
          <button class="btn btn-ghost btn-sm" type="button" data-delete-rubric="${escapeHTML(rubric.id)}">
            Delete
          </button>
        </div>
      </article>
    `).join("");

    $$("[data-use-rubric]", container).forEach(button => {
      button.addEventListener("click", () => {
        const rubric = state.rubrics.find(item =>
          item.id === button.dataset.useRubric
        );

        if (!rubric) return;

        const rubricField = $("#rubric");

        if (rubricField) {
          rubricField.value = rubric.criteria
            .map(item => `${item.name}: ${item.description || ""}`)
            .join("\n");
        }

        navigateTo("grader");
        showToast("Rubric added to the grading form.", "success");
      });
    });

    $$("[data-delete-rubric]", container).forEach(button => {
      button.addEventListener("click", () => {
        const rubric = state.rubrics.find(item =>
          item.id === button.dataset.deleteRubric
        );

        if (!rubric) return;

        if (!window.confirm(`Delete rubric "${rubric.name}"?`)) return;

        state.rubrics = state.rubrics.filter(item => item.id !== rubric.id);

        if (writeJSON(STORAGE.rubrics, state.rubrics)) {
          renderRubrics();
          showToast("Rubric deleted.", "success");
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Backend connection test
     ---------------------------------------------------------- */

  async function testBackend() {
    const button = $("#testBackend");
    const input = $("#backendUrl");
    const raw = input ? input.value : state.settings.backendUrl;

    const validation = validateBackendURL(raw);

    if (!validation.valid) {
      showToast(validation.message, "error");
      return;
    }

    if (!validation.url) {
      showToast("Enter your backend URL first.", "error");
      return;
    }

    const originalText = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = "Testing…";
    }

    try {
      const response = await fetch(`${validation.url}/health`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(12000)
          : undefined
      });

      if (!response.ok) {
        throw new Error(`The backend responded with HTTP ${response.status}.`);
      }

      showToast("Backend is reachable.", "success");
    } catch (error) {
      console.error("Backend connection test failed:", error);

      showToast(
        error.message ||
        "Couldn't reach the backend. Check the URL and Render deployment.",
        "error"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText || "Test connection";
      }
    }
  }

  /* ----------------------------------------------------------
     Data management
     ---------------------------------------------------------- */

  function clearLocalData() {
    const confirmed = window.confirm(
      "This will permanently remove GradeNova's locally saved grading history, rubrics, and preferences from this browser. Continue?"
    );

    if (!confirmed) return;

    state.history = [];
    state.rubrics = [];
    state.settings = { ...DEFAULTS };

    try {
      localStorage.removeItem(STORAGE.history);
      localStorage.removeItem(STORAGE.rubrics);
      localStorage.removeItem(STORAGE.settings);
    } catch (error) {
      console.error("Could not clear local storage:", error);
    }

    applySettings();
    renderDashboard();
    renderHistory();
    renderRubrics();

    const reportPanel = $("#reportPanel");

    if (reportPanel) {
      reportPanel.innerHTML = "";
      reportPanel.hidden = true;
    }

    showToast("Local GradeNova data has been cleared.", "success");
  }

  /* ----------------------------------------------------------
     Form and button event wiring
     ---------------------------------------------------------- */

  function setupGradeForm() {
    const form = $("#gradeForm");

    if (!form) return;

    form.addEventListener("submit", handleGradeSubmit);

    const work = $("#studentWork");

    if (work) {
      const counter = $("#studentWorkCounter");

      const updateCounter = () => {
        if (counter) {
          counter.textContent = `${work.value.length.toLocaleString()} characters`;
        }
      };

      work.addEventListener("input", updateCounter);
      updateCounter();
    }
  }

  function setupSettings() {
    const saveButton = $("#savePreferences");

    if (saveButton) {
      saveButton.addEventListener("click", saveSettingsFromForm);
    }

    const saveBackend = $("#saveBackend");

    if (saveBackend) {
      saveBackend.addEventListener("click", () => {
        const input = $("#backendUrl");
        const validation = validateBackendURL(input?.value || "");

        if (!validation.valid) {
          showToast(validation.message, "error");
          return;
        }

        state.settings.backendUrl = validation.url;

        if (writeJSON(STORAGE.settings, state.settings)) {
          applySettings();
          showToast("Backend URL saved on this device.", "success");
        }
      });
    }

    const testButton = $("#testBackend");

    if (testButton) {
      testButton.addEventListener("click", testBackend);
    }

    const clearButton = $("#clearLocalData");

    if (clearButton) {
      clearButton.addEventListener("click", clearLocalData);
    }

    [
      "#themeSelect",
      "#densitySelect",
      "#animationsToggle",
      "#defaultTone",
      "#confirmSave",
      "#showTips"
    ].forEach(selector => {
      const element = $(selector);

      if (!element) return;

      element.addEventListener("change", () => {
        saveSettingsFromForm();
      });
    });
  }

  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", event => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        )
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
        const form = $("#gradeForm");

        if (form && state.activePage === "grader") {
          event.preventDefault();

          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          }
        }
      }

      if (event.key === "Escape") {
        const modal = $(".modal-backdrop:not([hidden])");

        if (modal) modal.hidden = true;
      }
    });
  }

  function setupGlobalButtons() {
    $$("[data-clear-history]").forEach(button => {
      button.addEventListener("click", () => {
        if (!state.history.length) {
          showToast("There is no grading history to clear.", "info");
          return;
        }

        if (!window.confirm("Delete all saved grading history on this device?")) {
          return;
        }

        state.history = [];

        if (writeJSON(STORAGE.history, state.history)) {
          renderHistory();
          renderDashboard();
          showToast("Grading history cleared.", "success");
        }
      });
    });

    $$("[data-theme-choice]").forEach(button => {
      button.addEventListener("click", () => {
        const theme = button.dataset.themeChoice;

        if (!["light", "dark", "ocean", "forest"].includes(theme)) return;

        state.settings.theme = theme;

        if (writeJSON(STORAGE.settings, state.settings)) {
          applySettings();
          showToast(`Theme changed to ${theme}.`, "success");
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Initialization
     ---------------------------------------------------------- */

  function init() {
    loadState();
    applySettings();
    setupNavigation();
    setupGradeForm();
    setupSettings();
    setupHistorySearch();
    setupKeyboardShortcuts();
    setupGlobalButtons();

    renderDashboard();
    renderHistory();
    renderRubrics();

    const initialPage =
      $(".page.active")?.dataset.page ||
      $("[data-page-content]:not([hidden])")?.dataset.pageContent ||
      "dashboard";

    navigateTo(initialPage);

    console.info("GradeNova initialized.");
  }

  return {
    init,
    navigateTo,
    renderDashboard,
    renderHistory,
    renderRubrics,
    showToast,
    exportReport,
    getState: () => ({
      activePage: state.activePage,
      historyCount: state.history.length,
      rubricCount: state.rubrics.length
    })
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", GradeNova.init, { once: true });
} else {
  GradeNova.init();
}
