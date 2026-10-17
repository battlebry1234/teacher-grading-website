
"use strict";

/*
  IMPORTANT:
  After deploying server.py on Render, replace this URL with your
  actual Render service URL. Never put your Gemini API key here.
*/
const API_BASE_URL = "https://YOUR-SERVICE.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const PREFS_KEY = "gradenova-preferences-v2";
  const HISTORY_KEY = "gradenova-reports-v2";
  const THEMES = ["cosmic", "inferno", "forest", "ocean", "light"];

  const form = $("#grading-form");
  const gradeButton = $("#grade-button");
  const status = $("#grading-status");
  const results = $("#results-content");
  const criteriaList = $("#rubric-criteria");
  const connectionLabel = $("#connection-label");
  let latestReport = null;

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function setMessage(element, message, kind = "") {
    if (!element) return;
    element.textContent = message;
    element.classList.remove("success", "error");
    if (kind) element.classList.add(kind);
  }

  function setTheme(theme, save = true) {
    if (!THEMES.includes(theme)) theme = "cosmic";
    document.body.dataset.theme = theme;

    $$("[data-theme-choice]").forEach(button => {
      const selected = button.dataset.themeChoice === theme;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const selector = $("#settings-theme");
    if (selector) selector.value = theme;

    const colors = {
      cosmic: "#080b18",
      inferno: "#170b08",
      forest: "#07150f",
      ocean: "#061622",
      light: "#edf1fa"
    };
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = colors[theme];

    if (save) {
      const prefs = readStorage(PREFS_KEY, {});
      writeStorage(PREFS_KEY, { ...prefs, theme });
    }
  }

  $$("[data-theme-choice]").forEach(button => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });

  function setFileLabel(inputId, labelId) {
    const input = $("#" + inputId);
    const label = $("#" + labelId);
    if (!input || !label) return;

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      label.textContent = file
        ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB`
        : "No file selected";
    });
  }

  setFileLabel("test-file", "test-file-name");
  setFileLabel("answers-file", "answers-file-name");

  function updateCriteria() {
    const rows = $$(".criterion-row", criteriaList);
    rows.forEach((row, index) => {
      const number = index + 1;
      const name = $(".criterion-name", row);
      const points = $(".criterion-points", row);
      const remove = $(".remove-criterion", row);

      name.id = `criterion-name-${number}`;
      points.id = `criterion-points-${number}`;
      $("label[for^='criterion-name-']", row)?.setAttribute("for", name.id);
      $("label[for^='criterion-points-']", row)?.setAttribute("for", points.id);

      if (remove) {
        remove.disabled = rows.length === 1;
        remove.setAttribute("aria-label", `Remove criterion ${number}`);
      }
    });
  }

  $("#add-criterion")?.addEventListener("click", () => {
    if ($$(".criterion-row", criteriaList).length >= 20) {
      setMessage(status, "You can add up to 20 criteria.", "error");
      return;
    }

    const row = document.createElement("div");
    row.className = "criterion-row";

    const nameLabel = document.createElement("label");
    nameLabel.className = "sr-only";
    nameLabel.textContent = "Criterion name";

    const nameInput = document.createElement("input");
    nameInput.className = "criterion-name";
    nameInput.type = "text";
    nameInput.maxLength = 120;
    nameInput.placeholder = "Criterion name";

    const pointsLabel = document.createElement("label");
    pointsLabel.className = "sr-only";
    pointsLabel.textContent = "Criterion points";

    const pointsInput = document.createElement("input");
    pointsInput.className = "criterion-points";
    pointsInput.type = "number";
    pointsInput.min = "0";
    pointsInput.max = "10000";
    pointsInput.value = "0";
    pointsInput.setAttribute("aria-label", "Criterion points");

    const pts = document.createElement("span");
    pts.className = "points-label";
    pts.textContent = "pts";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-criterion";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove criterion");
    remove.addEventListener("click", () => {
      row.remove();
      updateCriteria();
    });

    row.append(nameLabel, nameInput, pointsLabel, pointsInput, pts, remove);
    criteriaList.appendChild(row);
    updateCriteria();
    nameInput.focus();
  });

  criteriaList.addEventListener("click", event => {
    const button = event.target.closest(".remove-criterion");
    if (!button || button.disabled) return;
    button.closest(".criterion-row")?.remove();
    updateCriteria();
  });

  function collectRubric() {
    const totalPoints = Number($("#total-points").value);
    const criteria = $$(".criterion-row", criteriaList).map(row => ({
      name: $(".criterion-name", row).value.trim(),
      points: Number($(".criterion-points", row).value)
    }));

    if (!Number.isFinite(totalPoints) || totalPoints < 1 || totalPoints > 10000) {
      throw new Error("Total possible points must be between 1 and 10,000.");
    }

    if (criteria.some(c => !c.name || !Number.isFinite(c.points) || c.points < 0 || c.points > 10000)) {
      throw new Error("Give each criterion a name and a valid non-negative point value.");
    }

    const criteriaTotal = criteria.reduce((sum, item) => sum + item.points, 0);
    if (criteriaTotal !== totalPoints) {
      throw new Error(`Your criteria total ${criteriaTotal} points, but the assignment total is ${totalPoints}. Make those totals match.`);
    }

    return {
      name: $("#rubric-name").value.trim(),
      totalPoints,
      strictness: $("#grading-strictness").value,
      instructions: $("#rubric-instructions").value.trim(),
      criteria
    };
  }

  async function checkBackend() {
    const dot = $(".connection-pill .status-dot");

    if (API_BASE_URL.includes("YOUR-SERVICE")) {
      if (connectionLabel) connectionLabel.textContent = "Backend URL needed";
      dot?.classList.remove("online");
      dot?.classList.add("offline");
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error("Backend health check failed.");

      const data = await response.json();
      const online = data.status === "ok";

      if (connectionLabel) {
        connectionLabel.textContent = online ? "Backend connected" : "Backend unavailable";
      }
      dot?.classList.toggle("online", online);
      dot?.classList.toggle("offline", !online);
      return online;
    } catch {
      if (connectionLabel) connectionLabel.textContent = "Backend offline";
      dot?.classList.remove("online");
      dot?.classList.add("offline");
      return false;
    }
  }

  $("#test-connection")?.addEventListener("click", async () => {
    const button = $("#test-connection");
    button.disabled = true;
    setMessage($("#connection-status"), "Checking the backend…");
    const online = await checkBackend();
    setMessage(
      $("#connection-status"),
      online
        ? "Connection successful. The backend health endpoint responded."
        : "Could not reach the backend. Check the Render URL, deployment status, and CORS settings.",
      online ? "success" : "error"
    );
    button.disabled = false;
  });

  function addText(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text ?? "";
    parent.appendChild(element);
    return element;
  }

  function renderReport(report) {
    results.replaceChildren();
    results.className = "results-report";

    const overview = document.createElement("div");
    overview.className = "result-overview";

    const scoreCard = document.createElement("div");
    scoreCard.className = "score-card";
    const score = Number(report.score) || 0;
    const total = Number(report.total_points) || 100;
    const percentage = Math.max(0, Math.min(100, Number(report.percentage) || 0));

    const scoreNumber = document.createElement("div");
    scoreNumber.className = "score-number";
    scoreNumber.append(document.createTextNode(String(score)));
    const slash = document.createElement("small");
    slash.textContent = ` / ${total}`;
    scoreNumber.appendChild(slash);
    scoreCard.appendChild(scoreNumber);
    addText(scoreCard, "div", "score-percent", `${percentage.toFixed(1)}%`);
    overview.appendChild(scoreCard);

    const details = document.createElement("div");
    details.className = "score-details";
    addText(details, "h3", "", report.assignment_name || "Grading report");
    addText(details, "p", "", report.summary || "Review the scoring details below.");
    overview.appendChild(details);
    results.appendChild(overview);

    if (report.feedback) {
      const block = document.createElement("div");
      block.className = "result-block";
      addText(block, "h3", "", "Overall feedback");
      addText(block, "p", "", report.feedback);
      results.appendChild(block);
    }

    if (Array.isArray(report.criteria) && report.criteria.length) {
      const block = document.createElement("div");
      block.className = "result-block";
      addText(block, "h3", "", "Score breakdown");
      const list = document.createElement("div");
      list.className = "result-criteria";

      report.criteria.forEach(item => {
        const card = document.createElement("div");
        card.className = "result-criterion";
        addText(
          card, "div", "result-criterion-head",
          `${item.name || "Criterion"} — ${Number(item.points_awarded) || 0} / ${Number(item.points_possible) || 0}`
        );
        addText(card, "p", "", item.feedback || "No additional comments.");
        list.appendChild(card);
      });

      block.appendChild(list);
      results.appendChild(block);
    }

    for (const [heading, values] of [
      ["Strengths", report.strengths],
      ["Areas to improve", report.improvements]
    ]) {
      if (Array.isArray(values) && values.length) {
        const block = document.createElement("div");
        block.className = "result-block";
        addText(block, "h3", "", heading);
        const ul = document.createElement("ul");
        values.forEach(value => addText(ul, "li", "", String(value)));
        block.appendChild(ul);
        results.appendChild(block);
      }
    }

    addText(
      results, "p", "status-message",
      "AI-generated suggestions can be wrong. Review the assignment, criteria, and scores before using this report as a final grade."
    );

    const actions = document.createElement("div");
    actions.className = "result-actions";
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "button button-quiet";
    exportButton.textContent = "Export report";
    exportButton.addEventListener("click", () => exportReport(report));
    actions.appendChild(exportButton);
    results.appendChild(actions);
  }

  function exportReport(report) {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gradenova-report.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function readHistory() {
    const history = readStorage(HISTORY_KEY, []);
    return Array.isArray(history) ? history : [];
  }

  function renderHistory() {
    const list = $("#history-list");
    const history = readHistory();
    list.replaceChildren();
    $("#history-count").textContent = `${history.length} report${history.length === 1 ? "" : "s"}`;

    if (!history.length) {
      addText(list, "p", "empty-history", "No saved reports yet. Your reports will appear here if local saving is enabled.");
      return;
    }

    history.slice().reverse().forEach(entry => {
      const row = document.createElement("div");
      row.className = "history-entry";
      const info = document.createElement("div");
      addText(info, "strong", "", entry.name || "Grading report");
      addText(info, "small", "", `${new Date(entry.date).toLocaleString()} · ${entry.total} possible points`);
      row.appendChild(info);
      addText(row, "span", "history-score", `${entry.score} / ${entry.total}`);
      list.appendChild(row);
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    setMessage(status, "");

    let rubric;
    try {
      rubric = collectRubric();
    } catch (error) {
      setMessage(status, error.message, "error");
      return;
    }

    const testText = $("#test-input").value.trim();
    const answersText = $("#answers-input").value.trim();
    const testFile = $("#test-file").files?.[0];
    const answersFile = $("#answers-file").files?.[0];

    if ((!testText && !testFile) || (!answersText && !answersFile)) {
      setMessage(status, "Enter the assignment and student answers, or attach a file for each.", "error");
      return;
    }

    if (API_BASE_URL.includes("YOUR-SERVICE")) {
      setMessage(status, "The frontend still needs your Render backend URL. Deploy server.py, then update API_BASE_URL in script.js.", "error");
      return;
    }

    const formData = new FormData(form);
    formData.set("rubric", JSON.stringify(rubric));
    formData.set("options", JSON.stringify({
      feedback: $("#option-feedback").checked,
      breakdown: $("#option-breakdown").checked
    }));

    gradeButton.disabled = true;
    gradeButton.textContent = "Grading… please wait";
    setMessage(status, "Sending the assignment securely to your configured backend…");

    try {
      const response = await fetch(`${API_BASE_URL}/api/grade`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(120000)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `The backend returned HTTP ${response.status}.`);
      }
      if (data.error) throw new Error(data.error);

      latestReport = data;
      renderReport(data);
      $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
      setMessage(status, "Grading report received. Review the suggested score before using it.", "success");

      if ($("#option-history").checked) {
        const history = readHistory();
        history.push({
          name: data.assignment_name || rubric.name || "Grading report",
          date: new Date().toISOString(),
          score: data.score,
          total: data.total_points
        });
        writeStorage(HISTORY_KEY, history.slice(-50));
        renderHistory();
      }
    } catch (error) {
      const message = error.name === "TimeoutError"
        ? "The grading request took too long. Check the backend and try again."
        : error.message || "Something went wrong while grading.";
      setMessage(status, `${message} Check the Render logs if the problem continues.`, "error");
    } finally {
      gradeButton.disabled = false;
      gradeButton.innerHTML = "<span>✦</span> Grade assignment <span aria-hidden='true'>→</span>";
    }
  });

  $("#reset-form")?.addEventListener("click", () => {
    setTimeout(() => {
      $("#test-file-name").textContent = "No file selected";
      $("#answers-file-name").textContent = "No file selected";
      setMessage(status, "");
      updateCriteria();
    }, 0);
  });

  $("#export-history")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(readHistory(), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gradenova-history.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("#clear-history")?.addEventListener("click", () => {
    if (!confirm("Clear saved report summaries from this browser?")) return;
    writeStorage(HISTORY_KEY, []);
    renderHistory();
  });

  $("#save-settings")?.addEventListener("click", () => {
    const prefs = {
      theme: $("#settings-theme").value,
      strictness: $("#settings-default-strictness").value,
      motion: $("#settings-motion").checked
    };
    setTheme(prefs.theme, false);
    document.body.classList.toggle("motion-off", !prefs.motion);
    $("#grading-strictness").value = prefs.strictness;
    const saved = writeStorage(PREFS_KEY, prefs);
    setMessage(
      $("#settings-status"),
      saved ? "Preferences saved in this browser." : "Could not save preferences. Check browser storage settings.",
      saved ? "success" : "error"
    );
  });

  $("#settings-theme")?.addEventListener("change", event => setTheme(event.target.value));

  $$('nav a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
      $$("nav .nav-link").forEach(item => item.classList.toggle("active", item === link));
    });
  });

  const prefs = readStorage(PREFS_KEY, {});
  setTheme(prefs.theme || "cosmic", false);
  if (prefs.strictness) $("#settings-default-strictness").value = prefs.strictness;
  if (prefs.strictness) $("#grading-strictness").value = prefs.strictness;
  $("#settings-motion").checked = prefs.motion !== false;
  document.body.classList.toggle("motion-off", prefs.motion === false);

  updateCriteria();
  renderHistory();
  checkBackend();
});
