
/* ==========================================
   GradeNova — Interactive Dashboard
   Themes • Settings • Rubric • Grading UI
   ========================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const STORAGE_KEY = "gradenova-preferences";
  const VALID_THEMES = [
    "cosmic",
    "inferno",
    "forest",
    "ocean",
    "light"
  ];

  const body = document.body;
  const themeSelect = $("#settings-theme");
  const motionCheckbox = $("#settings-motion");
  const strictnessSelect = $("#settings-default-strictness");
  const gradingStrictness = $("#grading-strictness");
  const settingsStatus = $("#settings-status");
  const gradingStatus = $("#grading-status");
  const gradingForm = $("#grading-form");
  const rubricCriteria = $("#rubric-criteria");
  const addCriterionButton = $("#add-criterion");

  let nextCriterionId = 4;

  // ------------------------------------------
  // SAFE PREFERENCE STORAGE
  // ------------------------------------------

  function loadPreferences() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn("Could not load GradeNova preferences.", error);
      return {};
    }
  }

  function savePreferences(preferences) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(preferences)
      );
      return true;
    } catch (error) {
      console.warn("Could not save GradeNova preferences.", error);
      return false;
    }
  }

  const preferences = loadPreferences();

  // ------------------------------------------
  // THEME SYSTEM
  // ------------------------------------------

  function updateThemeButtons(theme) {
    $$("[data-set-theme]").forEach((button) => {
      const selected = button.dataset.setTheme === theme;

      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("active", selected);
    });
  }

  function applyTheme(theme, persist = true) {
    if (!VALID_THEMES.includes(theme)) {
      theme = "cosmic";
    }

    body.dataset.theme = theme;

    if (themeSelect) {
      themeSelect.value = theme;
    }

    updateThemeButtons(theme);

    if (persist) {
      savePreferences({
        ...loadPreferences(),
        theme
      });
    }
  }

  $$("[data-set-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.setTheme);
    });
  });

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      applyTheme(themeSelect.value);
    });
  }

  // ------------------------------------------
  // BACKGROUND ANIMATION SETTING
  // ------------------------------------------

  function applyMotion(enabled) {
    body.classList.toggle("motion-off", !enabled);

    if (motionCheckbox) {
      motionCheckbox.checked = enabled;
    }
  }

  // Add an accessible way to disable animated effects.
  const motionStyle = document.createElement("style");

  motionStyle.textContent = `
    .motion-off *,
    .motion-off *::before,
    .motion-off *::after {
      animation: none !important;
      scroll-behavior: auto !important;
      transition: none !important;
    }
  `;

  document.head.appendChild(motionStyle);

  if (motionCheckbox) {
    motionCheckbox.addEventListener("change", () => {
      applyMotion(motionCheckbox.checked);
    });
  }

  // ------------------------------------------
  // SAVE SETTINGS
  // ------------------------------------------

  const saveSettingsButton = $("#save-settings");

  if (saveSettingsButton) {
    saveSettingsButton.addEventListener("click", () => {
      const currentPreferences = {
        ...loadPreferences(),
        theme: themeSelect?.value || "cosmic",
        motion: motionCheckbox?.checked ?? true,
        strictness: strictnessSelect?.value || "balanced"
      };

      if (VALID_THEMES.includes(currentPreferences.theme)) {
        applyTheme(currentPreferences.theme, false);
      }

      applyMotion(currentPreferences.motion);

      if (gradingStrictness) {
        gradingStrictness.value = currentPreferences.strictness;
      }

      const saved = savePreferences(currentPreferences);

      if (settingsStatus) {
        settingsStatus.textContent = saved
          ? "✓ Your preferences have been saved on this device."
          : "Your preferences could not be saved. Check your browser settings.";
      }
    });
  }

  // ------------------------------------------
  // RUBRIC BUILDER
  // ------------------------------------------

  function createCriterion(id) {
    const wrapper = document.createElement("div");
    wrapper.className = "field-group rubric-row";

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
    removeButton.className = "btn btn-secondary";
    removeButton.textContent = "Remove criterion";
    removeButton.setAttribute(
      "aria-label",
      `Remove criterion ${id}`
    );

    removeButton.addEventListener("click", () => {
      wrapper.remove();
      updateCriterionLabels();
    });

    wrapper.append(
      nameLabel,
      nameInput,
      pointsLabel,
      pointsInput,
      removeButton
    );

    return wrapper;
  }

  function updateCriterionLabels() {
    if (!rubricCriteria) return;

    $$(".rubric-row", rubricCriteria).forEach((row, index) => {
      const number = index + 1;
      const nameInput = $('input[name="criterion-name"]', row);
      const pointsInput = $('input[name="criterion-points"]', row);
      const labels = $$("label", row);

      if (!nameInput || !pointsInput) return;

      nameInput.id = `criterion-${number}`;
      nameInput.placeholder = "e.g. Accuracy and reasoning";
      pointsInput.id = `criterion-points-${number}`;

      if (labels[0]) {
        labels[0].htmlFor = nameInput.id;
        labels[0].textContent = `Criterion ${number}`;
      }

      if (labels[1]) {
        labels[1].htmlFor = pointsInput.id;
        labels[1].textContent = "Points";
      }
    });
  }

  if (addCriterionButton && rubricCriteria) {
    addCriterionButton.addEventListener("click", () => {
      const row = createCriterion(nextCriterionId++);

      rubricCriteria.appendChild(row);
      updateCriterionLabels();

      const inputs = $$('input[name="criterion-name"]', row);
      inputs[0]?.focus();
    });
  }

  // ------------------------------------------
  // RUBRIC DATA COLLECTION
  // ------------------------------------------

  function collectRubric() {
    const criteria = $$(".rubric-row", rubricCriteria || document)
      .map((row) => {
        const name = $('input[name="criterion-name"]', row);
        const points = $('input[name="criterion-points"]', row);

        return {
          name: name?.value.trim() || "",
          points: Number(points?.value || 0)
        };
      })
      .filter((criterion) => criterion.name.length > 0);

    return {
      name: $("#rubric-name")?.value.trim() || "",
      totalPoints: Number($("#total-points")?.value || 100),
      strictness: gradingStrictness?.value || "balanced",
      instructions: $("#rubric-instructions")?.value.trim() || "",
      criteria
    };
  }

  // ------------------------------------------
  // GRADING FORM VALIDATION
  // ------------------------------------------

  if (gradingForm) {
    gradingForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const test = $("#test-input")?.value.trim() || "";
      const answers = $("#answers-input")?.value.trim() || "";
      const answerKey = $("#answer-key-input")?.value.trim() || "";
      const rubric = collectRubric();

      if (!test || !answers) {
        if (gradingStatus) {
          gradingStatus.textContent =
            "Please enter both the test and the student's answers.";
        }

        (!test ? $("#test-input") : $("#answers-input"))?.focus();
        return;
      }

      if (!Number.isFinite(rubric.totalPoints) ||
          rubric.totalPoints <= 0) {
        if (gradingStatus) {
          gradingStatus.textContent =
            "Please enter a total possible score greater than zero.";
        }

        $("#total-points")?.focus();
        return;
      }

      if (rubric.criteria.some((item) =>
        !Number.isFinite(item.points) || item.points < 0
      )) {
        if (gradingStatus) {
          gradingStatus.textContent =
            "Please check the point values in your rubric.";
        }
        return;
      }

      // Prepare the grading request without exposing private keys.
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

      // The backend endpoint is not configured yet.
      // Do not pretend that grading has occurred.
      console.info(
        "GradeNova grading request prepared.",
        {
          hasTest: Boolean(gradingRequest.test),
          hasAnswers: Boolean(gradingRequest.answers),
          hasAnswerKey: Boolean(gradingRequest.answerKey),
          rubricCriteria: gradingRequest.rubric.criteria.length,
          strictness: gradingRequest.rubric.strictness
        }
      );

      if (gradingStatus) {
        gradingStatus.textContent =
          "✓ Your test, answers, and grading options are ready. " +
          "AI grading will become available after the Python backend " +
          "is hosted and connected.";
      }
    });
  }

  // ------------------------------------------
  // NAVIGATION HIGHLIGHTING
  // ------------------------------------------

  $$('nav a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      $$("nav a").forEach((item) => {
        item.classList.toggle("active", item === link);
      });
    });
  });

  // ------------------------------------------
  // RESTORE PREFERENCES
  // ------------------------------------------

  const initialTheme = VALID_THEMES.includes(preferences.theme)
    ? preferences.theme
    : "cosmic";

  applyTheme(initialTheme, false);

  applyMotion(
    typeof preferences.motion === "boolean"
      ? preferences.motion
      : true
  );

  if (
    strictnessSelect &&
    ["lenient", "balanced", "strict"].includes(preferences.strictness)
  ) {
    strictnessSelect.value = preferences.strictness;
  }

  if (
    gradingStrictness &&
    ["lenient", "balanced", "strict"].includes(preferences.strictness)
  ) {
    gradingStrictness.value = preferences.strictness;
  }

  console.info("GradeNova dashboard initialized.");
});
