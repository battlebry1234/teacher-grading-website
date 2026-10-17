
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const PREFS_KEY = "gradenova-preferences";
  const HISTORY_KEY = "gradenova-history";

  const themes = {
    cosmic: "A cinematic deep-space scene with stars, planets, and violet nebula light.",
    ocean: "A deep underwater scene with blue light and drifting rays.",
    forest: "A moonlit woodland with dark trees and soft mist.",
    inferno: "A volcanic atmosphere with warm ember light.",
    light: "A clean, bright workspace."
  };

  const body = document.body;
  const form = $("#grading-form");
  const criteriaList = $("#rubric-criteria");
  const themeSelect = $("#settings-theme");
  const motionMain = $("#settings-motion");
  const motionSecondary = $("#settings-motion-secondary");
  let lastResult = null;

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function getPrefs() {
    return readJSON(PREFS_KEY, {});
  }

  function setStatus(selector, message, kind = "") {
    const el = $(selector);
    if (!el) return;
    el.textContent = message;
    el.classList.remove("error", "success");
    if (kind) el.classList.add(kind);
  }

  // TABS: only one main screen is shown at a time.
  function showTab(name) {
    const target = $(`[data-tab="${name}"]`);
    if (!target) return;

    $$(".tab-panel").forEach(panel => {
      const active = panel.dataset.tab === name;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });

    $$("[data-tab-target]").forEach(button => {
      const active = button.dataset.tabTarget === name;
      button.classList.toggle("active", active);
      if (button.matches(".nav-item")) {
        button.setAttribute("aria-current", active ? "page" : "false");
      }
    });

    if (location.hash !== `#${name}`) {
      history.replaceState(null, "", `#${name}`);
    }
    window.scrollTo({ top: 0, behavior: body.classList.contains("motion-off") ? "auto" : "smooth" });
  }

  $$("[data-tab-target]").forEach(button => {
    button.addEventListener("click", () => showTab(button.dataset.tabTarget));
  });

  // THEME SELECTION.
  function applyTheme(theme, persist = true) {
    if (!Object.hasOwn(themes, theme)) theme = "cosmic";
    body.dataset.theme = theme;

    if (themeSelect) themeSelect.value = theme;

    $$("[data-set-theme]").forEach(button => {
      const selected = button.dataset.setTheme === theme;
      button.classList.toggle("active", selected);
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const meta = $('meta[name="theme-color"]');
    if (meta) {
      meta.content = ({
        cosmic: "#070b1c", ocean: "#031a2b", forest: "#03160f",
        inferno: "#190908", light: "#eaf0ff"
      })[theme];
    }

    if (persist) writeJSON(PREFS_KEY, { ...getPrefs(), theme });
  }

  $$("[data-set-theme]").forEach(button => {
    button.addEventListener("click", () => applyTheme(button.dataset.setTheme));
  });

  themeSelect?.addEventListener("change", () => applyTheme(themeSelect.value));

  // ACCENT COLOR CUSTOMIZATION.
  function applyAccent(color, persist = true) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    body.style.setProperty("--accent", color);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    body.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);

    $$("[data-accent]").forEach(button => {
      const selected = button.dataset.accent.toLowerCase() === color.toLowerCase();
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    if (persist) writeJSON(PREFS_KEY, { ...getPrefs(), accent: color });
  }

  $$("[data-accent]").forEach(button => {
    button.addEventListener("click", () => applyAccent(button.dataset.accent));
  });

  // MOTION PREFERENCE: both switches stay in sync.
  function applyMotion(enabled, persist = true) {
    body.classList.toggle("motion-off", !enabled);
    if (motionMain) motionMain.checked = enabled;
    if (motionSecondary) motionSecondary.checked = enabled;
    const particles = $("#ambient-particles");
    if (particles) particles.hidden = !enabled;
    if (persist) writeJSON(PREFS_KEY, { ...getPrefs(), motion: enabled });
  }

  motionMain?.addEventListener("change", () => applyMotion(motionMain.checked));
  motionSecondary?.addEventListener("change", () => applyMotion(motionSecondary.checked));

  // BACKGROUND PARTICLES.
  function createParticles() {
    const container = $("#ambient-particles");
    if (!container || container.childElementCount) return;
    for (let i = 0; i < 32; i++) {
      const particle = document.createElement("span");
      particle.className = "ambient-particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${12 + Math.random() * 20}s`;
      particle.style.animationDelay = `${-Math.random() * 20}s`;
      particle.style.opacity = `${0.2 + Math.random() * 0.6}`;
      container.appendChild(particle);
    }
  }

  // RUBRIC BUILDER.
  function addCriterion(name = "", points = 0) {
    const row = document.createElement("div");
    row.className = "criterion-row";

    const nameLabel = document.createElement("label");
    nameLabel.className = "field";
    const nameTitle = document.createElement("span");
    nameTitle.textContent = "Criterion";
    const nameInput = document.createElement("input");
    nameInput.className = "criterion-name";
    nameInput.value = name;
    nameInput.placeholder = "e.g. Evidence and reasoning";
    nameInput.required = true;
    nameLabel.append(nameTitle, nameInput);

    const pointsLabel = document.createElement("label");
    pointsLabel.className = "field points-field";
    const pointsTitle = document.createElement("span");
    pointsTitle.textContent = "Points";
    const pointsInput = document.createElement("input");
    pointsInput.className = "criterion-points";
    pointsInput.type = "number";
    pointsInput.min = "0";
    pointsInput.value = String(points);
    pointsInput.required = true;
    pointsLabel.append(pointsTitle, pointsInput);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button remove-criterion";
    remove.setAttribute("aria-label", "Remove criterion");
    remove.textContent = "×";

    row.append(nameLabel, pointsLabel, remove);
    criteriaList.appendChild(row);
    updateRubricTotal();
  }

  $("#add-criterion")?.addEventListener("click", () => addCriterion());

  criteriaList?.addEventListener("click", event => {
    const remove = event.target.closest(".remove-criterion");
    if (!remove) return;
    if ($$(".criterion-row", criteriaList).length <= 1) {
      setStatus("#grading-status", "Keep at least one rubric criterion.", "error");
      return;
    }
    remove.closest(".criterion-row").remove();
    updateRubricTotal();
  });

  criteriaList?.addEventListener("input", updateRubricTotal);
  $("#total-points")?.addEventListener("input", updateRubricTotal);

  function collectRubric() {
    const criteria = $$(".criterion-row", criteriaList).map(row => ({
      name: $(".criterion-name", row).value.trim(),
      points: Number($(".criterion-points", row).value)
    }));
    return {
      name: $("#rubric-name").value.trim(),
      totalPoints: Number($("#total-points").value),
      strictness: $("#grading-strictness").value,
      instructions: $("#rubric-instructions").value.trim(),
      criteria
    };
  }

  function updateRubricTotal() {
    if (!criteriaList) return;
    const rubric = collectRubric();
    const sum = rubric.criteria.reduce((total, item) => total + (Number.isFinite(item.points) ? item.points : 0), 0);
    const total = rubric.totalPoints;
    const el = $("#rubric-total");
    if (!el) return;
    el.textContent = `Rubric points: ${sum} / ${total}`;
    el.classList.toggle("error", sum !== total);
  }

  function getHistory() {
    const historyItems = readJSON(HISTORY_KEY, []);
    return Array.isArray(historyItems) ? historyItems : [];
  }

  function saveHistory(entry) {
    const items = getHistory();
    items.push(entry);
    writeJSON(HISTORY_KEY, items.slice(-50));
    renderHistory();
  }

  function renderHistory() {
    const list = $("#history-list");
    const count = $("#history-count");
    if (!list) return;
    const items = getHistory();
    if (count) count.textContent = `${items.length} session${items.length === 1 ? "" : "s"} saved`;

    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const icon = document.createElement("span");
      icon.textContent = "◷";
      const title = document.createElement("strong");
      title.textContent = "No sessions yet";
      const message = document.createElement("p");
      message.textContent = "Prepared grading requests will appear here.";
      empty.append(icon, title, message);
      list.appendChild(empty);
      return;
    }

    items.slice().reverse().forEach(item => {
      const card = document.createElement("article");
      card.className = "history-entry";

      const top = document.createElement("div");
      top.className = "history-entry-top";
      const title = document.createElement("strong");
      title.textContent = item.rubricName || "Untitled grading session";
      const time = document.createElement("span");
      time.className = "entry-time";
      time.textContent = item.date || "";
      top.append(title, time);

      const detail = document.createElement("p");
      detail.textContent = `${item.totalPoints} possible points · ${item.criteriaCount} criteria · ${item.status}`;

      const open = document.createElement("button");
      open.type = "button";
      open.className = "button secondary small";
      open.style.marginTop = "12px";
      open.textContent = "View details";
      open.addEventListener("click", () => {
        showTab("results");
        renderSavedRequest(item);
      });

      card.append(top, detail, open);
      list.appendChild(card);
    });
  }

  function renderSavedRequest(item) {
    const target = $("#results-content");
    if (!target) return;
    target.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = item.rubricName || "Saved grading request";
    const description = document.createElement("p");
    description.className = "muted";
    description.textContent = `Saved ${item.date || ""}. This is a request record, not an AI-generated grade.`;
    const score = document.createElement("div");
    score.className = "result-score";
    score.textContent = "Not graded";
    const note = document.createElement("p");
    note.textContent = item.status || "No grading result was returned.";
    target.append(heading, description, score, note);
  }

  // GRADING: use the configured backend or clearly save a request draft.
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const rubric = collectRubric();
    const test = $("#test-input").value.trim();
    const answers = $("#answers-input").value.trim();

    if (!test || !answers) {
      setStatus("#grading-status", "Please enter both the test and the student's answers.", "error");
      return;
    }
    if (!Number.isFinite(rubric.totalPoints) || rubric.totalPoints <= 0) {
      setStatus("#grading-status", "Enter a valid total point value.", "error");
      return;
    }
    if (rubric.criteria.some(item => !item.name || !Number.isFinite(item.points) || item.points < 0)) {
      setStatus("#grading-status", "Check that every criterion has a name and a valid point value.", "error");
      return;
    }

    const sum = rubric.criteria.reduce((total, item) => total + item.points, 0);
    if (sum !== rubric.totalPoints) {
      setStatus("#grading-status", `Your rubric adds up to ${sum} points, but the total is ${rubric.totalPoints}. Adjust the criteria first.`, "error");
      return;
    }

    const entry = {
      id: `${Date.now()}`,
      rubricName: rubric.name || "Untitled grading session",
      totalPoints: rubric.totalPoints,
      criteriaCount: rubric.criteria.length,
      rubric,
      date: new Date().toLocaleString(),
      status: "Request prepared; not graded",
      reportOptions: {
        feedback: $("#option-feedback").checked,
        breakdown: $("#option-breakdown").checked,
        explanations: $("#option-explanations").checked
      }
    };

    const button = $("#grade-button");
    button.disabled = true;
    button.textContent = "Preparing request…";
    setStatus("#grading-status", "Checking the backend connection…");

    try {
      const baseURL = ($("#backend-url")?.value || getPrefs().backendURL || "").trim().replace(/\/+$/, "");

      if (!baseURL) {
        entry.status = "Saved locally; backend not configured";
        if ($("#option-history").checked) saveHistory(entry);
        renderSavedRequest(entry);
        showTab("results");
        setStatus("#grading-status", "Request prepared and saved. No AI grade was produced because the backend URL is not configured.", "success");
        return;
      }

      const data = new FormData();
      data.set("test", test);
      data.set("answers", answers);
      data.set("answer_key", $("#answer-key-input").value.trim());
      data.set("rubric", JSON.stringify(rubric));
      data.set("rubric_name", rubric.name);
      data.set("total_points", String(rubric.totalPoints));
      data.set("strictness", rubric.strictness);
      data.set("instructions", rubric.instructions);
      data.set("options", JSON.stringify(entry.reportOptions));

      const response = await fetch(`${baseURL}/api/grade`, {
        method: "POST",
        body: data
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || result.message || `Backend returned HTTP ${response.status}`);
      }

      lastResult = result;
      entry.status = "Backend returned a response";
      entry.report = result;
      if ($("#option-history").checked) saveHistory(entry);
      renderReport(result);
      showTab("results");
      setStatus("#grading-status", "The backend returned a response. Review the report carefully.", "success");
    } catch (error) {
      console.error("GradeNova grading request failed:", error);
      setStatus("#grading-status", `Grading request failed: ${error.message}. Check the backend URL and server logs.`, "error");
    } finally {
      button.disabled = false;
      button.innerHTML = 'Prepare grading request <span>→</span>';
    }
  });

  function renderReport(report) {
    const target = $("#results-content");
    if (!target) return;
    target.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = report.rubric_name || report.rubricName || "Grading report";

    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = "AI-generated suggestions are not a substitute for teacher review.";

    target.append(heading, note);

    const scoreValue = report.score ?? report.total_score ?? report.totalPointsAwarded;
    if (scoreValue !== undefined) {
      const score = document.createElement("div");
      score.className = "result-score";
      score.textContent = `${scoreValue}${report.total_points ? ` / ${report.total_points}` : ""}`;
      target.appendChild(score);
    }

    const feedback = report.feedback || report.overall_feedback || report.summary;
    if (feedback) {
      const p = document.createElement("p");
      p.textContent = String(feedback);
      target.appendChild(p);
    }

    const criteria = report.breakdown || report.criteria || report.scores;
    if (Array.isArray(criteria)) {
      criteria.forEach(item => {
        const row = document.createElement("div");
        row.className = "result-criterion";
        const title = document.createElement("strong");
        title.textContent = item.name || item.criterion || "Criterion";
        const details = document.createElement("p");
        details.className = "muted";
        details.textContent = `${item.score ?? item.points_awarded ?? item.points ?? "—"} points${item.feedback ? ` — ${item.feedback}` : ""}`;
        row.append(title, details);
        target.appendChild(row);
      });
    }

    if (!feedback && !Array.isArray(criteria) && scoreValue === undefined) {
      const p = document.createElement("p");
      p.textContent = "The backend responded, but its report fields did not match the fields this page displays. Inspect the response in your server logs and adjust the mapping in renderReport().";
      target.appendChild(p);
    }
  }

  // TEST BACKEND HEALTH.
  $("#test-connection")?.addEventListener("click", async () => {
    const baseURL = ($("#backend-url").value || "").trim().replace(/\/+$/, "");
    if (!baseURL) {
      setStatus("#connection-status", "Enter your backend base URL first.", "error");
      return;
    }
    setStatus("#connection-status", "Testing /health…");
    try {
      const response = await fetch(`${baseURL}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStatus("#connection-status", `Backend is responding: ${JSON.stringify(data)}`, "success");
      $("#connection-label").textContent = "Backend reachable";
      $("#home-backend-message").textContent = "The backend health check succeeded. Try a grading request next.";
    } catch (error) {
      setStatus("#connection-status", `Connection failed: ${error.message}. Confirm the URL, server status, and CORS settings.`, "error");
      $("#connection-label").textContent = "Backend not connected";
    }
  });

  // SAVE SETTINGS.
  function saveSettings() {
    const prefs = {
      ...getPrefs(),
      theme: body.dataset.theme || "cosmic",
      accent: getComputedStyle(body).getPropertyValue("--accent").trim(),
      motion: motionMain ? motionMain.checked : true,
      strictness: $("#settings-default-strictness").value,
      backendURL: ($("#backend-url").value || "").trim().replace(/\/+$/, "")
    };
    const ok = writeJSON(PREFS_KEY, prefs);
    $("#grading-strictness").value = prefs.strictness || "balanced";
    setStatus("#settings-status", ok ? "Preferences saved in this browser." : "Could not save preferences. Check your browser's storage settings.", ok ? "success" : "error");
    setStatus("#customize-status", ok ? "Customization saved." : "Could not save customization.", ok ? "success" : "error");
  }

  $("#save-settings")?.addEventListener("click", saveSettings);
  $("#save-customization")?.addEventListener("click", saveSettings);

  // HISTORY ACTIONS.
  $("#export-history")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(getHistory(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gradenova-history.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  $("#clear-history")?.addEventListener("click", () => {
    if (!confirm("Clear all GradeNova history saved in this browser?")) return;
    writeJSON(HISTORY_KEY, []);
    renderHistory();
  });

  // RESTORE SAVED PREFERENCES.
  const prefs = getPrefs();
  applyTheme(prefs.theme || "cosmic", false);
  applyAccent(prefs.accent || "#9b87ff", false);
  applyMotion(prefs.motion !== false, false);
  if (themeSelect) themeSelect.value = prefs.theme || "cosmic";
  if ($("#settings-default-strictness")) {
    $("#settings-default-strictness").value = prefs.strictness || "balanced";
  }
  if ($("#grading-strictness")) {
    $("#grading-strictness").value = prefs.strictness || "balanced";
  }
  if ($("#backend-url")) {
    $("#backend-url").value = prefs.backendURL || "";
  }

  createParticles();
  renderHistory();
  updateRubricTotal();

  const startingTab = location.hash.replace("#", "");
  const validTabs = ["home", "grading", "customize", "history", "settings", "results"];
  showTab(validTabs.includes(startingTab) ? startingTab : "home");
});
