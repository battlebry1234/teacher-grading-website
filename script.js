(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const KEYS = {
    prefs: "gradenova-prefs-v1",
    history: "gradenova-history-v1",
    rubric: "gradenova-rubric-v1",
    wallpaper: "gradenova-wallpaper-v1"
  };

  const themes = ["cosmic", "ocean", "forest", "inferno", "aurora", "cyberpunk", "matrix", "light"];
  const themeNames = {
    cosmic: "Cosmic", ocean: "Ocean", forest: "Forest", inferno: "Inferno",
    aurora: "Aurora", cyberpunk: "Cyberpunk", matrix: "Matrix", light: "Light"
  };

  const defaults = {
    theme: "cosmic", accent: "#8b7bff", background: "",
    overlay: 45, brightness: 100, animation: 60, blur: 18,
    strictness: "balanced", points: 100,
    feedback: true, breakdown: true, motion: true
  };

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

  let prefs = { ...defaults, ...read(KEYS.prefs, {}) };
  let records = read(KEYS.history, []);
  let rubric = read(KEYS.rubric, {
    name: "General assessment rubric",
    instructions: "",
    criteria: [
      { name: "Accuracy", points: 40 },
      { name: "Reasoning", points: 35 },
      { name: "Clarity", points: 25 }
    ]
  });

  if (!Array.isArray(records)) records = [];

  let audioContext = null;
  let masterGain = null;
  let musicTimer = null;
  let musicPlaying = false;

  const tracks = [
    ["Quiet Constellations", [261.63,329.63,392,523.25,392,329.63,293.66,349.23], "sine"],
    ["Velvet Morning", [293.66,369.99,440,587.33,440,369.99,329.63,392], "sine"],
    ["Silver Rain", [349.23,440,523.25,659.25,523.25,440,392,493.88], "triangle"],
    ["Stillwater", [220,261.63,329.63,392,329.63,261.63,246.94,293.66], "sine"],
    ["Moonlit Keys", [261.63,311.13,392,466.16,392,311.13,293.66,349.23], "triangle"],
    ["Gentle Orbit", [246.94,293.66,369.99,440,369.99,293.66,277.18,329.63], "sine"],
    ["Winter Window", [329.63,392,493.88,587.33,493.88,392,349.23,440], "sine"],
    ["Soft Horizon", [196,246.94,293.66,392,293.66,246.94,220,261.63], "triangle"],
    ["Glass Garden", [293.66,349.23,440,523.25,440,349.23,329.63,392], "sine"],
    ["Last Light", [261.63,329.63,392,493.88,392,329.63,293.66,349.23], "sine"]
  ];

  function hexToRgb(hex) {
    const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    return match
      ? `${parseInt(match[1],16)},${parseInt(match[2],16)},${parseInt(match[3],16)}`
      : "139,123,255";
  }

  function applyPreferences() {
    document.body.dataset.theme = themes.includes(prefs.theme) ? prefs.theme : "cosmic";

    document.documentElement.style.setProperty("--accent", prefs.accent);
    document.documentElement.style.setProperty("--accent-rgb", hexToRgb(prefs.accent));
    document.documentElement.style.setProperty("--overlay", Number(prefs.overlay) / 100);
    document.documentElement.style.setProperty("--brightness", Number(prefs.brightness) / 100);
    document.documentElement.style.setProperty("--blur", `${prefs.blur}px`);

    if (prefs.background) {
      document.documentElement.style.setProperty("--bg", prefs.background);
    } else {
      document.documentElement.style.removeProperty("--bg");
    }

    document.body.classList.toggle("reduce-motion", !prefs.motion || Number(prefs.animation) === 0);

    $$("[data-set-theme]").forEach(button => {
      button.classList.toggle("selected", button.dataset.setTheme === prefs.theme);
    });

    $("#stat-theme").textContent = themeNames[prefs.theme] || "Cosmic";

    $("#background-color").value = prefs.background || "#080b19";
    $("#background-color-label").textContent = (prefs.background || "#080b19").toUpperCase();

    $("#accent-color").value = prefs.accent;
    $("#accent-color-label").textContent = prefs.accent.toUpperCase();

    const ranges = [
      ["overlay-strength", "overlay", "overlay-output", "%"],
      ["brightness", "brightness", "brightness-output", "%"],
      ["animation-intensity", "animation", "animation-output", "%"],
      ["panel-blur", "blur", "blur-output", "px"]
    ];

    ranges.forEach(([id, key, output, unit]) => {
      $("#" + id).value = prefs[key];
      $("#" + output).textContent = prefs[key] + unit;
    });

    $("#settings-default-strictness").value = prefs.strictness;
    $("#settings-default-points").value = prefs.points;
    $("#settings-feedback").checked = prefs.feedback;
    $("#settings-breakdown").checked = prefs.breakdown;
    $("#settings-motion").checked = prefs.motion;
  }

  function openTab(tab) {
    const validTabs = ["home", "grading", "rubric", "results", "history", "customization", "settings"];
    if (!validTabs.includes(tab)) tab = "home";

    $$("[data-panel]").forEach(panel => {
      panel.hidden = panel.dataset.panel !== tab;
    });

    $$("[data-tab]").forEach(link => {
      link.classList.toggle("active", link.dataset.tab === tab);
    });

    if (location.hash !== "#" + tab) {
      window.history.replaceState(null, "", "#" + tab);
    }

    if (["home", "history", "results"].includes(tab)) renderHistory();
    if (tab === "rubric") renderRubric();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-tab]");
    const destination = event.target.closest("[data-go]");

    if (nav) {
      event.preventDefault();
      openTab(nav.dataset.tab);
    } else if (destination) {
      event.preventDefault();
      openTab(destination.dataset.go);
    }
  });

  window.addEventListener("hashchange", () => openTab(location.hash.slice(1)));
  $$("[data-set-theme]").forEach(button => {
    button.addEventListener("click", () => {
      prefs.theme = button.dataset.setTheme;
      applyPreferences();
      write(KEYS.prefs, prefs);
    });
  });

  $("#background-color").addEventListener("input", event => {
    prefs.background = event.target.value;
    document.documentElement.style.setProperty("--bg", prefs.background);
    $("#background-color-label").textContent = prefs.background.toUpperCase();
  });

  $("#clear-background").addEventListener("click", () => {
    prefs.background = "";
    document.documentElement.style.removeProperty("--bg");
    $("#background-color-label").textContent = "#080B19";
    write(KEYS.prefs, prefs);
  });

  $("#accent-color").addEventListener("input", event => {
    prefs.accent = event.target.value;
    document.documentElement.style.setProperty("--accent", prefs.accent);
    document.documentElement.style.setProperty("--accent-rgb", hexToRgb(prefs.accent));
    $("#accent-color-label").textContent = prefs.accent.toUpperCase();
  });

  [
    ["overlay-strength", "overlay", "overlay-output", "%"],
    ["brightness", "brightness", "brightness-output", "%"],
    ["animation-intensity", "animation", "animation-output", "%"],
    ["panel-blur", "blur", "blur-output", "px"]
  ].forEach(([id, key, output, unit]) => {
    $("#" + id).addEventListener("input", event => {
      prefs[key] = Number(event.target.value);
      $("#" + output).textContent = prefs[key] + unit;
      applyPreferences();
    });
  });

  $("#wallpaper-upload").addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      $("#custom-status").textContent = "Please choose an image file.";
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      $("#custom-status").textContent = "Please choose an image smaller than 6 MB.";
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const imageData = String(reader.result);
      document.documentElement.style.setProperty("--wallpaper", `url("${imageData}")`);

      try {
        localStorage.setItem(KEYS.wallpaper, imageData);
        $("#custom-status").textContent = "Wallpaper applied. Save appearance to keep your settings.";
      } catch {
        $("#custom-status").textContent = "Preview applied, but browser storage is full.";
      }
    };

    reader.readAsDataURL(file);
  });

  $("#save-customization").addEventListener("click", () => {
    $("#custom-status").textContent = write(KEYS.prefs, prefs)
      ? "Appearance saved on this device."
      : "Browser storage is full; settings may not persist.";
  });

  $("#reset-customization").addEventListener("click", () => {
    prefs = {
      ...prefs, theme: "cosmic", accent: defaults.accent, background: "",
      overlay: 45, brightness: 100, animation: 60, blur: 18
    };

    try { localStorage.removeItem(KEYS.wallpaper); } catch {}
    document.documentElement.style.removeProperty("--wallpaper");
    applyPreferences();
    write(KEYS.prefs, prefs);
    $("#wallpaper-upload").value = "";
    $("#custom-status").textContent = "Appearance reset.";
  });

  function addCriterion(name = "", points = 10) {
    const row = document.createElement("div");
    row.className = "criterion-row";

    const nameInput = document.createElement("input");
    nameInput.placeholder = "Criterion name";
    nameInput.value = name;
    nameInput.setAttribute("aria-label", "Criterion name");

    const pointsInput = document.createElement("input");
    pointsInput.type = "number";
    pointsInput.min = "1";
    pointsInput.value = points;
    pointsInput.setAttribute("aria-label", "Criterion points");

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-criterion";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "Remove criterion");

    row.append(nameInput, pointsInput, removeButton);
    $("#rubric-criteria").append(row);

    nameInput.addEventListener("input", updateRubricTotal);
    pointsInput.addEventListener("input", updateRubricTotal);
    removeButton.addEventListener("click", () => {
      row.remove();
      updateRubricTotal();
    });
  }

  function updateRubricTotal() {
    const total = $$(".criterion-row").reduce((sum, row) => {
      return sum + Math.max(0, Number($('input[type="number"]', row).value) || 0);
    }, 0);
    $("#rubric-total").textContent = total;
  }

  function renderRubric() {
    $("#rubric-name").value = rubric.name || "General assessment rubric";
    $("#rubric-instructions").value = rubric.instructions || "";
    $("#rubric-criteria").innerHTML = "";
    (rubric.criteria || []).forEach(item => addCriterion(item.name, item.points));
    updateRubricTotal();
  }

  $("#add-criterion").addEventListener("click", () => addCriterion());

  $("#save-rubric").addEventListener("click", () => {
    const criteria = $$(".criterion-row").map(row => ({
      name: $('input:not([type="number"])', row).value.trim(),
      points: Math.max(1, Number($('input[type="number"]', row).value) || 1)
    })).filter(item => item.name);

    if (!criteria.length) {
      $("#rubric-status").textContent = "Add at least one named criterion.";
      return;
    }

    rubric = {
      name: $("#rubric-name").value.trim() || "Untitled rubric",
      instructions: $("#rubric-instructions").value.trim(),
      criteria
    };

    $("#rubric-status").textContent = write(KEYS.rubric, rubric)
      ? "Rubric saved on this device."
      : "Could not save rubric.";

    $("#stat-rubric").textContent = rubric.name;
    $("#analytics-rubric").textContent = rubric.name;
  });

  function renderHistory() {
    $("#stat-count").textContent = records.length;
    $("#history-count").textContent = `${records.length} session${records.length === 1 ? "" : "s"}`;
    $("#analytics-count").textContent = records.length;
    $("#stat-rubric").textContent = rubric.name || "Default";
    $("#analytics-rubric").textContent = rubric.name || "Default";
    $("#analytics-recent").textContent = records[0]?.title || "—";

    const historyList = $("#history-list");
    historyList.innerHTML = "";

    if (!records.length) {
      historyList.innerHTML = '<div class="empty-state">Nothing here yet. Your saved session summaries will appear here.</div>';
    }

    records.forEach(record => {
      const item = document.createElement("article");
      item.className = "history-item";

      const details = document.createElement("div");
      const title = document.createElement("strong");
      const date = document.createElement("small");
      const badge = document.createElement("span");

      title.textContent = record.title;
      date.textContent = `${record.date} · ${record.points} possible points · ${record.strictness} approach`;
      badge.className = "history-badge";
      badge.textContent = "Prepared · not graded";

      details.append(title, date);
      item.append(details, badge);
      historyList.append(item);
    });

    const results = $("#results-content");
    results.innerHTML = "";

    if (!records.length) {
      results.className = "empty-state";
      results.textContent = "No sessions yet. Prepare your first grading request to see activity here.";
    } else {
      results.className = "history-list";

      records.slice(0, 5).forEach(record => {
        const item = document.createElement("article");
        item.className = "history-item";

        const details = document.createElement("div");
        const title = document.createElement("strong");
        const date = document.createElement("small");

        title.textContent = record.title;
        date.textContent = record.date;
        details.append(title, date);
        item.append(details);
        results.append(item);
      });
    }
  }

  $("#grading-form").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#test-title").value.trim();
    const prompt = $("#test-input").value.trim();
    const answers = $("#answers-input").value.trim();

    if (!title || !prompt || !answers) return;

    const record = {
      id: Date.now(),
      title,
      date: new Date().toLocaleString(),
      points: Math.max(1, Number($("#total-points").value) || 100),
      strictness: $("#grading-strictness").value,
      rubric: rubric.name
    };

    if ($("#option-history").checked) {
      records.unshift(record);
      records = records.slice(0, 100);
      write(KEYS.history, records);
    }

    const status = $("#grading-status");
    status.hidden = false;
    status.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "Request prepared — not graded yet";

    const summary = document.createElement("p");
    summary.textContent = `"${title}" is ready for an AI grading backend. ${record.points} points possible; ${record.strictness} grading; rubric: ${record.rubric}.`;

    const note = document.createElement("p");
    note.textContent = "No grade was generated. A secure backend/API connection is needed to evaluate answers. Keep student data private until it is configured.";

    status.append(heading, summary, note);
    renderHistory();
  });

  $("#clear-history").addEventListener("click", () => {
    if (!confirm("Clear all locally saved grading session summaries?")) return;
    records = [];
    write(KEYS.history, records);
    renderHistory();
  });

  $("#export-history").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gradenova-history.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  $("#save-settings").addEventListener("click", () => {
    prefs.strictness = $("#settings-default-strictness").value;
    prefs.points = Math.max(1, Number($("#settings-default-points").value) || 100);
    prefs.feedback = $("#settings-feedback").checked;
    prefs.breakdown = $("#settings-breakdown").checked;
    prefs.motion = $("#settings-motion").checked;

    applyPreferences();
    $("#settings-status").textContent = write(KEYS.prefs, prefs)
      ? "Settings saved on this device."
      : "Could not save settings.";
  });

  $("#reset-settings").addEventListener("click", () => {
    prefs = { ...prefs, ...defaults };
    applyPreferences();
    write(KEYS.prefs, prefs);
    $("#settings-status").textContent = "Settings reset to defaults.";
  });

  // Browser-generated ambient tones. These are synthesized, not recordings.
  function initializeAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      $("#custom-status").textContent = "This browser does not support generated audio.";
      return false;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = Number($("#music-volume").value) / 100 * 0.18;
      masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") audioContext.resume();
    return true;
  }

  function playTone(frequency, start, duration, waveform) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function playPhrase() {
    if (!musicPlaying || !audioContext) return;

    const track = tracks[Number($("#music-track").value) || 0];
    const start = audioContext.currentTime + 0.08;

    track[1].forEach((frequency, index) => {
      playTone(frequency, start + index * 1.15, 1.6, track[2]);
      if (index % 2 === 0) {
        playTone(frequency / 2, start + index * 1.15, 1.8, "sine");
      }
    });

    musicTimer = setTimeout(playPhrase, track[1].length * 1150);
  }

  function stopMusic() {
    musicPlaying = false;
    clearTimeout(musicTimer);

    if (masterGain && audioContext) {
      masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
    }

    $("#music-toggle").textContent = "▶";
    $("#music-toggle").setAttribute("aria-label", "Play music");
    $("#equalizer").classList.remove("playing");
  }

  function startMusic() {
    if (!initializeAudio()) return;

    musicPlaying = true;
    $("#music-toggle").textContent = "Ⅱ";
    $("#music-toggle").setAttribute("aria-label", "Pause music");
    $("#equalizer").classList.add("playing");

    masterGain.gain.setTargetAtTime(
      Number($("#music-volume").value) / 100 * 0.18,
      audioContext.currentTime,
      0.08
    );

    playPhrase();
  }

  function updateTrackTitle() {
    $("#track-title").textContent = tracks[Number($("#music-track").value) || 0][0];
  }

  $("#music-track").addEventListener("change", () => {
    updateTrackTitle();
    if (musicPlaying) {
      stopMusic();
      startMusic();
    }
  });

  $("#music-toggle").addEventListener("click", () => {
    musicPlaying ? stopMusic() : startMusic();
  });

  $("#music-volume").addEventListener("input", event => {
    $("#volume-output").textContent = event.target.value + "%";

    if (masterGain && audioContext) {
      masterGain.gain.setTargetAtTime(
        Number(event.target.value) / 100 * 0.18,
        audioContext.currentTime,
        0.05
      );
    }
  });

  applyPreferences();

  try {
    const wallpaper = localStorage.getItem(KEYS.wallpaper);
    if (wallpaper) {
      document.documentElement.style.setProperty("--wallpaper", `url("${wallpaper}")`);
    }
  } catch {}

  renderRubric();
  renderHistory();
  updateTrackTitle();

  $("#grading-strictness").value = prefs.strictness;
  $("#total-points").value = prefs.points;
  $("#option-feedback").checked = prefs.feedback;
  $("#option-breakdown").checked = prefs.breakdown;

  openTab(location.hash.slice(1) || "home");
})();
