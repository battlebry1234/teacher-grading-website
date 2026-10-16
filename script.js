
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const body = document.body;
  const STORAGE_KEY = "gradenova-appearance-v1";

  const defaults = {
    theme: "dark",
    mode: "gradient",
    solid: "#10101C",
    color1: "#6D28D9",
    color2: "#0B102B",
    direction: 135,
    overlay: "#080813",
    opacity: 55,
    photoFit: "cover",
    photoPosition: "center",
    blur: 0,
    photo: ""
  };

  let settings = { ...defaults };
  let currentPhotoUrl = null;
  let grading = false;
  let modelEngine = null;

  function validHex(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value);
  }

  function hexToRgb(hex) {
    const safe = validHex(hex) ? hex : "#080813";
    return [
      parseInt(safe.slice(1, 3), 16),
      parseInt(safe.slice(3, 5), 16),
      parseInt(safe.slice(5, 7), 16)
    ].join(", ");
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      // Settings still work for this session if browser storage is unavailable.
    }
  }

  function readSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      settings = { ...defaults, ...stored };

      if (!["dark", "light", "ocean", "forest"].includes(settings.theme)) {
        settings.theme = defaults.theme;
      }
      if (!["solid", "gradient", "photo"].includes(settings.mode)) {
        settings.mode = defaults.mode;
      }
      if (!validHex(settings.solid)) settings.solid = defaults.solid;
      if (!validHex(settings.color1)) settings.color1 = defaults.color1;
      if (!validHex(settings.color2)) settings.color2 = defaults.color2;
      if (!validHex(settings.overlay)) settings.overlay = defaults.overlay;
      if (!Number.isFinite(Number(settings.direction))) settings.direction = 135;
      if (!Number.isFinite(Number(settings.opacity))) settings.opacity = 55;
      if (!Number.isFinite(Number(settings.blur))) settings.blur = 0;
      if (!["cover", "contain"].includes(settings.photoFit)) settings.photoFit = "cover";
      if (!["center", "top", "bottom", "left", "right"].includes(settings.photoPosition)) {
        settings.photoPosition = "center";
      }
      if (typeof settings.photo !== "string" || !settings.photo.startsWith("data:image/")) {
        settings.photo = "";
      }
    } catch (error) {
      settings = { ...defaults };
    }
  }

  function backgroundValue() {
    if (settings.mode === "solid") return settings.solid;
    if (settings.mode === "gradient") {
      return `linear-gradient(${Number(settings.direction)}deg, ${settings.color1}, ${settings.color2})`;
    }
    return settings.solid;
  }

  function applyAppearance() {
    body.dataset.theme = settings.theme;
    root.style.setProperty("--page-background", backgroundValue());
    root.style.setProperty("--overlay-color", hexToRgb(settings.overlay));
    root.style.setProperty("--overlay-opacity", String(Number(settings.opacity) / 100));
    root.style.setProperty("--photo-fit", settings.photoFit);
    root.style.setProperty("--photo-position", settings.photoPosition);
    root.style.setProperty("--photo-blur", `${Number(settings.blur)}px`);

    if (settings.mode === "photo" && settings.photo) {
      root.style.setProperty("--page-image", `url("${settings.photo}")`);
    } else {
      root.style.setProperty("--page-image", "none");
    }

    $("solidColor").value = settings.solid;
    $("solidHex").value = settings.solid.toUpperCase();
    $("gradientColor1").value = settings.color1;
    $("gradientHex1").value = settings.color1.toUpperCase();
    $("gradientColor2").value = settings.color2;
    $("gradientHex2").value = settings.color2.toUpperCase();
    $("gradientDirection").value = settings.direction;
    $("directionValue").textContent = `${settings.direction}°`;
    $("overlayColor").value = settings.overlay;
    $("overlayOpacity").value = settings.opacity;
    $("overlayValue").textContent = `${settings.opacity}%`;
    $("photoFit").value = settings.photoFit;
    $("photoPosition").value = settings.photoPosition;
    $("photoBlur").value = settings.blur;
    $("blurValue").textContent = `${settings.blur} px`;

    document.querySelectorAll("[data-theme]").forEach((button) => {
      if (button.classList.contains("theme-choice")) {
        button.classList.toggle("selected", button.dataset.theme === settings.theme);
      }
    });
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === settings.mode);
    });

    $("solidControls").hidden = settings.mode !== "solid";
    $("gradientControls").hidden = settings.mode !== "gradient";
    $("photoControls").hidden = settings.mode !== "photo";

    $("backgroundPreview").style.background = backgroundValue();
    saveSettings();
  }

  function setValue(key, value) {
    settings[key] = value;
    applyAppearance();
  }

  function bindColorPicker(pickerId, hexId, settingKey) {
    $(pickerId).addEventListener("input", (event) => {
      const value = event.target.value.toUpperCase();
      settings[settingKey] = value;
      $(hexId).value = value;
      applyAppearance();
    });

    $(hexId).addEventListener("change", (event) => {
      const value = event.target.value.trim();
      if (!validHex(value)) {
        event.target.value = settings[settingKey];
        return;
      }
      settings[settingKey] = value.toUpperCase();
      applyAppearance();
    });
  }

  bindColorPicker("solidColor", "solidHex", "solid");
  bindColorPicker("gradientColor1", "gradientHex1", "color1");
  bindColorPicker("gradientColor2", "gradientHex2", "color2");

  $("overlayColor").addEventListener("input", (event) => {
    setValue("overlay", event.target.value.toUpperCase());
  });
  $("overlayOpacity").addEventListener("input", (event) => {
    setValue("opacity", Number(event.target.value));
  });
  $("gradientDirection").addEventListener("input", (event) => {
    setValue("direction", Number(event.target.value));
  });
  $("photoFit").addEventListener("change", (event) => {
    setValue("photoFit", event.target.value);
  });
  $("photoPosition").addEventListener("change", (event) => {
    setValue("photoPosition", event.target.value);
  });
  $("photoBlur").addEventListener("input", (event) => {
    setValue("blur", Number(event.target.value));
  });

  document.querySelectorAll(".theme-choice").forEach((button) => {
    button.addEventListener("click", () => setValue("theme", button.dataset.theme));
  });
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => setValue("mode", button.dataset.mode));
  });

  const presets = {
    purple: { mode: "gradient", theme: "dark", color1: "#7C3AED", color2: "#160D35", direction: 135, overlay: "#080813", opacity: 38 },
    midnight: { mode: "gradient", theme: "dark", color1: "#020617", color2: "#1D4ED8", direction: 135, overlay: "#020617", opacity: 55 },
    sunset: { mode: "gradient", theme: "dark", color1: "#F97316", color2: "#6D28D9", direction: 135, overlay: "#190D24", opacity: 55 },
    ocean: { mode: "gradient", theme: "ocean", color1: "#06B6D4", color2: "#082F49", direction: 140, overlay: "#02131E", opacity: 58 },
    forest: { mode: "gradient", theme: "forest", color1: "#166534", color2: "#052E24", direction: 135, overlay: "#04140D", opacity: 55 },
    rose: { mode: "gradient", theme: "dark", color1: "#FDA4AF", color2: "#831843", direction: 135, overlay: "#240B1B", opacity: 56 }
  };

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = presets[button.dataset.preset];
      if (!preset) return;
      settings = { ...settings, ...preset };
      applyAppearance();
    });
  });

  function openSettings() {
    $("settingsBackdrop").hidden = false;
    body.style.overflow = "hidden";
  }

  function closeSettings() {
    $("settingsBackdrop").hidden = true;
    body.style.overflow = "";
  }

  $("settingsNav").addEventListener("click", openSettings);
  $("topSettings").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", closeSettings);
  $("doneSettings").addEventListener("click", closeSettings);

  $("settingsBackdrop").addEventListener("click", (event) => {
    if (event.target === $("settingsBackdrop")) closeSettings();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("settingsBackdrop").hidden) closeSettings();
  });

  $("homeNav").addEventListener("click", () => {
    $("gradingWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("jumpToTest").addEventListener("click", () => {
    $("gradingWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
    $("testInput").focus({ preventScroll: true });
  });

  $("resetSettings").addEventListener("click", () => {
    settings = { ...defaults };
    $("backgroundUpload").value = "";
    if (currentPhotoUrl) {
      URL.revokeObjectURL(currentPhotoUrl);
      currentPhotoUrl = null;
    }
    applyAppearance();
  });

  $("backgroundUpload").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    // Store modest-sized images as data URLs so the preference can survive refreshes.
    // For very large photos, use a temporary object URL for this session instead.
    if (currentPhotoUrl) {
      URL.revokeObjectURL(currentPhotoUrl);
      currentPhotoUrl = null;
    }

    if (file.size <= 1400000) {
      const reader = new FileReader();
      reader.onload = () => {
        settings.photo = String(reader.result);
        settings.mode = "photo";
        applyAppearance();
      };
      reader.onerror = () => alert("That image could not be read. Please try another one.");
      reader.readAsDataURL(file);
    } else {
      currentPhotoUrl = URL.createObjectURL(file);
      settings.photo = currentPhotoUrl;
      settings.mode = "photo";
      applyAppearance();

      // Do not save a temporary URL, because it will not work after a refresh.
      try {
        const saved = { ...settings, photo: "" };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch (error) {}
    }
  });

  $("testInput").addEventListener("input", () => {
    $("testCount").textContent = `${$("testInput").value.length.toLocaleString()} characters`;
  });
  $("answersInput").addEventListener("input", () => {
    $("answerCount").textContent = `${$("answersInput").value.length.toLocaleString()} characters`;
  });

  function setProgress(percent, message) {
    $("progressArea").hidden = false;
    $("progressFill").style.width = `${percent}%`;
    $("progressPercent").textContent = `${percent}%`;
    $("progressLabel").textContent = message;
  }

  function showError(message) {
    $("errorMessage").textContent = message;
    $("errorMessage").hidden = false;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  // Render plain AI text safely; do not execute HTML returned by the model.
  function renderReport(text) {
    const container = $("reportContent");
    container.replaceChildren();

    String(text).split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (/^#{1,3}\s/.test(trimmed)) {
        const heading = document.createElement("h3");
        heading.textContent = trimmed.replace(/^#{1,3}\s*/, "");
        container.appendChild(heading);
      } else if (/^[-*]\s/.test(trimmed)) {
        const list = document.createElement("ul");
        const item = document.createElement("li");
        item.textContent = trimmed.replace(/^[-*]\s*/, "");
        list.appendChild(item);
        container.appendChild(list);
      } else {
        const paragraph = document.createElement("p");
        paragraph.textContent = trimmed.replace(/^\d+[.)]\s*/, "");
        container.appendChild(paragraph);
      }
    });
  }

  function extractScore(text) {
    const patterns = [
      /(?:estimated\s+)?score\s*[:=-]\s*(\d{1,3}(?:\.\d+)?)\s*%/i,
      /(\d{1,3}(?:\.\d+)?)\s*%\s*(?:overall|correct|score|grade)/i,
      /grade\s*[:=-]\s*(\d{1,3}(?:\.\d+)?)\s*%/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const number = Number(match[1]);
        if (number >= 0 && number <= 100) return number;
      }
    }
    return null;
  }

  async function loadEngine() {
    if (modelEngine) return modelEngine;

    if (!navigator.gpu) {
      throw new Error(
        "This browser does not appear to support WebGPU, which this local AI model needs. Try an up-to-date version of Microsoft Edge or Chrome on a compatible computer. If WebGPU is unavailable, this local AI grading mode cannot run here."
      );
    }

    setProgress(5, "Loading the AI runtime…");

    let webllm;
    try {
      webllm = await import("https://esm.run/@mlc-ai/web-llm@0.2.85");
    } catch (error) {
      throw new Error(
        "The AI runtime could not load. Check your internet connection and open GradeNova through an HTTPS website, such as GitHub Pages. Opening index.html directly from your computer may block the AI module."
      );
    }

    setProgress(10, "Downloading or preparing the AI model…");

    const modelId = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
    modelEngine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        const raw = Number(report && report.progress);
        const percent = Number.isFinite(raw)
          ? Math.max(10, Math.min(65, Math.round(10 + raw * 55)))
          : 15;
        setProgress(percent, report && report.text ? report.text : "Preparing the AI model…");
      }
    });

    return modelEngine;
  }

  async function gradeTest() {
    if (grading) return;

    const test = $("testInput").value.trim();
    const answers = $("answersInput").value.trim();

    $("errorMessage").hidden = true;

    if (!test || !answers) {
      showError("Please paste both the complete test and the student's answers before grading.");
      return;
    }

    grading = true;
    $("gradeButton").disabled = true;
    $("gradeButton").textContent = "Preparing AI grading…";
    $("reportPanel").hidden = true;

    try {
      const engine = await loadEngine();
      setProgress(72, "Reading the test and evaluating the answers…");

      const style = $("gradingStyle").value;
      const level = $("gradeLevel").value;
      const feedback = $("showFeedback").checked;
      const answerKey = $("showAnswerKey").checked;

      const prompt = `
You are a careful educational grading assistant. Independently solve the questions in the supplied test, then compare the student's answers to your solutions. No teacher answer key is supplied, so derive reasonable answers yourself. Do not pretend uncertain facts are certain.

Grading style: ${style}
Student's grade level: ${level}
Include explanations and improvement tips: ${feedback ? "yes" : "no"}
Include suggested correct answers: ${answerKey ? "yes" : "no"}

Instructions:
- Identify the questions and answer them independently before judging the student.
- Use the test's stated point values if available. If no point values exist, give questions reasonable, consistent weights and state that you assigned them.
- Award partial credit when justified. If strict grading was selected, be stricter about missing required details.
- For essays or open-ended questions, evaluate accuracy, relevance, reasoning, and completeness rather than requiring identical wording.
- Do not invent questions or student responses. If the test and answers cannot be matched reliably, say so.
- Show the estimated total score as "Estimated score: NN%".
- Clearly label uncertain judgments and any assumptions.
- Provide a per-question breakdown, points earned and possible where practical, explanations, and suggested correct answers when requested.
- Be constructive and respectful.
- Do not claim the grade is official or guaranteed.
- Return a readable report in plain text with headings. Do not return HTML.

TEST:
${test}

STUDENT ANSWERS:
${answers}
`;

      const response = await engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an accurate, fair, transparent grading assistant. Solve the test independently, compare the student answers, and explain uncertainty. Never fabricate an official answer key."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2200
      });

      const report = response.choices?.[0]?.message?.content?.trim();
      if (!report) throw new Error("The AI returned an empty report. Please try again.");

      setProgress(95, "Preparing your report…");
      renderReport(report);

      const score = extractScore(report);
      $("scoreValue").textContent = score === null ? "—" : String(score);
      $("scoreSummary").textContent = score === null
        ? "Review the per-question results below. A percentage could not be identified confidently."
        : "Estimated result based on the supplied test and answers. Please review the question-by-question reasoning.";

      $("reportPanel").hidden = false;
      setProgress(100, "Grading report complete.");
      $("reportPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showError(error && error.message
        ? error.message
        : "Something went wrong while grading. Check your browser, connection, and available memory, then try again.");
    } finally {
      grading = false;
      $("gradeButton").disabled = false;
      $("gradeButton").innerHTML = "✦ Grade this test <span>→</span>";
    }
  }

  $("gradeButton").addEventListener("click", gradeTest);

  $("copyReport").addEventListener("click", async () => {
    const reportText = [
      "GradeNova — AI Grading Report",
      `Estimated score: ${$("scoreValue").textContent}${$("scoreValue").textContent === "—" ? "" : "%"}`,
      $("scoreSummary").textContent,
      "",
      $("reportContent").innerText
    ].join("\n");

    try {
      await navigator.clipboard.writeText(reportText);
      $("copyReport").textContent = "Copied ✓";
      setTimeout(() => { $("copyReport").textContent = "Copy report"; }, 1800);
    } catch (error) {
      const temporary = document.createElement("textarea");
      temporary.value = reportText;
      document.body.appendChild(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      $("copyReport").textContent = copied ? "Copied ✓" : "Select and copy manually";
      setTimeout(() => { $("copyReport").textContent = "Copy report"; }, 2200);
    }
  });

  readSettings();
  applyAppearance();
})();
