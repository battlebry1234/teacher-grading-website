"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const KEYS = {
    preferences: "gradenova.preferences.v2",
    history: "gradenova.history.v2",
    rubric: "gradenova.rubric.v2",
    answerKey: "gradenova.answerKey.v2"
  };

  const THEMES = ["cosmic", "ocean", "forest", "inferno", "light"];
  const ACCENTS = ["violet", "cyan", "pink", "green", "amber"];

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
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

  function showStatus(element, message, type = "") {
    if (!element) return;
    element.textContent = message;
    element.classList.remove("success", "error");
    if (type) element.classList.add(type);
  }

  // PAGE NAVIGATION
  function navigate(pageName) {
    const target = $(`[data-view="${pageName}"]`);
    if (!target) return;

    $$("[data-view]").forEach((page) => {
      const active = page.dataset.view === pageName;
      page.hidden = !active;
      page.classList.toggle("active", active);
    });

    $$("[data-page]").forEach((button) => {
      const active = button.dataset.page === pageName;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    window.scrollTo({ top: 0, behavior: document.body.classList.contains("reduce-motion") ? "auto" : "smooth" });
  }

  $$("[data-page]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.page));
  });

  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.go));
  });

  $$("[data-page-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(link.dataset.pageLink);
    });
  });

  $("#top-settings")?.addEventListener("click", () => navigate("settings"));

  // ATMOSPHERE AND APPEARANCE
  const themeSelect = $("#theme-select");
  const accentSelect = $("#accent-select");
  const motionToggle = $("#motion-toggle");

  function applyTheme(theme, save = true) {
    if (!THEMES.includes(theme)) theme = "cosmic";

    document.body.dataset.theme = theme;

    $$("[data-set-theme]").forEach((button) => {
      const active = button.dataset.setTheme === theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (themeSelect) themeSelect.value = theme;

    if (save) savePreferences();
  }

  function applyAccent(accent, save = true) {
    if (!ACCENTS.includes(accent)) accent = "violet";

    document.body.classList.remove(...ACCENTS.map((item) => `accent-${item}`));
    if (accent !== "violet") document.body.classList.add(`accent-${accent}`);

    if (accentSelect) accentSelect.value = accent;
    if (save) savePreferences();
  }

  function applyMotion(enabled, save = true) {
    document.body.classList.toggle("reduce-motion", !enabled);
    if (motionToggle) motionToggle.checked = enabled;
    if (save) savePreferences();
  }

  function savePreferences() {
    const preferences = {
      theme: document.body.dataset.theme || "cosmic",
      accent: ACCENTS.find((item) => document.body.classList.contains(`accent-${item}`)) || "violet",
      motion: !document.body.classList.contains("reduce-motion"),
      strictness: $("#settings-strictness")?.value || "balanced"
    };

    return writeStorage(KEYS.preferences, preferences);
  }

  $$("[data-set-theme]").forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.setTheme));
  });

  themeSelect?.addEventListener("change", () => applyTheme(themeSelect.value));
  accentSelect?.addEventListener("change", () => applyAccent(accentSelect.value));
  motionToggle?.addEventListener("change", () => applyMotion(motionToggle.checked));

  $("#save-settings")?.addEventListener("click", () => {
    const success = savePreferences();
    showStatus(
      $("#settings-status"),
      success ? "✓ Your studio preferences have been saved on this device." :
        "Could not save preferences. Check your browser storage settings.",
      success ? "success" : "error"
    );
  });

  $("#reset-settings")?.addEventListener("click", () => {
    applyTheme("cosmic", false);
    applyAccent("violet", false);
    applyMotion(true, false);
    if ($("#settings-strictness")) $("#settings-strictness").value = "balanced";

    const success = savePreferences();
    showStatus(
      $("#settings-status"),
      success ? "Studio preferences reset to their defaults." : "Preferences could not be saved.",
      success ? "success" : "error"
    );
  });

  // TEXT FILE IMPORT
  async function loadTextFile(inputSelector, targetSelector, statusSelector) {
    const input = $(inputSelector);
    const target = $(targetSelector);
    const file = input?.files?.[0];

    if (!file || !target) return;

    if (file.size > 2 * 1024 * 1024) {
      showStatus($(statusSelector), "Please choose a text file smaller than 2 MB.", "error");
      input.value = "";
      return;
    }

    try {
      target.value = await file.text();
      target.dispatchEvent(new Event("input", { bubbles: true }));
      showStatus($(statusSelector), `Loaded "${file.name}". Review its contents before continuing.`, "success");
    } catch {
      showStatus($(statusSelector), "This file could not be read as text.", "error");
    }
  }

  // Use a small message area for imported file feedback.
  const testFile = $("#test-file");
  const answersFile = $("#answers-file");

  function fileMessage(input, text) {
    if (!input) return;
    let message = input.parentElement.querySelector(".file-status");
    if (!message) {
      message = document.createElement("p");
      message.className = "file-status status-message";
      input.insertAdjacentElement("afterend", message);
    }
    message.textContent = text;
  }

  testFile?.addEventListener("change", async () => {
    if (!testFile.files?.[0]) return;
    const file = testFile.files[0];

    if (!/\.(txt|md)$/i.test(file.name)) {
      fileMessage(testFile, "Only TXT and MD files are read directly by this page. PDF and Word files need additional processing.");
      testFile.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      fileMessage(testFile, "Choose a text file smaller than 2 MB.");
      testFile.value = "";
      return;
    }

    try {
      $("#test-input").value = await file.text();
      fileMessage(testFile, `Loaded ${file.name}. Please review the text.`);
    } catch {
      fileMessage(testFile, "Could not read this file.");
    }
  });

  answersFile?.addEventListener("change", async () => {
    if (!answersFile.files?.[0]) return;
    const file = answersFile.files[0];

    if (!/\.(txt|md)$/i.test(file.name)) {
      fileMessage(answersFile, "Only TXT and MD files are read directly by this page. PDF and Word files need additional processing.");
      answersFile.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      fileMessage(answersFile, "Choose a text file smaller than 2 MB.");
      answersFile.value = "";
      return;
    }

    try {
      $("#answers-input").value = await file.text();
      fileMessage(answersFile, `Loaded ${file.name}. Please review the text.`);
    } catch {
      fileMessage(answersFile, "Could not read this file.");
    }
  });

  // RUBRIC BUILDER
  const rubricCriteria = $("#rubric-criteria");
  let nextCriterionId = 4;

  function updateCriterionLabels() {
    if (!rubricCriteria) return;

    $$(".rubric-row", rubricCriteria).forEach((row, index) => {
      const number = index + 1;
      const nameInput = $('input[name="criterion-name"]', row);
      const pointsInput = $('input[name="criterion-points"]', row);
      const labels = $$("label", row);

      if (nameInput) {
        nameInput.id = `criterion-${number}`;
        if (labels[0]) {
          labels[0].htmlFor = nameInput.id;
          labels[0].textContent = `Criterion ${number}`;
        }
      }

      if (pointsInput) {
        pointsInput.id = `criterion-points-${number}`;
        if (labels[1]) {
          labels[1].htmlFor = pointsInput.id;
          labels[1].textContent = "Points";
        }
      }

      const remove = $(".remove-criterion", row);
      if (remove) remove.setAttribute("aria-label", `Remove criterion ${number}`);
    });

    nextCriterionId = $$(".rubric-row", rubricCriteria).length + 1;
    updateCriterionTotal();
  }

  function updateCriterionTotal() {
    const rows = $$(".rubric-row", rubricCriteria || document);
    const assigned = rows.reduce((sum, row) => {
      return sum + Math.max(0, Number($('input[name="criterion-points"]', row)?.value || 0));
    }, 0);

    const maximum = Math.max(1, Number($("#total-points")?.value || 100));
    const totalElement = $("#criterion-total");

    if (totalElement) {
      totalElement.textContent = `${assigned} / ${maximum}`;
      totalElement.style.color = assigned > maximum ? "var(--danger)" : "var(--accent-2)";
    }
  }

  function createCriterion() {
    const row = document.createElement("div");
    row.className = "rubric-row";

    const nameField = document.createElement("div");
    nameField.className = "field";
    const nameLabel = document.createElement("label");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.name = "criterion-name";
    nameInput.placeholder = "Criterion name";
    nameLabel.append("Criterion");
    nameField.append(nameLabel, nameInput);

    const pointsField = document.createElement("div");
    pointsField.className = "field";
    const pointsLabel = document.createElement("label");
    const pointsInput = document.createElement("input");
    pointsInput.type = "number";
    pointsInput.name = "criterion-points";
    pointsInput.min = "0";
    pointsInput.value = "0";
    pointsLabel.textContent = "Points";
    pointsField.append(pointsLabel, pointsInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button danger remove-criterion";
    removeButton.textContent = "Remove";

    row.append(nameField, pointsField, removeButton);
    return row;
  }

  $("#add-criterion")?.addEventListener("click", () => {
    if (!rubricCriteria) return;
    const row = createCriterion();
    rubricCriteria.appendChild(row);
    updateCriterionLabels();
    $('input[name="criterion-name"]', row)?.focus();
  });

  rubricCriteria?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-criterion");
    if (!removeButton) return;

    const rows = $$(".rubric-row", rubricCriteria);
    if (rows.length <= 1) {
      showStatus($("#rubric-status"), "Keep at least one criterion in your rubric.", "error");
      return;
    }

    removeButton.closest(".rubric-row")?.remove();
    updateCriterionLabels();
  });

  rubricCriteria?.addEventListener("input", updateCriterionTotal);
  $("#total-points")?.addEventListener("input", updateCriterionTotal);

  function collectRubric() {
    const criteria = $$(".rubric-row", rubricCriteria || document).map((row) => ({
      name: $('input[name="criterion-name"]', row)?.value.trim() || "",
      points: Number($('input[name="criterion-points"]', row)?.value || 0)
    })).filter((criterion) => criterion.name);

    return {
      name: $("#rubric-name")?.value.trim() || "Untitled rubric",
      totalPoints: Number($("#total-points")?.value || 100),
      instructions: $("#rubric-instructions")?.value.trim() || "",
      criteria
    };
  }

  function validateRubric(rubric) {
    if (!Number.isFinite(rubric.totalPoints) || rubric.totalPoints <= 0) {
      return "Total possible points must be greater than zero.";
    }

    if (!rubric.criteria.length) {
      return "Add at least one named grading criterion.";
    }

    if (rubric.criteria.some((item) => !Number.isFinite(item.points) || item.points < 0)) {
      return "Every criterion must have a valid non-negative point value.";
    }

    const sum = rubric.criteria.reduce((total, item) => total + item.points, 0);
    if (sum > rubric.totalPoints) {
      return `Your criteria add up to ${sum} points, exceeding the ${rubric.totalPoints} available.`;
    }

    return "";
  }

  $("#save-rubric")?.addEventListener("click", () => {
    const rubric = collectRubric();
    const error = validateRubric(rubric);

    if (error) {
      showStatus($("#rubric-status"), error, "error");
      return;
    }

    const success = writeStorage(KEYS.rubric, rubric);
    showStatus(
      $("#rubric-status"),
      success ? "✓ Rubric saved on this device." : "Could not save the rubric. Check browser storage.",
      success ? "success" : "error"
    );
  });

  $("#use-rubric")?.addEventListener("click", () => {
    const rubric = collectRubric();
    const error = validateRubric(rubric);

    if (error) {
      showStatus($("#rubric-status"), error, "error");
      return;
    }

    writeStorage(KEYS.rubric, rubric);
    navigate("grading");
    showStatus($("#grading-status"), `Rubric "${rubric.name}" is ready to use. The rubric is saved locally; connect a backend to apply it during real AI grading.`, "success");
  });

  function loadSavedRubric() {
    const rubric = readStorage(KEYS.rubric, null);
    if (!rubric || !rubricCriteria) return;

    if ($("#rubric-name")) $("#rubric-name").value = rubric.name || "";
    if ($("#total-points")) $("#total-points").value = rubric.totalPoints || 100;
    if ($("#rubric-instructions")) $("#rubric-instructions").value = rubric.instructions || "";

    rubricCriteria.replaceChildren();

    (Array.isArray(rubric.criteria) && rubric.criteria.length ? rubric.criteria : [{ name: "", points: 0 }])
      .forEach((criterion) => {
        const row = createCriterion();
        $('input[name="criterion-name"]', row).value = criterion.name || "";
        $('input[name="criterion-points"]', row).value = Number(criterion.points || 0);
        rubricCriteria.appendChild(row);
      });

    updateCriterionLabels();
  }

  // ANSWER KEY
  const answerKeyField = $("#answer-key-input");
  const gradingAnswerKey = $("#grading-answer-key");

  function saveAnswerKey() {
    const value = answerKeyField?.value || "";
    const success = writeStorage(KEYS.answerKey, value);

    showStatus(
      $("#answer-key-status"),
      success ? "✓ Answer key saved on this device." : "Could not save the answer key.",
      success ? "success" : "error"
    );
  }

  $("#save-answer-key")?.addEventListener("click", saveAnswerKey);

  $("#send-answer-key")?.addEventListener("click", () => {
    if (gradingAnswerKey && answerKeyField) gradingAnswerKey.value = answerKeyField.value;
    navigate("grading");
    showStatus($("#grading-status"), "Answer key copied into the grading form. Review it before preparing your request.", "success");
  });

  // SESSION HISTORY
  const historyList = $("#history-list");

  function renderHistory() {
    if (!historyList) return;

    const history = readStorage(KEYS.history, []);
    historyList.replaceChildren();

    if (!Array.isArray(history) || history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.textContent = "◷";

      const title = document.createElement("h2");
      title.textContent = "No saved sessions yet";

      const text = document.createElement("p");
      text.textContent = "Requests you prepare with history enabled will appear here. Student answers are not saved in the history list.";

      empty.append(icon, title, text);
      historyList.appendChild(empty);
      return;
    }

    history.slice().reverse().forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-entry";

      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = entry.rubricName || "Untitled grading request";

      const details = document.createElement("small");
      const date = new Date(entry.createdAt);
      details.textContent = `${Number.isNaN(date.getTime()) ? "Saved request" : date.toLocaleString()} · ${entry.totalPoints} possible points · ${entry.criterionCount} criteria`;

      info.append(title, details);

      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = "Prepared";

      item.append(info, chip);
      historyList.appendChild(item);
    });
  }

  $("#export-history")?.addEventListener("click", () => {
    const history = readStorage(KEYS.history, []);
    const blob = new Blob(
      [JSON.stringify(Array.isArray(history) ? history : [], null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gradenova-history.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  $("#clear-history")?.addEventListener("click", () => {
    if (!window.confirm("Clear the saved GradeNova history from this browser?")) return;

    const success = writeStorage(KEYS.history, []);
    renderHistory();
    if (!success) window.alert("History could not be cleared. Check your browser storage settings.");
  });

  // GRADING REQUEST PREPARATION
  const gradingForm = $("#grading-form");

  gradingForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const test = $("#test-input")?.value.trim() || "";
    const answers = $("#answers-input")?.value.trim() || "";
    const answerKey = gradingAnswerKey?.value.trim() || "";
    const rubric = readStorage(KEYS.rubric, null);
    const strictness = $("#grading-strictness")?.value || "balanced";

    if (!test || !answers) {
      showStatus($("#grading-status"), "Enter both the test or assignment and the student's answers.", "error");
      (!test ? $("#test-input") : $("#answers-input"))?.focus();
      return;
    }

    const gradingRequest = {
      test,
      answers,
      answerKey: answerKey || null,
      rubric,
      strictness,
      options: {
        feedback: $("#option-feedback")?.checked ?? true,
        breakdown: $("#option-breakdown")?.checked ?? true,
        history: $("#option-history")?.checked ?? true,
        explanations: $("#option-explanations")?.checked ?? true
      }
    };

    // Intentionally do not send data to an unconfigured service.
    // Connect a trusted backend before adding real AI grading.
    const results = $("#results-content");

    if (results) {
      results.replaceChildren();

      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.textContent = "⌁";

      const title = document.createElement("h2");
      title.textContent = "Request prepared — not graded yet";

      const text = document.createElement("p");
      text.textContent = "Your input has been checked by the interface. This page has not calculated a grade or generated AI feedback. Connect your backend to receive an actual grading report.";

      const details = document.createElement("p");
      const rubricName = gradingRequest.rubric?.name || "No saved rubric";
      details.textContent = `Rubric: ${rubricName} · Approach: ${strictness} · Answer key: ${answerKey ? "provided" : "not provided"}`;

      const goButton = document.createElement("button");
      goButton.type = "button";
      goButton.className = "button secondary";
      goButton.textContent = "Back to grading";
      goButton.addEventListener("click", () => navigate("grading"));

      empty.append(icon, title, text, details, goButton);
      results.appendChild(empty);
    }

    if (gradingRequest.options.history) {
      const history = readStorage(KEYS.history, []);
      const entry = {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        rubricName: gradingRequest.rubric?.name || "Untitled grading request",
        totalPoints: gradingRequest.rubric?.totalPoints || 100,
        criterionCount: gradingRequest.rubric?.criteria?.length || 0,
        strictness,
        hasAnswerKey: Boolean(answerKey)
      };

      const next = Array.isArray(history) ? [...history, entry].slice(-50) : [entry];
      writeStorage(KEYS.history, next);
      renderHistory();
    }

    showStatus(
      $("#grading-status"),
      "✓ Request prepared. No grade was generated because an AI backend is not connected yet.",
      "success"
    );

    navigate("results");
  });

  $("#reset-grading")?.addEventListener("click", () => {
    window.setTimeout(() => {
      showStatus($("#grading-status"), "Form cleared.", "");
    }, 0);
  });

  // INITIALIZE PREFERENCES AND SAVED DATA
  const preferences = readStorage(KEYS.preferences, {});

  applyTheme(THEMES.includes(preferences.theme) ? preferences.theme : "cosmic", false);
  applyAccent(ACCENTS.includes(preferences.accent) ? preferences.accent : "violet", false);
  applyMotion(typeof preferences.motion === "boolean" ? preferences.motion : true, false);

  if ($("#settings-strictness") && ["lenient", "balanced", "strict"].includes(preferences.strictness)) {
    $("#settings-strictness").value = preferences.strictness;
  }
  if ($("#grading-strictness") && ["lenient", "balanced", "strict"].includes(preferences.strictness)) {
    $("#grading-strictness").value = preferences.strictness;
  }

  const savedAnswerKey = readStorage(KEYS.answerKey, "");
  if (typeof savedAnswerKey === "string") {
    if (answerKeyField) answerKeyField.value = savedAnswerKey;
    if (gradingAnswerKey) gradingAnswerKey.value = savedAnswerKey;
  }

  loadSavedRubric();
  updateCriterionTotal();
  renderHistory();

  console.info("GradeNova initialized. Real AI grading requires a configured backend.");
});
