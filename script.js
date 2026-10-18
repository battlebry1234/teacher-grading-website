"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const PREFS_KEY = "gradenova-preferences-v2";
  const HISTORY_KEY = "gradenova-history-v2";
  const RUBRIC_KEY = "gradenova-rubric-v2";

  const THEMES = {
    cosmic: {
      name: "Cosmic",
      description: "A cinematic deep-space atmosphere with stars, planets, and glowing nebula light."
    },
    ocean: {
      name: "Ocean",
      description: "Deep blue currents, drifting bubbles, and underwater light."
    },
    forest: {
      name: "Forest",
      description: "A moonlit woodland with mist and subtle fireflies."
    },
    inferno: {
      name: "Inferno",
      description: "A volcanic atmosphere with warm flame light and drifting embers."
    },
    matrix: {
      name: "Matrix",
      description: "Emerald ones and zeros cascade down a digital wall."
    },
    cyberpunk: {
      name: "Cyberpunk",
      description: "A neon skyline pulses with a rhythmic equalizer and glowing grid."
    },
    aurora: {
      name: "Aurora",
      description: "Layered ribbons of green, teal, and violet northern lights flow across the sky."
    },
    light: {
      name: "Light",
      description: "A clean, bright workspace with a soft, calm background."
    }
  };

  const THEME_COLORS = {
    cosmic: "#05091b",
    ocean: "#031421",
    forest: "#03130d",
    inferno: "#170603",
    matrix: "#010805",
    cyberpunk: "#10051d",
    aurora: "#041327",
    light: "#eaf1ff"
  };

  const VALID_TABS = new Set([
    "home", "grading", "rubric", "history", "results", "settings"
  ]);

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("GradeNova storage read failed:", error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("GradeNova storage write failed:", error);
      return false;
    }
  }

  function showStatus(id, message, type = "") {
    const element = $("#" + id);
    if (!element) return;

    element.textContent = message;
    element.classList.remove("success", "error");

    if (type) element.classList.add(type);
  }

  // ----------------------------------------
  // NAVIGATION: one panel visible at a time
  // ----------------------------------------

  function openTab(tab, updateAddress = true) {
    if (!VALID_TABS.has(tab)) tab = "home";

    document.body.dataset.activeTab = tab;

    $$("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab;
    });

    $$(".main-nav a[href^='#']").forEach((link) => {
      const active = link.getAttribute("href") === "#" + tab;

      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (updateAddress && location.hash !== "#" + tab) {
      history.replaceState(null, "", "#" + tab);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // Intercept only links that point to a known workspace tab.
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest("a[href^='#']");
    if (!link) return;

    const tab = link.getAttribute("href").slice(1);

    if (!VALID_TABS.has(tab)) return;

    event.preventDefault();
    openTab(tab);
  });

  window.addEventListener("hashchange", () => {
    openTab(location.hash.slice(1), false);
  });

  // ----------------------------------------
  // THEMES
  // ----------------------------------------

  function updateThemeButtons(theme) {
    $$("[data-set-theme]").forEach((button) => {
      const active = button.dataset.setTheme === theme;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyTheme(theme, persist = true) {
    if (!Object.hasOwn(THEMES, theme)) theme = "cosmic";

    document.body.dataset.theme = theme;

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLORS[theme];

    const select = $("#settings-theme");
    if (select) select.value = theme;

    updateThemeButtons(theme);

    $("#current-theme-name").textContent = THEMES[theme].name;
    $("#current-theme-description").textContent =
      THEMES[theme].description;

    if (persist) {
      const oldPrefs = readStorage(PREFS_KEY, {});
      writeStorage(PREFS_KEY, { ...oldPrefs, theme });
    }
  }

  $$("[data-set-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.setTheme);
    });
  });

  $("#settings-theme").addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });

  $("#quick-theme").addEventListener("click", () => {
    const themes = Object.keys(THEMES);
    const current = themes.indexOf(document.body.dataset.theme);
    applyTheme(themes[(current + 1) % themes.length]);
  });

  // ----------------------------------------
  // CUSTOM ACCENT COLOR AND MOTION
  // ----------------------------------------

  function applyAccent(color, persist = true) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) color = "#39d7ff";

    document.documentElement.style.setProperty("--accent", color);
    $("#accent-color").value = color;

    if (persist) {
      const oldPrefs = readStorage(PREFS_KEY, {});
      writeStorage(PREFS_KEY, { ...oldPrefs, accent: color });
    }
  }

  $("#accent-color").addEventListener("input", (event) => {
    applyAccent(event.target.value);
  });

  function applyMotion(enabled) {
    document.body.classList.toggle("motion-off", !enabled);
    $("#settings-motion").checked = enabled;
    $("#ambient-particles").hidden = !enabled;
  }

  $("#settings-motion").addEventListener("change", (event) => {
    applyMotion(event.target.checked);
  });

  // ----------------------------------------
  // CREATE ANIMATED BACKGROUND ELEMENTS
  // ----------------------------------------

  function createAnimations() {
    const rain = $("#matrix-rain");

    if (rain && !rain.childElementCount) {
      for (let i = 0; i < 28; i++) {
        const column = document.createElement("span");

        column.className = "matrix-column";
        column.style.setProperty("--x", `${(i * 3.73) % 100}%`);
        column.style.setProperty("--duration", `${7 + (i % 8) * 1.4}s`);
        column.style.setProperty("--delay", `${-(i % 10) * 1.35}s`);

        column.textContent = Array.from(
          { length: 26 },
          (_, n) => (i * 7 + n * 3 + (n % 2)) % 2
        ).join("\n");

        rain.appendChild(column);
      }
    }

    const equalizer = $("#cyber-equalizer");

    if (equalizer && !equalizer.childElementCount) {
      for (let i = 0; i < 48; i++) {
        const bar = document.createElement("i");

        bar.style.setProperty("--h", `${22 + ((i * 31) % 76)}%`);
        bar.style.setProperty("--beat", `${0.38 + (i % 7) * 0.09}s`);
        bar.style.animationDelay = `${-(i % 9) * 0.12}s`;

        equalizer.appendChild(bar);
      }
    }

    const particles = $("#ambient-particles");

    if (particles && !particles.childElementCount) {
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < 25; i++) {
        const particle = document.createElement("span");

        particle.className = "ambient-particle";
        particle.style.left = `${(i * 37 + 11) % 100}%`;
        particle.style.top = `${(i * 23 + 17) % 100}%`;
        particle.style.animationDuration = `${14 + (i % 9) * 2}s`;
        particle.style.animationDelay = `${-(i % 13) * 1.7}s`;
        particle.style.opacity = `${0.18 + (i % 5) * 0.1}`;

        const size = 1 + (i % 3);
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        fragment.appendChild(particle);
      }

      particles.appendChild(fragment);
    }
  }

  // ----------------------------------------
  // RUBRIC BUILDER
  // ----------------------------------------

  const rubricContainer = $("#rubric-criteria");

  function createCriterion(name = "", points = 0) {
    const row = document.createElement("div");
    row.className = "criterion-row";

    const nameLabel = document.createElement("label");
    nameLabel.append("Criterion ");

    const nameInput = document.createElement("input");
    nameInput.name = "criterion-name";
    nameInput.value = name;
    nameInput.maxLength = 150;
    nameInput.placeholder = "e.g. Evidence and reasoning";
    nameLabel.appendChild(nameInput);

    const pointsLabel = document.createElement("label");
    pointsLabel.append("Points ");

    const pointsInput = document.createElement("input");
    pointsInput.name = "criterion-points";
    pointsInput.type = "number";
    pointsInput.min = "0";
    pointsInput.max = "10000";
    pointsInput.step = "1";
    pointsInput.value = String(points);
    pointsLabel.appendChild(pointsInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-criterion";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "Remove criterion");

    removeButton.addEventListener("click", () => {
      row.remove();
      updateRubricSummary();
    });

    row.append(nameLabel, pointsLabel, removeButton);
    return row;
  }

  function getRubric() {
    const criteria = $$(".criterion-row", rubricContainer)
      .map((row) => ({
        name: $('input[name="criterion-name"]', row).value.trim(),
        points: Number(
          $('input[name="criterion-points"]', row).value || 0
        )
      }))
      .filter((item) => item.name.length > 0);

    return {
      name: $("#rubric-name").value.trim() || "Untitled rubric",
      instructions: $("#rubric-instructions").value.trim(),
      criteria,
      total: criteria.reduce((sum, item) => sum + item.points, 0)
    };
  }

  function updateRubricSummary() {
    const rubric = getRubric();

    $("#rubric-total").textContent = String(rubric.total);
    $("#criteria-count").textContent = String(rubric.criteria.length);

    const assignmentTotal = Number($("#total-points").value || 100);
    const difference = rubric.total - assignmentTotal;

    $("#rubric-total-note").textContent =
      difference === 0
        ? "Matches the assignment total."
        : difference > 0
          ? `Over by ${difference} point(s) compared with the assignment total (${assignmentTotal}).`
          : `${Math.abs(difference)} point(s) remaining compared with the assignment total (${assignmentTotal}).`;
  }

  $("#add-criterion").addEventListener("click", () => {
    rubricContainer.appendChild(createCriterion("", 0));
    updateRubricSummary();

    $('input[name="criterion-name"]', rubricContainer.lastElementChild).focus();
  });

  rubricContainer.addEventListener("input", updateRubricSummary);
  $("#total-points").addEventListener("input", updateRubricSummary);

  $("#save-rubric").addEventListener("click", () => {
    const rubric = getRubric();

    if (!rubric.criteria.length) {
      showStatus(
        "rubric-status",
        "Add at least one named criterion before saving.",
        "error"
      );
      return;
    }

    const saved = writeStorage(RUBRIC_KEY, rubric);

    showStatus(
      "rubric-status",
      saved
        ? "✓ Rubric saved in this browser."
        : "Could not save the rubric in browser storage.",
      saved ? "success" : "error"
    );
  });

  $("#reset-rubric").addEventListener("click", () => {
    rubricContainer.replaceChildren(
      createCriterion("Accuracy", 50),
      createCriterion("Reasoning and explanation", 30),
      createCriterion("Completeness", 20)
    );

    $("#rubric-name").value = "My Grading Rubric";
    $("#rubric-instructions").value = "";

    updateRubricSummary();

    showStatus(
      "rubric-status",
      "Default rubric restored. Save it to keep the changes.",
      "success"
    );
  });

  // ----------------------------------------
  // SESSION HISTORY
  // ----------------------------------------

  function getHistory() {
    const value = readStorage(HISTORY_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function renderHistory() {
    const list = $("#history-list");
    const entries = getHistory();

    $("#history-count").textContent = String(entries.length);
    list.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-symbol";
      icon.textContent = "◷";

      const title = document.createElement("h3");
      title.textContent = "No saved sessions yet";

      const copy = document.createElement("p");
      copy.textContent =
        "Prepared session summaries will appear here. Student answers are not saved in history.";

      empty.append(icon, title, copy);
      list.appendChild(empty);
      return;
    }

    entries.slice().reverse().forEach((entry) => {
      const row = document.createElement("article");
      row.className = "history-entry";

      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = entry.title || "Grading session";

      const details = document.createElement("small");
      const date = new Date(entry.createdAt);

      details.textContent =
        `${Number.isNaN(date.getTime()) ? "Saved session" : date.toLocaleString()} · ` +
        `${entry.points} possible points · ${entry.criteria} criteria`;

      info.append(title, details);

      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = "Prepared";

      row.append(info, chip);
      list.appendChild(row);
    });
  }

  $("#export-history").addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify(getHistory(), null, 2)],
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

  $("#clear-history").addEventListener("click", () => {
    if (!confirm("Clear saved GradeNova session summaries from this browser?")) {
      return;
    }

    writeStorage(HISTORY_KEY, []);
    renderHistory();
  });

  // ----------------------------------------
  // GRADING REQUEST VALIDATION
  // ----------------------------------------

  $("#grading-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const test = $("#test-input").value.trim();
    const answers = $("#answers-input").value.trim();
    const answerKey = $("#grading-answer-key").value.trim();
    const points = Number($("#total-points").value);
    const rubric = getRubric();

    if (!test || !answers) {
      showStatus(
        "grading-status",
        "Please enter both the test or assignment and the student's answers.",
        "error"
      );

      (!test ? $("#test-input") : $("#answers-input")).focus();
      return;
    }

    if (!Number.isFinite(points) || points <= 0) {
      showStatus(
        "grading-status",
        "Enter a total possible score greater than zero.",
        "error"
      );
      $("#total-points").focus();
      return;
    }

    if (rubric.criteria.some((item) => !Number.isFinite(item.points) || item.points < 0)) {
      showStatus(
        "grading-status",
        "Check the rubric point values. They must be zero or greater.",
        "error"
      );
      return;
    }

    if (rubric.criteria.length && rubric.total > points) {
      showStatus(
        "grading-status",
        `Your rubric totals ${rubric.total} points, more than the ${points} possible points. Adjust the rubric or assignment total first.`,
        "error"
      );

      openTab("rubric");
      return;
    }

    showStatus(
      "grading-status",
      "✓ Request validated. No score has been generated because an AI grading backend is not connected.",
      "success"
    );

    const result = $("#results-content");
    result.replaceChildren();

    const icon = document.createElement("span");
    icon.className = "empty-symbol";
    icon.textContent = "⌁";

    const title = document.createElement("h3");
    title.textContent = "Request prepared — not graded yet";

    const message = document.createElement("p");
    message.textContent =
      "Your inputs passed front-end validation. Connect a secured backend to receive an actual score and feedback report.";

    const back = document.createElement("a");
    back.className = "btn btn-primary";
    back.href = "#grading";
    back.textContent = "Return to grading";

    result.append(icon, title, message, back);

    if ($("#option-history").checked) {
      const entries = getHistory();

      entries.push({
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        title: rubric.name,
        points,
        criteria: rubric.criteria.length,
        hasAnswerKey: Boolean(answerKey),
        strictness: $("#grading-strictness").value
      });

      writeStorage(HISTORY_KEY, entries.slice(-50));
      renderHistory();
    }

    openTab("results");
  });

  $("#clear-grading").addEventListener("click", () => {
    $("#grading-form").reset();
    $("#total-points").value = "100";

    showStatus("grading-status", "Form cleared. Your rubric and saved history were not changed.");
    updateRubricSummary();
  });

  // ----------------------------------------
  // SETTINGS
  // ----------------------------------------

  $("#save-settings").addEventListener("click", () => {
    const prefs = {
      theme: $("#settings-theme").value,
      accent: $("#accent-color").value,
      motion: $("#settings-motion").checked,
      strictness: $("#settings-default-strictness").value
    };

    applyTheme(prefs.theme, false);
    applyAccent(prefs.accent, false);
    applyMotion(prefs.motion);

    $("#grading-strictness").value = prefs.strictness;

    const saved = writeStorage(PREFS_KEY, prefs);

    showStatus(
      "settings-status",
      saved
        ? "✓ Your studio preferences are saved on this device."
        : "Could not save preferences. Check your browser storage settings.",
      saved ? "success" : "error"
    );
  });

  $("#reset-settings").addEventListener("click", () => {
    applyTheme("cosmic", false);
    applyAccent("#39d7ff", false);
    applyMotion(true);

    $("#settings-default-strictness").value = "balanced";
    $("#grading-strictness").value = "balanced";

    writeStorage(PREFS_KEY, {
      theme: "cosmic",
      accent: "#39d7ff",
      motion: true,
      strictness: "balanced"
    });

    showStatus("settings-status", "Default appearance restored.", "success");
  });

  // ----------------------------------------
  // RESTORE SAVED PREFERENCES AND START UP
  // ----------------------------------------

  const prefs = readStorage(PREFS_KEY, {});

  applyTheme(
    Object.hasOwn(THEMES, prefs.theme) ? prefs.theme : "cosmic",
    false
  );

  applyAccent(
    typeof prefs.accent === "string" ? prefs.accent : "#39d7ff",
    false
  );

  applyMotion(typeof prefs.motion === "boolean" ? prefs.motion : true);

  if (["lenient", "balanced", "strict"].includes(prefs.strictness)) {
    $("#settings-default-strictness").value = prefs.strictness;
    $("#grading-strictness").value = prefs.strictness;
  }

  const savedRubric = readStorage(RUBRIC_KEY, null);

  if (savedRubric && Array.isArray(savedRubric.criteria) && savedRubric.criteria.length) {
    $("#rubric-name").value = savedRubric.name || "My Grading Rubric";
    $("#rubric-instructions").value = savedRubric.instructions || "";

    rubricContainer.replaceChildren(
      ...savedRubric.criteria.map((item) =>
        createCriterion(item.name, item.points)
      )
    );
  }

  createAnimations();
  updateRubricSummary();
  renderHistory();

  openTab(
    VALID_TABS.has(location.hash.slice(1))
      ? location.hash.slice(1)
      : "home",
    false
  );

  console.info("GradeNova initialized. Front end ready; AI backend not connected.");
});
