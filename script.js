
(() => {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const PREFS_KEY = "gradenova-v2-preferences";
  const HISTORY_KEY = "gradenova-v2-history";

  const themes = {
    cosmic: {
      name: "Cosmic Space",
      short: "Cosmic",
      description:
        "A deep-space atmosphere with stars, planets, and glowing nebula clouds.",
      caption: "Space, stars, and nebulae"
    },

    inferno: {
      name: "Inferno",
      short: "Inferno",
      description:
        "A fiery atmosphere with glowing flames, heat, and drifting embers.",
      caption: "Flames and glowing embers"
    },

    forest: {
      name: "Enchanted Forest",
      short: "Forest",
      description:
        "Ancient trees, moonlit mist, green vines, and fireflies.",
      caption: "Trees, vines, and fireflies"
    },

    ocean: {
      name: "Ocean Depths",
      short: "Ocean",
      description:
        "Underwater light rays, swimming fish, seaweed, and rising bubbles.",
      caption: "Fish, water, and bubbles"
    },

    light: {
      name: "Light",
      short: "Light",
      description:
        "A clean, bright workspace with a soft, calm background.",
      caption: "Bright and minimal"
    }
  };

  const pages = {
    home: "Home",
    grade: "Grade a Test",
    history: "History",
    customize: "Customization",
    settings: "Settings"
  };

  const body = document.body;

  let currentPage = "home";
  let nextCriterion = 4;

  // ----------------------------------------
  // LOCAL STORAGE
  // ----------------------------------------

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  // ----------------------------------------
  // MULTI-SCREEN NAVIGATION
  // ----------------------------------------

  function goTo(page, updateHash = true) {
    if (!pages[page]) {
      page = "home";
    }

    currentPage = page;

    $$(".page").forEach(section => {
      section.classList.toggle(
        "active",
        section.dataset.page === page
      );
    });

    $$("[data-nav]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.nav === page &&
          button.classList.contains("nav-item")
      );
    });

    const breadcrumb = $("#page-breadcrumb");

    if (breadcrumb) {
      breadcrumb.textContent = pages[page];
    }

    if (
      updateHash &&
      location.hash !== `#${page}`
    ) {
      history.replaceState(null, "", `#${page}`);
    }

    window.scrollTo({
      top: 0,
      behavior: body.classList.contains("motion-off")
        ? "auto"
        : "smooth"
    });

    if (page === "history") {
      renderHistory();
    }

    if (page === "home") {
      updateOverview();
    }
  }

  $$("[data-nav]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      goTo(button.dataset.nav);
    });
  });

  window.addEventListener("hashchange", () => {
    const page = location.hash.slice(1);

    if (pages[page]) {
      goTo(page, false);
    }
  });

  // ----------------------------------------
  // THEME CUSTOMIZATION
  // ----------------------------------------

  function applyTheme(theme, persist = true) {
    if (!Object.hasOwn(themes, theme)) {
      theme = "cosmic";
    }

    body.dataset.theme = theme;

    $$("[data-set-theme]").forEach(button => {
      const selected =
        button.dataset.setTheme === theme;

      button.classList.toggle("selected", selected);

      button.setAttribute(
        "aria-pressed",
        String(selected)
      );
    });

    const customName = $("#custom-theme-name");
    const customDescription =
      $("#custom-theme-description");

    if (customName) {
      customName.textContent = themes[theme].name;
    }

    if (customDescription) {
      customDescription.textContent =
        themes[theme].description;
    }

    if (persist) {
      write(PREFS_KEY, {
        ...read(PREFS_KEY, {}),
        theme
      });
    }

    updateOverview();
  }

  $$("[data-set-theme]").forEach(button => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.setTheme);
    });
  });

  // ----------------------------------------
  // MOTION SETTINGS
  // ----------------------------------------

  function applyMotion(enabled) {
    body.classList.toggle("motion-off", !enabled);

    const motion = $("#settings-motion");

    if (motion) {
      motion.checked = enabled;
    }
  }

  $("#settings-motion")?.addEventListener(
    "change",
    event => {
      applyMotion(event.target.checked);
    }
  );

  // ----------------------------------------
  // DASHBOARD STATISTICS
  // ----------------------------------------

  function updateSummary() {
    const points =
      $("#total-points")?.value || "100";

    const criteria = $$(".criterion-row", $("#rubric-criteria")).length;

    const summaryPoints = $("#summary-points");
    const summaryCriteria = $("#summary-criteria");
    const summaryKey = $("#summary-key");

    if (summaryPoints) {
      summaryPoints.textContent = points;
    }

    if (summaryCriteria) {
      summaryCriteria.textContent = String(criteria);
    }

    if (summaryKey) {
      summaryKey.textContent =
        $("#answer-key-input")?.value.trim()
          ? "Added"
          : "Optional";
    }

    updateOverview();
  }

  function updateOverview() {
    const historyItems = read(HISTORY_KEY, []);

    const sessionCount = $("#stat-sessions");
    const criteriaCount = $("#stat-criteria");
    const themeName = $("#stat-theme");
    const themeCaption = $("#stat-theme-caption");

    if (sessionCount) {
      sessionCount.textContent = String(
        Array.isArray(historyItems)
          ? historyItems.length
          : 0
      );
    }

    if (criteriaCount) {
      criteriaCount.textContent = String(
        $$(".criterion-row", $("#rubric-criteria")).length || 0
      );
    }

    const theme =
      themes[body.dataset.theme] || themes.cosmic;

    if (themeName) {
      themeName.textContent = theme.short;
    }

    if (themeCaption) {
      themeCaption.textContent = theme.caption;
    }
  }

  $("#total-points")?.addEventListener(
    "input",
    updateSummary
  );

  $("#answer-key-input")?.addEventListener(
    "input",
    updateSummary
  );

  // ----------------------------------------
  // RUBRIC BUILDER
  // ----------------------------------------

  function renumberCriteria() {
    const rows = $$(".criterion-row", $("#rubric-criteria"));

    rows.forEach((row, index) => {
      const number = index + 1;

      const name = $(
        'input[name="criterion-name"]',
        row
      );

      const points = $(
        'input[name="criterion-points"]',
        row
      );

      const label = $("label", row);
      const remove = $(".remove-criterion", row);

      if (name) {
        name.id = `criterion-${number}`;
      }

      if (points) {
        points.id = `criterion-points-${number}`;
      }

      if (label && name) {
        label.htmlFor = name.id;
        label.textContent = String(number).padStart(2, "0");
      }

      if (remove) {
        remove.disabled = rows.length <= 1;

        remove.setAttribute(
          "aria-label",
          `Remove criterion ${number}`
        );
      }
    });

    nextCriterion = rows.length + 1;

    updateSummary();
  }

  function createCriterion(number) {
    const row = document.createElement("div");
    row.className = "criterion-row";

    const label = document.createElement("label");
    label.htmlFor = `criterion-${number}`;
    label.textContent = String(number).padStart(2, "0");

    const name = document.createElement("input");
    name.type = "text";
    name.name = "criterion-name";
    name.id = `criterion-${number}`;
    name.placeholder = "Criterion name";
    name.maxLength = 150;

    const pointsLabel = document.createElement("span");
    pointsLabel.textContent = "POINTS";

    const points = document.createElement("input");
    points.type = "number";
    points.name = "criterion-points";
    points.id = `criterion-points-${number}`;
    points.min = "0";
    points.max = "10000";
    points.value = "0";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-criterion";
    remove.textContent = "×";

    remove.setAttribute(
      "aria-label",
      `Remove criterion ${number}`
    );

    remove.addEventListener("click", () => {
      row.remove();
      renumberCriteria();
    });

    row.append(
      label,
      name,
      pointsLabel,
      points,
      remove
    );

    return row;
  }

  $("#add-criterion")?.addEventListener("click", () => {
    const list = $("#rubric-criteria");

    if (!list) {
      return;
    }

    const row = createCriterion(nextCriterion++);

    list.appendChild(row);
    renumberCriteria();

    $('input[name="criterion-name"]', row)?.focus();
  });

  $("#rubric-criteria")?.addEventListener(
    "input",
    updateSummary
  );

  // ----------------------------------------
  // STATUS MESSAGES
  // ----------------------------------------

  function status(message, kind = "") {
    const element = $("#grading-status");

    if (!element) {
      return;
    }

    element.textContent = message;

    element.classList.remove("success", "error");

    if (kind) {
      element.classList.add(kind);
    }
  }

  // ----------------------------------------
  // HISTORY SCREEN
  // ----------------------------------------

  function renderHistory() {
    const list = $("#history-list");

    if (!list) {
      return;
    }

    const items = read(HISTORY_KEY, []);

    list.replaceChildren();

    if (!Array.isArray(items) || !items.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.textContent = "◷";

      const title = document.createElement("strong");
      title.textContent = "No sessions saved yet";

      const paragraph = document.createElement("p");
      paragraph.textContent =
        "When you prepare a grading request, its session details can appear here.";

      empty.append(icon, title, paragraph);
      list.appendChild(empty);

      return;
    }

    items.slice().reverse().forEach(item => {
      const row = document.createElement("div");
      row.className = "history-entry";

      const info = document.createElement("div");
      info.className = "history-entry-info";

      const icon = document.createElement("span");
      icon.className = "history-entry-icon";
      icon.textContent = "▤";

      const copy = document.createElement("div");

      const title = document.createElement("strong");
      title.textContent =
        item.rubricName || "Untitled grading session";

      const meta = document.createElement("small");

      const date = new Date(item.createdAt);

      meta.textContent =
        `${
          Number.isNaN(date.getTime())
            ? "Saved session"
            : date.toLocaleString()
        } · ${item.totalPoints} possible points · ${item.criterionCount} criteria`;

      copy.append(title, meta);
      info.append(icon, copy);

      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = "Prepared";

      row.append(info, chip);

      list.appendChild(row);
    });
  }

  // ----------------------------------------
  // GRADING FORM
  // ----------------------------------------

  $("#grading-form")?.addEventListener(
    "submit",
    event => {
      event.preventDefault();

      const test = $("#test-input").value.trim();

      const answers =
        $("#answers-input").value.trim();

      const answerKey =
        $("#answer-key-input").value.trim();

      const totalPoints = Number(
        $("#total-points").value || 100
      );

      const criteria = $$(".criterion-row", $("#rubric-criteria"))
        .map(row => ({
          name: $(
            'input[name="criterion-name"]',
            row
          )?.value.trim() || "",

          points: Number(
            $(
              'input[name="criterion-points"]',
              row
            )?.value || 0
          )
        }))
        .filter(item => item.name);

      if (!test || !answers) {
        status(
          "Please enter both the test and the student's answers.",
          "error"
        );

        (!test ? $("#test-input") : $("#answers-input")).focus();

        return;
      }

      if (
        !Number.isFinite(totalPoints) ||
        totalPoints <= 0
      ) {
        status(
          "Enter a total possible score greater than zero.",
          "error"
        );

        $("#total-points").focus();

        return;
      }

      if (
        criteria.some(
          item =>
            !Number.isFinite(item.points) ||
            item.points < 0
        )
      ) {
        status(
          "Please check the point values in your rubric.",
          "error"
        );

        return;
      }

      const criteriaPoints = criteria.reduce(
        (sum, item) => sum + item.points,
        0
      );

      if (
        criteria.length &&
        criteriaPoints > totalPoints
      ) {
        status(
          `Your criteria add up to ${criteriaPoints} points, more than the ${totalPoints} possible points. Adjust the rubric first.`,
          "error"
        );

        return;
      }

      // Do not log student answers or the answer key.
      console.info("GradeNova request prepared", {
        hasTest: true,
        hasAnswers: true,
        hasAnswerKey: Boolean(answerKey),
        criteriaCount: criteria.length
      });

      const prefs = read(PREFS_KEY, {});

      if (
        $("#option-history").checked &&
        prefs.saveHistory !== false
      ) {
        const historyItems = read(HISTORY_KEY, []);

        const entry = {
          id: String(Date.now()),
          createdAt: new Date().toISOString(),

          rubricName:
            $("#rubric-name").value.trim() ||
            "Untitled grading session",

          totalPoints,
          criterionCount: criteria.length,

          strictness:
            $("#grading-strictness").value,

          hasAnswerKey: Boolean(answerKey)
        };

        write(
          HISTORY_KEY,
          (
            Array.isArray(historyItems)
              ? [...historyItems, entry]
              : [entry]
          ).slice(-50)
        );

        renderHistory();
      }

      status(
        "✓ Your grading request is prepared. Actual AI grading will work once the secure Python backend is hosted and connected.",
        "success"
      );

      const results = $("#results-content");

      if (results) {
        results.replaceChildren();

        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("span");
        icon.textContent = "⌁";

        const title = document.createElement("strong");
        title.textContent =
          "Request prepared — not graded yet";

        const paragraph = document.createElement("p");
        paragraph.textContent =
          "The front-end validated your inputs. Connect the hosted backend to receive an actual score and feedback report.";

        empty.append(icon, title, paragraph);

        results.appendChild(empty);
      }

      updateOverview();
    }
  );

  // ----------------------------------------
  // EXPORT HISTORY
  // ----------------------------------------

  $("#export-history")?.addEventListener(
    "click",
    () => {
      const items = read(HISTORY_KEY, []);

      const blob = new Blob(
        [
          JSON.stringify(
            Array.isArray(items) ? items : [],
            null,
            2
          )
        ],
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
    }
  );

  // ----------------------------------------
  // CLEAR HISTORY
  // ----------------------------------------

  $("#clear-history")?.addEventListener(
    "click",
    () => {
      const confirmed = window.confirm(
        "Clear saved GradeNova session history from this browser?"
      );

      if (!confirmed) {
        return;
      }

      write(HISTORY_KEY, []);

      renderHistory();
      updateOverview();
    }
  );

  // ----------------------------------------
  // SAVE SETTINGS
  // ----------------------------------------

  $("#save-settings")?.addEventListener(
    "click",
    () => {
      const old = read(PREFS_KEY, {});

      const prefs = {
        ...old,

        theme: body.dataset.theme || "cosmic",

        motion:
          $("#settings-motion")?.checked ?? true,

        strictness:
          $("#settings-default-strictness")?.value ||
          "balanced",

        saveHistory:
          $("#settings-save-history")?.checked ?? true
      };

      applyMotion(prefs.motion);

      const saved = write(PREFS_KEY, prefs);

      const message = $("#settings-status");

      if (message) {
        message.textContent = saved
          ? "✓ Preferences saved on this device."
          : "Could not save preferences in this browser.";

        message.classList.toggle("success", saved);
        message.classList.toggle("error", !saved);
      }

      if ($("#grading-strictness")) {
        $("#grading-strictness").value =
          prefs.strictness;
      }
    }
  );

  // ----------------------------------------
  // INITIALIZE THE APPLICATION
  // ----------------------------------------

  const prefs = read(PREFS_KEY, {});

  applyTheme(
    Object.hasOwn(themes, prefs.theme)
      ? prefs.theme
      : "cosmic",
    false
  );

  applyMotion(
    typeof prefs.motion === "boolean"
      ? prefs.motion
      : true
  );

  if (
    $("#settings-default-strictness") &&
    ["lenient", "balanced", "strict"].includes(
      prefs.strictness
    )
  ) {
    $("#settings-default-strictness").value =
      prefs.strictness;
  }

  if (
    $("#grading-strictness") &&
    ["lenient", "balanced", "strict"].includes(
      prefs.strictness
    )
  ) {
    $("#grading-strictness").value =
      prefs.strictness;
  }

  if ($("#settings-save-history")) {
    $("#settings-save-history").checked =
      prefs.saveHistory !== false;
  }

  renumberCriteria();
  renderHistory();
  updateOverview();

  const requestedPage = location.hash.slice(1);

  goTo(
    pages[requestedPage] ? requestedPage : "home",
    false
  );
})();
