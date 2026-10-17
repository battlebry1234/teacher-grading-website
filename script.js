/* =========================================================
   GradeNova — theme controls, rubric builder, settings, history
   The frontend prepares requests; it does not claim to grade
   until a real backend endpoint is configured.
   ========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const PREFS_KEY = "gradenova-preferences";
  const HISTORY_KEY = "gradenova-history";

  const THEMES = {
    cosmic: {
      name: "Cosmic Space",
      description: "A cinematic deep-space atmosphere with layered stars, distant planets, and violet nebula light."
    },
    inferno: {
      name: "Inferno Fire",
      description: "A dark volcanic atmosphere with rising flames, molten light, and drifting embers."
    },
    forest: {
      name: "Enchanted Forest",
      description: "A moonlit woodland with deep tree silhouettes, low mist, and subtle fireflies."
    },
    ocean: {
      name: "Ocean Depths",
      description: "A deep underwater scene with blue light shafts, distant sea life, and drifting bubbles."
    },
    light: {
      name: "Light",
      description: "A clean, bright workspace with a soft, calm background."
    }
  };

  const body = document.body;
  const themeSelect = $("#settings-theme");
  const motionCheckbox = $("#settings-motion");
  const strictnessSelect = $("#settings-default-strictness");
  const gradingStrictness = $("#grading-strictness");
  const settingsStatus = $("#settings-status");
  const gradingStatus = $("#grading-status");
  const gradingForm = $("#grading-form");
  const rubricCriteria = $("#rubric-criteria");
  const historyList = $("#history-list");

  let nextCriterionId = 4;

  function safeRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`Could not read ${key}.`, error);
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Could not save ${key}.`, error);
      return false;
    }
  }

  function updateThemeButtons(theme) {
    $$("[data-set-theme]").forEach((button) => {
      const selected = button.dataset.setTheme === theme;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function applyTheme(theme, persist = true) {
    if (!Object.hasOwn(THEMES, theme)) {
      theme = "cosmic";
    }

    body.dataset.theme = theme;

    const themeColor = $('meta[name="theme-color"]');
    const colors = {
      cosmic: "#07091d",
      inferno: "#170603",
      forest: "#03140d",
      ocean: "#031421",
      light: "#eef2ff"
    };

    if (themeColor) {
      themeColor.content = colors[theme];
    }

    if (themeSelect) {
      themeSelect.value = theme;
    }

    updateThemeButtons(theme);

    const name = $("#current-theme-name");
    const description = $("#current-theme-description");

    if (name) {
      name.textContent = THEMES[theme].name;
    }

    if (description) {
      description.textContent = THEMES[theme].description;
    }

    if (persist) {
      safeWrite(PREFS_KEY, {
        ...safeRead(PREFS_KEY, {}),
        theme
      });
    }
  }

  $$("[data-set-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.setTheme);
    });
  });

  themeSelect?.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });

  function applyMotion(enabled) {
    body.classList.toggle("motion-off", !enabled);

    if (motionCheckbox) {
      motionCheckbox.checked = enabled;
    }

    const particles = $("#ambient-particles");

    if (particles) {
      particles.hidden = !enabled;
    }
  }

  motionCheckbox?.addEventListener("change", () => {
    applyMotion(motionCheckbox.checked);
  });

  /* Decorative particles. They do not block buttons or forms. */
  function createAmbientParticles() {
    const container = $("#ambient-particles");

    if (!container || container.childElementCount > 0) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 24; i += 1) {
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

    container.appendChild(fragment);
  }

  function createCriterion(id) {
    const row = document.createElement("div");
    row.className = "field-group rubric-row";

    const nameLabel = document.createElement("label");
    nameLabel.htmlFor = `criterion-${id}`;
    nameLabel.textContent = `Criterion ${id}`;

    const nameInput = document.createElement("input");
    nameInput.id = `criterion-${id}`;
    nameInput.name = "criterion-name";
    nameInput.type = "text";
    nameInput.placeholder = "e.g. Evidence and reasoning";
    nameInput.maxLength = 150;

    const pointsLabel = document.createElement("label");
    pointsLabel.htmlFor = `criterion-points-${id}`;
    pointsLabel.textContent = "Points";

    const pointsInput = document.createElement("input");
    pointsInput.id = `criterion-points-${id}`;
    pointsInput.name = "criterion-points";
    pointsInput.type = "number";
    pointsInput.min = "0";
    pointsInput.max = "10000";
    pointsInput.step = "1";
    pointsInput.value = "0";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn btn-secondary remove-criterion";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove criterion ${id}`);

    removeButton.addEventListener("click", () => {
      row.remove();
      updateCriterionLabels();
    });

    row.append(
      nameLabel,
      nameInput,
      pointsLabel,
      pointsInput,
      removeButton
    );

    return row;
  }

  function updateCriterionLabels() {
    if (!rubricCriteria) {
      return;
    }

    $$(".rubric-row", rubricCriteria).forEach((row, index) => {
      const number = index + 1;
      const nameInput = $('input[name="criterion-name"]', row);
      const pointsInput = $('input[name="criterion-points"]', row);
      const labels = $$("label", row);

      if (!nameInput || !pointsInput) {
        return;
      }

      nameInput.id = `criterion-${number}`;
      pointsInput.id = `criterion-points-${number}`;

      if (labels[0]) {
        labels[0].htmlFor = nameInput.id;
        labels[0].textContent = `Criterion ${number}`;
      }

      if (labels[1]) {
        labels[1].htmlFor = pointsInput.id;
        labels[1].textContent = "Points";
      }

      const remove = $(".remove-criterion", row);

      if (remove) {
        remove.setAttribute("aria-label", `Remove criterion ${number}`);
      }
    });

    nextCriterionId = $$(".rubric-row", rubricCriteria).length + 1;
  }

  $("#add-criterion")?.addEventListener("click", () => {
    if (!rubricCriteria) {
      return;
    }

    const row = createCriterion(nextCriterionId++);
    rubricCriteria.appendChild(row);
    updateCriterionLabels();

    $('input[name="criterion-name"]', row)?.focus();
  });

  function collectRubric() {
    const criteria = $$(".rubric-row", rubricCriteria || document)
      .map((row) => ({
        name: $('input[name="criterion-name"]', row)?.value.trim() || "",
        points: Number(
          $('input[name="criterion-points"]', row)?.value || 0
        )
      }))
      .filter((item) => item.name.length > 0);

    return {
      name: $("#rubric-name")?.value.trim() || "",
      totalPoints: Number($("#total-points")?.value || 100),
      strictness: gradingStrictness?.value || "balanced",
      instructions: $("#rubric-instructions")?.value.trim() || "",
      criteria
    };
  }

  function setStatus(message, type = "") {
    if (!gradingStatus) {
      return;
    }

    gradingStatus.textContent = message;
    gradingStatus.classList.remove("success", "error");

    if (type) {
      gradingStatus.classList.add(type);
    }
  }

  function renderHistory() {
    if (!historyList) {
      return;
    }

    const history = safeRead(HISTORY_KEY, []);
    historyList.replaceChildren();

    if (!Array.isArray(history) || history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.textContent = "◷";

      const strong = document.createElement("strong");
      strong.textContent = "No saved sessions yet";

      const p = document.createElement("p");
      p.textContent =
        "Prepared grading requests can be saved here on this device.";

      empty.append(icon, strong, p);
      historyList.appendChild(empty);
      return;
    }

    history.slice().reverse().forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-entry";

      const info = document.createElement("div");

      const title = document.createElement("strong");
      title.textContent =
        entry.rubricName || "Untitled grading session";

      const details = document.createElement("small");
      const date = new Date(entry.createdAt);

      details.textContent =
        `${Number.isNaN(date.getTime()) ? "Saved session" : date.toLocaleString()} · ` +
        `${entry.totalPoints} possible points`;

      info.append(title, details);

      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = "Prepared";

      item.append(info, chip);
      historyList.appendChild(item);
    });
  }

  if (gradingForm) {
    gradingForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const test = $("#test-input")?.value.trim() || "";
      const answers = $("#answers-input")?.value.trim() || "";
      const answerKey = $("#answer-key-input")?.value.trim() || "";
      const rubric = collectRubric();

      if (!test || !answers) {
        setStatus(
          "Please enter both the test and the student's answers.",
          "error"
        );

        (!test ? $("#test-input") : $("#answers-input"))?.focus();
        return;
      }

      if (
        !Number.isFinite(rubric.totalPoints) ||
        rubric.totalPoints <= 0
      ) {
        setStatus("Enter a total possible score greater than zero.", "error");
        $("#total-points")?.focus();
        return;
      }

      if (
        rubric.criteria.some(
          (item) => !Number.isFinite(item.points) || item.points < 0
        )
      ) {
        setStatus("Please check the point values in your rubric.", "error");
        return;
      }

      const criterionTotal = rubric.criteria.reduce(
        (sum, item) => sum + item.points,
        0
      );

      if (
        rubric.criteria.length &&
        criterionTotal > rubric.totalPoints
      ) {
        setStatus(
          `Your criteria add up to ${criterionTotal} points, which is more than the ${rubric.totalPoints} possible points. Adjust them before continuing.`,
          "error"
        );
        return;
      }

      const gradingRequest = {
        test,
        answers,
        answerKey: answerKey || null,
        rubric,
        options: {
          feedback: $("#option-feedback")?.checked ?? true,
          breakdown: $("#option-breakdown")?.checked ?? true,
          history: $("#option-history")?.checked ?? true,
          explanations: $("#option-explanations")?.checked ?? true
        }
      };

      /*
       * Do not log student work, answers, or answer-key contents.
       * The frontend currently prepares a request only.
       */
      console.info("GradeNova request prepared.", {
        hasTest: Boolean(gradingRequest.test),
        hasAnswers: Boolean(gradingRequest.answers),
        hasAnswerKey: Boolean(gradingRequest.answerKey),
        rubricCriteria: rubric.criteria.length,
        strictness: rubric.strictness
      });

      if ($("#option-history")?.checked) {
        const history = safeRead(HISTORY_KEY, []);

        const entry = {
          id: `${Date.now()}`,
          createdAt: new Date().toISOString(),
          rubricName: rubric.name || "Untitled grading session",
          totalPoints: rubric.totalPoints,
          criterionCount: rubric.criteria.length,
          strictness: rubric.strictness,
          hasAnswerKey: Boolean(answerKey)
        };

        const next = Array.isArray(history)
          ? [...history, entry].slice(-30)
          : [entry];

        safeWrite(HISTORY_KEY, next);
        renderHistory();
      }

      setStatus(
        "✓ Your test, answers, and grading rules are prepared. Actual AI grading will work after the Python backend is hosted and connected.",
        "success"
      );

      const results = $("#results-content");

      if (results) {
        results.replaceChildren();

        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("span");
        icon.className = "empty-icon";
        icon.textContent = "⌁";

        const strong = document.createElement("strong");
        strong.textContent = "Request prepared — not graded yet";

        const p = document.createElement("p");
        p.textContent =
          "The front-end has validated your inputs. Connect the hosted backend to receive an actual AI score and feedback report.";

        empty.append(icon, strong, p);
        results.appendChild(empty);
      }
    });
  }

  $("#export-history")?.addEventListener("click", () => {
    const history = safeRead(HISTORY_KEY, []);
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
    if (
      !window.confirm(
        "Clear the saved GradeNova session history from this browser?"
      )
    ) {
      return;
    }

    safeWrite(HISTORY_KEY, []);
    renderHistory();
  });

  $$('nav a[href^="#"], .quick-links a, .hero-actions a, .header-settings')
    .forEach((link) => {
      link.addEventListener("click", () => {
        const target = link.getAttribute("href");

        if (!target) {
          return;
        }

        $$('nav a[href^="#"]').forEach((item) => {
          item.classList.toggle(
            "active",
            item.getAttribute("href") === target
          );
        });
      });
    });

  $("#save-settings")?.addEventListener("click", () => {
    const prefs = {
      theme: themeSelect?.value || "cosmic",
      motion: motionCheckbox?.checked ?? true,
      strictness: strictnessSelect?.value || "balanced"
    };

    applyTheme(prefs.theme, false);
    applyMotion(prefs.motion);

    if (gradingStrictness) {
      gradingStrictness.value = prefs.strictness;
    }

    const saved = safeWrite(PREFS_KEY, prefs);

    if (settingsStatus) {
      settingsStatus.textContent = saved
        ? "✓ Preferences saved on this device."
        : "Could not save preferences. Check your browser storage settings.";

      settingsStatus.classList.toggle("success", saved);
      settingsStatus.classList.toggle("error", !saved);
    }
  });

  /* Restore settings from this browser. */
  const prefs = safeRead(PREFS_KEY, {});

  applyTheme(
    Object.hasOwn(THEMES, prefs.theme) ? prefs.theme : "cosmic",
    false
  );

  applyMotion(
    typeof prefs.motion === "boolean" ? prefs.motion : true
  );

  if (
    strictnessSelect &&
    ["lenient", "balanced", "strict"].includes(prefs.strictness)
  ) {
    strictnessSelect.value = prefs.strictness;
  }

  if (
    gradingStrictness &&
    ["lenient", "balanced", "strict"].includes(prefs.strictness)
  ) {
    gradingStrictness.value = prefs.strictness;
  }

  createAmbientParticles();
  renderHistory();

  console.info("GradeNova dashboard initialized.");
});
