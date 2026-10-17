
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const PREFS_KEY = "gradenova-v2-preferences";
  const HISTORY_KEY = "gradenova-v2-history";

  const themes = {
    cosmic: {
      name: "Cosmic Space",
      short: "Cosmic",
      description: "A deep-space atmosphere with stars, planets, and glowing nebula clouds.",
      caption: "Space, stars, and nebulae"
    },
    inferno: {
      name: "Inferno",
      short: "Inferno",
      description: "A fiery atmosphere with glowing flames, heat, and drifting embers.",
      caption: "Flames and glowing embers"
    },
    forest: {
      name: "Enchanted Forest",
      short: "Forest",
      description: "Ancient trees, moonlit mist, green vines, and fireflies.",
      caption: "Trees, vines, and fireflies"
    },
    ocean: {
      name: "Ocean Depths",
      short: "Ocean",
      description: "Underwater light rays, swimming fish, seaweed, and rising bubbles.",
      caption: "Fish, water, and bubbles"
    },
    light: {
      name: "Light",
      short: "Light",
      description: "A clean, bright workspace with a soft, calm background.",
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

  /*
   * Creates illustrated scenery and theme-specific logo decorations.
   * All artwork is embedded SVG; no extra image files are needed.
   */
  function installThemeArtwork(theme) {
    const backdrop = $(".backdrop");
    if (!backdrop) return;

    let scene = $(".gn-theme-scene", backdrop);

    if (!scene) {
      scene = document.createElement("div");
      scene.className = "gn-theme-scene";
      scene.setAttribute("aria-hidden", "true");
      backdrop.appendChild(scene);
    }

    const scenes = {
      inferno: `
        <svg class="gn-world gn-world-fire"
             viewBox="0 0 1440 900"
             preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gn-fire-outer" x1="0" y1="1" x2="0" y2="0">
              <stop stop-color="#e51b00"/>
              <stop offset=".48" stop-color="#ff6500"/>
              <stop offset=".8" stop-color="#ffc247"/>
              <stop offset="1" stop-color="#fff0a0" stop-opacity=".12"/>
            </linearGradient>
            <linearGradient id="gn-fire-inner" x1="0" y1="1" x2="0" y2="0">
              <stop stop-color="#ff3b00"/>
              <stop offset=".58" stop-color="#ffb000"/>
              <stop offset="1" stop-color="#fff6bc"/>
            </linearGradient>
            <linearGradient id="gn-fire-core" x1="0" y1="1" x2="0" y2="0">
              <stop stop-color="#ff3300" stop-opacity=".9"/>
              <stop offset="1" stop-color="#ff9d00" stop-opacity="0"/>
            </linearGradient>
          </defs>

          <ellipse class="gn-fire-bed" cx="720" cy="900"
                   rx="950" ry="420" fill="url(#gn-fire-core)"/>

          <g class="gn-flame-back" fill="url(#gn-fire-outer)">
            <path class="gn-flame gn-f1"
              d="M0 900V640Q55 590 40 475Q120 565 95 665Q185 585 160 420Q265 545 225 690Q295 625 300 510Q365 640 330 740L360 900Z"/>
            <path class="gn-flame gn-f2"
              d="M250 900L265 700Q335 635 320 500Q390 575 375 665Q465 540 435 370Q540 520 495 680Q565 605 580 475Q645 630 600 745L650 900Z"/>
            <path class="gn-flame gn-f3"
              d="M510 900L525 675Q600 590 580 430Q665 540 640 660Q730 510 700 320Q810 475 760 665Q840 590 850 455Q920 615 880 730L940 900Z"/>
            <path class="gn-flame gn-f4"
              d="M800 900L815 700Q875 635 855 500Q930 580 910 680Q1000 550 970 390Q1075 535 1030 695Q1105 620 1115 490Q1180 635 1145 740L1210 900Z"/>
            <path class="gn-flame gn-f5"
              d="M1080 900L1090 700Q1155 630 1130 500Q1205 580 1190 685Q1280 550 1250 400Q1355 535 1310 700Q1380 625 1395 500L1440 600V900Z"/>
          </g>

          <g class="gn-flame-front" fill="url(#gn-fire-inner)">
            <path class="gn-flame gn-f6"
              d="M0 900V800Q80 750 70 660Q145 740 120 830Q205 730 185 600Q275 725 240 850L300 900Z"/>
            <path class="gn-flame gn-f7"
              d="M320 900L340 800Q415 740 390 640Q475 730 445 825Q535 710 505 585Q600 720 560 850L630 900Z"/>
            <path class="gn-flame gn-f8"
              d="M640 900L655 785Q730 715 700 600Q785 710 755 815Q845 690 815 550Q910 695 870 845L950 900Z"/>
            <path class="gn-flame gn-f9"
              d="M960 900L970 800Q1040 740 1015 635Q1100 720 1065 825Q1160 705 1130 590Q1220 715 1180 850L1260 900Z"/>
          </g>

          <g class="gn-embers">
            <circle cx="150" cy="570" r="4"/>
            <circle cx="370" cy="470" r="3"/>
            <circle cx="600" cy="390" r="4"/>
            <circle cx="790" cy="510" r="3"/>
            <circle cx="1000" cy="350" r="4"/>
            <circle cx="1270" cy="490" r="3"/>
            <circle cx="500" cy="240" r="3"/>
            <circle cx="1110" cy="210" r="3"/>
          </g>
        </svg>`,

      forest: `
        <svg class="gn-world gn-world-forest"
             viewBox="0 0 1440 900"
             preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gn-forest-mist" x1="0" y1="0" x2="0" y2="1">
              <stop stop-color="#91f7ad" stop-opacity=".02"/>
              <stop offset=".58" stop-color="#91f7ad" stop-opacity=".15"/>
              <stop offset="1" stop-color="#00170b" stop-opacity=".08"/>
            </linearGradient>
          </defs>

          <path d="M0 900V230L70 100 130 230 180 90 240 220
            300 120 360 245 420 115 490 260 550 140
            610 245 670 95 730 235 790 130 850 250
            910 105 970 230 1040 110 1100 240
            1170 85 1230 215 1300 120 1370 230 1440 140V900Z"
            fill="#061b10"/>

          <g class="gn-forest-distant" fill="#0b301b">
            <path d="M0 900V460L95 300 190 460V900Z"/>
            <path d="M120 900V400L220 215 320 400V900Z"/>
            <path d="M270 900V480L370 270 470 480V900Z"/>
            <path d="M980 900V450L1080 245 1180 450V900Z"/>
            <path d="M1120 900V390L1230 180 1340 390V900Z"/>
            <path d="M1270 900V470L1360 280 1450 470V900Z"/>
          </g>

          <g class="gn-tree-front" fill="#010a05">
            <path d="M-40 900V310L20 245H-15L60 120 135 245H100
              L155 335H115L175 420 125 405V900Z"/>
            <path d="M170 900V400L215 345H180L245 225 310 345H275
              L335 440 290 425V900Z"/>
            <path d="M1220 900V380L1270 315H1235L1305 175
              1375 315H1340L1400 400 1360 385V900Z"/>
            <path d="M1350 900V300L1390 240H1360L1420 100
              1480 240H1450L1500 325 1460 310V900Z"/>
          </g>

          <g class="gn-forest-branches" fill="none"
             stroke="#174b2b" stroke-width="18" stroke-linecap="round">
            <path d="M55 900Q75 670 45 510T-5 400"/>
            <path d="M55 680Q100 610 135 600"/>
            <path d="M245 900Q265 670 235 470T175 375"/>
            <path d="M1285 900Q1300 650 1275 460T1210 365"/>
            <path d="M1400 900Q1410 660 1385 465"/>
          </g>

          <rect width="1440" height="900" fill="url(#gn-forest-mist)"/>

          <g class="gn-fireflies">
            <circle cx="260" cy="330" r="3"/>
            <circle cx="410" cy="490" r="4"/>
            <circle cx="610" cy="270" r="3"/>
            <circle cx="880" cy="400" r="4"/>
            <circle cx="1040" cy="315" r="3"/>
            <circle cx="760" cy="610" r="3"/>
            <circle cx="350" cy="670" r="3"/>
          </g>
        </svg>`,

      ocean: `
        <svg class="gn-world gn-world-ocean"
             viewBox="0 0 1440 900"
             preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gn-ocean-rays" x1="0" y1="0" x2="0" y2="1">
              <stop stop-color="#b9f5ff" stop-opacity=".38"/>
              <stop offset="1" stop-color="#2dd4bf" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="gn-ocean-floor" x1="0" y1="0" x2="0" y2="1">
              <stop stop-color="#075b59"/>
              <stop offset="1" stop-color="#01121d"/>
            </linearGradient>
          </defs>

          <g class="gn-water-rays">
            <path d="M150 0H340L620 760H470Z" fill="url(#gn-ocean-rays)"/>
            <path d="M470 0H590L790 650H690Z" fill="url(#gn-ocean-rays)"/>
            <path d="M1000 0H1130L990 580H890Z" fill="url(#gn-ocean-rays)"/>
            <path d="M1260 0H1380L1240 650H1140Z" fill="url(#gn-ocean-rays)"/>
          </g>

          <g class="gn-fish-school">
            <g class="gn-fish gn-fish-a">
              <path d="M0 0Q25 -20 52 0Q25 20 0 0Z" fill="#9deaff"/>
              <path d="M0 0L-17 -13 -17 13Z" fill="#38bdf8"/>
              <circle cx="39" cy="-2" r="2.5" fill="#03263c"/>
            </g>
            <g class="gn-fish gn-fish-b">
              <path d="M0 0Q32 -24 66 0Q32 24 0 0Z" fill="#67e8f9"/>
              <path d="M0 0L-20 -15 -20 15Z" fill="#0ea5e9"/>
              <circle cx="50" cy="-3" r="3" fill="#03263c"/>
            </g>
            <g class="gn-fish gn-fish-c">
              <path d="M0 0Q19 -14 40 0Q19 14 0 0Z" fill="#ccfbf1"/>
              <path d="M0 0L-13 -10 -13 10Z" fill="#5eead4"/>
              <circle cx="30" cy="-2" r="2" fill="#03263c"/>
            </g>
            <g class="gn-fish gn-fish-d">
              <path d="M0 0Q26 -18 54 0Q26 18 0 0Z" fill="#38bdf8"/>
              <path d="M0 0L-16 -12 -16 12Z" fill="#a5f3fc"/>
              <circle cx="42" cy="-2" r="2.5" fill="#03263c"/>
            </g>
          </g>

          <g class="gn-ocean-bubbles" fill="none"
             stroke="#a5f3fc" stroke-width="2">
            <circle cx="140" cy="700" r="8"/>
            <circle cx="190" cy="610" r="4"/>
            <circle cx="430" cy="770" r="6"/>
            <circle cx="990" cy="680" r="8"/>
            <circle cx="1100" cy="740" r="4"/>
            <circle cx="1280" cy="570" r="7"/>
            <circle cx="760" cy="820" r="5"/>
            <circle cx="580" cy="600" r="4"/>
          </g>

          <path class="gn-seafloor"
            d="M0 800Q130 745 260 810T520 800T780 815
            T1040 790T1300 810T1440 785V900H0Z"
            fill="url(#gn-ocean-floor)"/>

          <g class="gn-seaweed" fill="none" stroke="#0e8068"
             stroke-width="13" stroke-linecap="round">
            <path d="M80 900Q115 820 75 760T70 675"/>
            <path d="M105 900Q150 830 125 790T140 725"/>
            <path d="M350 900Q390 820 355 770T360 690"/>
            <path d="M1190 900Q1150 820 1190 760T1195 680"/>
            <path d="M1300 900Q1260 830 1300 785T1310 715"/>
          </g>
        </svg>`
    };

    scene.innerHTML = scenes[theme] || "";
    scene.dataset.theme = theme;
    scene.hidden = !scenes[theme];

    const logoArt = {
      inferno: `
        <svg class="theme-logo-scene gn-logo-fire" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M8 96Q-2 70 14 52Q12 70 24 74
            Q17 47 35 20Q35 49 45 55Q43 29 58 9
            Q60 43 70 51Q70 31 82 23Q78 52 94 65
            Q105 83 91 96Z" fill="#ff4b00"/>
          <path d="M20 96Q12 76 29 58Q27 76 41 82
            Q34 59 49 37Q52 63 61 72Q62 53 74 43
            Q71 69 84 80Q90 91 79 97Z" fill="#ffb000"/>
          <path d="M37 97Q31 82 45 69Q44 84 54 88
            Q54 74 64 62Q66 80 73 87L68 98Z" fill="#fff0a3"/>
        </svg>`,

      forest: `
        <svg class="theme-logo-scene gn-logo-vines" viewBox="0 0 100 100" aria-hidden="true">
          <g fill="none" stroke="#45c96b" stroke-width="3.5" stroke-linecap="round">
            <path d="M9 92Q2 72 18 61T17 36Q13 25 27 13"/>
            <path d="M91 93Q98 72 82 60T84 35Q88 24 74 12"/>
            <path d="M13 75Q28 76 29 62T24 43"/>
            <path d="M87 76Q72 77 71 62T76 43"/>
            <path d="M19 43Q35 43 38 30"/>
            <path d="M81 43Q65 43 62 30"/>
          </g>
          <g fill="#a3e635" stroke="#166534" stroke-width="1">
            <path d="M15 58Q-1 52 6 39Q23 42 15 58Z"/>
            <path d="M22 33Q6 28 13 16Q30 20 22 33Z"/>
            <path d="M27 69Q42 57 44 73Q36 82 27 69Z"/>
            <path d="M85 57Q101 51 94 38Q77 41 85 57Z"/>
            <path d="M78 32Q94 27 87 15Q70 19 78 32Z"/>
            <path d="M73 69Q58 57 56 73Q64 82 73 69Z"/>
            <path d="M34 35Q22 20 38 17Q47 27 34 35Z"/>
            <path d="M66 35Q78 20 62 17Q53 27 66 35Z"/>
          </g>
        </svg>`,

      ocean: `
        <svg class="theme-logo-scene gn-logo-water" viewBox="0 0 100 100" aria-hidden="true">
          <g fill="none" stroke-linecap="round">
            <path d="M4 39Q19 24 34 39T64 39T96 39"
              stroke="#7dd3fc" stroke-width="4"/>
            <path d="M3 51Q18 36 33 51T63 51T97 51"
              stroke="#22d3ee" stroke-width="3"/>
            <path d="M7 63Q22 48 37 63T67 63T93 63"
              stroke="#5eead4" stroke-width="2.5"/>
            <path d="M13 30Q24 17 36 30T59 30T86 30"
              stroke="#bae6fd" stroke-width="2"/>
          </g>
          <g fill="none" stroke="#a5f3fc" stroke-width="1.5">
            <circle cx="16" cy="24" r="3"/>
            <circle cx="84" cy="74" r="4"/>
            <circle cx="76" cy="20" r="2"/>
          </g>
        </svg>`
    };

    $$(".brand-mark, .hero-logo, .live-preview-mark").forEach(logo => {
      $(".theme-logo-scene", logo)?.remove();

      if (!logoArt[theme]) return;

      const holder = document.createElement("div");
      holder.innerHTML = logoArt[theme].trim();
      logo.insertBefore(holder.firstElementChild, logo.firstChild);
    });
  }

  function goTo(page, updateHash = true) {
    if (!pages[page]) page = "home";

    currentPage = page;

    $$(".page").forEach(section => {
      section.classList.toggle("active", section.dataset.page === page);
    });

    $$("[data-nav]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.nav === page && button.classList.contains("nav-item")
      );
    });

    const breadcrumb = $("#page-breadcrumb");
    if (breadcrumb) breadcrumb.textContent = pages[page];

    if (updateHash && location.hash !== `#${page}`) {
      history.replaceState(null, "", `#${page}`);
    }

    window.scrollTo({
      top: 0,
      behavior: body.classList.contains("motion-off") ? "auto" : "smooth"
    });

    if (page === "history") renderHistory();
    if (page === "home") updateOverview();
  }

  $$("[data-nav]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      goTo(button.dataset.nav);
    });
  });

  window.addEventListener("hashchange", () => {
    const page = location.hash.slice(1);
    if (pages[page]) goTo(page, false);
  });

  function applyTheme(theme, persist = true) {
    if (!Object.hasOwn(themes, theme)) theme = "cosmic";

    body.dataset.theme = theme;
    installThemeArtwork(theme);

    $$("[data-set-theme]").forEach(button => {
      const selected = button.dataset.setTheme === theme;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const customName = $("#custom-theme-name");
    const customDescription = $("#custom-theme-description");

    if (customName) customName.textContent = themes[theme].name;
    if (customDescription) customDescription.textContent = themes[theme].description;

    if (persist) {
      write(PREFS_KEY, { ...read(PREFS_KEY, {}), theme });
    }

    updateOverview();
  }

  $$("[data-set-theme]").forEach(button => {
    button.addEventListener("click", () => applyTheme(button.dataset.setTheme));
  });

  function applyMotion(enabled) {
    body.classList.toggle("motion-off", !enabled);

    const motion = $("#settings-motion");
    if (motion) motion.checked = enabled;
  }

  $("#settings-motion")?.addEventListener("change", event => {
    applyMotion(event.target.checked);
  });

  function updateSummary() {
    const points = $("#total-points")?.value || "100";
    const criteria = $$(".criterion-row", $("#rubric-criteria")).length;

    const summaryPoints = $("#summary-points");
    const summaryCriteria = $("#summary-criteria");
    const summaryKey = $("#summary-key");

    if (summaryPoints) summaryPoints.textContent = points;
    if (summaryCriteria) summaryCriteria.textContent = String(criteria);

    if (summaryKey) {
      summaryKey.textContent = $("#answer-key-input")?.value.trim()
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
        Array.isArray(historyItems) ? historyItems.length : 0
      );
    }

    if (criteriaCount) {
      criteriaCount.textContent = String(
        $$(".criterion-row", $("#rubric-criteria")).length || 0
      );
    }

    const theme = themes[body.dataset.theme] || themes.cosmic;

    if (themeName) themeName.textContent = theme.short;
    if (themeCaption) themeCaption.textContent = theme.caption;
  }

  $("#total-points")?.addEventListener("input", updateSummary);
  $("#answer-key-input")?.addEventListener("input", updateSummary);

  function renumberCriteria() {
    const rows = $$(".criterion-row", $("#rubric-criteria"));

    rows.forEach((row, index) => {
      const n = index + 1;
      const name = $('input[name="criterion-name"]', row);
      const points = $('input[name="criterion-points"]', row);
      const number = $("label", row);
      const remove = $(".remove-criterion", row);

      if (name) name.id = `criterion-${n}`;
      if (points) points.id = `criterion-points-${n}`;

      if (number) {
        number.htmlFor = name.id;
        number.textContent = String(n).padStart(2, "0");
      }

      if (remove) {
        remove.disabled = rows.length <= 1;
        remove.setAttribute("aria-label", `Remove criterion ${n}`);
      }
    });

    nextCriterion = rows.length + 1;
    updateSummary();
  }

  function createCriterion(n) {
    const row = document.createElement("div");
    row.className = "criterion-row";

    const label = document.createElement("label");
    label.htmlFor = `criterion-${n}`;
    label.textContent = String(n).padStart(2, "0");

    const name = document.createElement("input");
    name.type = "text";
    name.name = "criterion-name";
    name.id = `criterion-${n}`;
    name.placeholder = "Criterion name";
    name.maxLength = 150;

    const pointsLabel = document.createElement("span");
    pointsLabel.textContent = "POINTS";

    const points = document.createElement("input");
    points.type = "number";
    points.name = "criterion-points";
    points.id = `criterion-points-${n}`;
    points.min = "0";
    points.max = "10000";
    points.value = "0";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-criterion";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove criterion ${n}`);

    remove.addEventListener("click", () => {
      row.remove();
      renumberCriteria();
    });

    row.append(label, name, pointsLabel, points, remove);
    return row;
  }

  $("#add-criterion")?.addEventListener("click", () => {
    const list = $("#rubric-criteria");
    if (!list) return;

    const row = createCriterion(nextCriterion++);
    list.appendChild(row);
    renumberCriteria();

    $('input[name="criterion-name"]', row)?.focus();
  });

  $("#rubric-criteria")?.addEventListener("input", updateSummary);

  $("#rubric-criteria")?.addEventListener("click", event => {
    if (!event.target.matches(".remove-criterion")) return;

    const row = event.target.closest(".criterion-row");
    const rows = $$(".criterion-row", $("#rubric-criteria"));

    if (row && rows.length > 1) {
      row.remove();
      renumberCriteria();
    }
  });

  function status(message, kind = "") {
    const el = $("#grading-status");
    if (!el) return;

    el.textContent = message;
    el.classList.remove("success", "error");

    if (kind) el.classList.add(kind);
  }

  function renderHistory() {
    const list = $("#history-list");
    if (!list) return;

    const items = read(HISTORY_KEY, []);
    list.replaceChildren();

    if (!Array.isArray(items) || !items.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.textContent = "◷";

      const title = document.createElement("strong");
      title.textContent = "No sessions saved yet";

      const p = document.createElement("p");
      p.textContent = "When you prepare a grading request, its session details can appear here.";

      empty.append(icon, title, p);
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
      title.textContent = item.rubricName || "Untitled grading session";

      const meta = document.createElement("small");
      const date = new Date(item.createdAt);

      meta.textContent =
        `${Number.isNaN(date.getTime()) ? "Saved session" : date.toLocaleString()} · ` +
        `${item.totalPoints} possible points · ${item.criterionCount} criteria`;

      copy.append(title, meta);
      info.append(icon, copy);

      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = "Prepared";

      row.append(info, chip);
      list.appendChild(row);
    });
  }

  $("#grading-form")?.addEventListener("submit", event => {
    event.preventDefault();

    const test = $("#test-input").value.trim();
    const answers = $("#answers-input").value.trim();
    const answerKey = $("#answer-key-input").value.trim();
    const totalPoints = Number($("#total-points").value || 100);

    const criteria = $$(".criterion-row", $("#rubric-criteria"))
      .map(row => ({
        name: $('input[name="criterion-name"]', row)?.value.trim() || "",
        points: Number($('input[name="criterion-points"]', row)?.value || 0)
      }))
      .filter(item => item.name);

    if (!test || !answers) {
      status("Please enter both the test and the student's answers.", "error");
      (!test ? $("#test-input") : $("#answers-input")).focus();
      return;
    }

    if (!Number.isFinite(totalPoints) || totalPoints <= 0) {
      status("Enter a total possible score greater than zero.", "error");
      $("#total-points").focus();
      return;
    }

    if (criteria.some(item => !Number.isFinite(item.points) || item.points < 0)) {
      status("Please check the point values in your rubric.", "error");
      return;
    }

    const criteriaPoints = criteria.reduce((sum, item) => sum + item.points, 0);

    if (criteria.length && criteriaPoints > totalPoints) {
      status(
        `Your criteria add up to ${criteriaPoints} points, more than the ${totalPoints} possible points. Adjust the rubric first.`,
        "error"
      );
      return;
    }

    // Never log student work or the answer key.
    console.info("GradeNova request prepared", {
      hasTest: true,
      hasAnswers: true,
      hasAnswerKey: Boolean(answerKey),
      criteriaCount: criteria.length
    });

    const prefs = read(PREFS_KEY, {});

    if ($("#option-history").checked && prefs.saveHistory !== false) {
      const historyItems = read(HISTORY_KEY, []);

      const entry = {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        rubricName: $("#rubric-name").value.trim() || "Untitled grading session",
        totalPoints,
        criterionCount: criteria.length,
        strictness: $("#grading-strictness").value,
        hasAnswerKey: Boolean(answerKey)
      };

      write(
        HISTORY_KEY,
        (Array.isArray(historyItems) ? [...historyItems, entry] : [entry]).slice(-50)
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
      title.textContent = "Request prepared — not graded yet";

      const p = document.createElement("p");
      p.textContent = "The front-end validated your inputs. Connect the hosted backend to receive an actual score and feedback report.";

      empty.append(icon, title, p);
      results.appendChild(empty);
    }

    updateOverview();
  });

  $("#export-history")?.addEventListener("click", () => {
    const items = read(HISTORY_KEY, []);

    const blob = new Blob(
      [JSON.stringify(Array.isArray(items) ? items : [], null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "gradenova-history.json";

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  });

  $("#clear-history")?.addEventListener("click", () => {
    if (!window.confirm("Clear saved GradeNova session history from this browser?")) {
      return;
    }

    write(HISTORY_KEY, []);
    renderHistory();
    updateOverview();
  });

  $("#save-settings")?.addEventListener("click", () => {
    const old = read(PREFS_KEY, {});

    const prefs = {
      ...old,
      theme: body.dataset.theme || "cosmic",
      motion: $("#settings-motion")?.checked ?? true,
      strictness: $("#settings-default-strictness")?.value || "balanced",
      saveHistory: $("#settings-save-history")?.checked ?? true
    };

    applyMotion(prefs.motion);

    const saved = write(PREFS_KEY, prefs);
    const msg = $("#settings-status");

    if (msg) {
      msg.textContent = saved
        ? "✓ Preferences saved on this device."
        : "Could not save preferences in this browser.";

      msg.classList.toggle("success", saved);
      msg.classList.toggle("error", !saved);
    }

    if ($("#grading-strictness")) {
      $("#grading-strictness").value = prefs.strictness;
    }
  });

  const prefs = read(PREFS_KEY, {});

  applyTheme(
    Object.hasOwn(themes, prefs.theme) ? prefs.theme : "cosmic",
    false
  );

  applyMotion(typeof prefs.motion === "boolean" ? prefs.motion : true);

  if (
    $("#settings-default-strictness") &&
    ["lenient", "balanced", "strict"].includes(prefs.strictness)
  ) {
    $("#settings-default-strictness").value = prefs.strictness;
  }

  if (
    $("#grading-strictness") &&
    ["lenient", "balanced", "strict"].includes(prefs.strictness)
  ) {
    $("#grading-strictness").value = prefs.strictness;
  }

  if ($("#settings-save-history")) {
    $("#settings-save-history").checked = prefs.saveHistory !== false;
  }

  renumberCriteria();
  renderHistory();
  updateOverview();

  const requestedPage = location.hash.slice(1);
  goTo(pages[requestedPage] ? requestedPage : "home", false);
})();
