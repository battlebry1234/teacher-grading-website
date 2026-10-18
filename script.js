'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const PREFS_KEY = 'gradenova-preferences-v3';
  const HISTORY_KEY = 'gradenova-history-v3';
  const RUBRIC_KEY = 'gradenova-rubric-v3';
  const CUSTOM_KEY = 'gradenova-customizer-v1';
  const AUDIO_KEY = 'gradenova-audio-v1';

  const THEMES = {
    cosmic: {
      name: 'Cosmic',
      description: 'A cinematic deep-space atmosphere.'
    },
    ocean: {
      name: 'Ocean',
      description: 'A calm underwater world with cool blue light.'
    },
    forest: {
      name: 'Forest',
      description: 'A peaceful green atmosphere with moonlit mist.'
    },
    inferno: {
      name: 'Inferno',
      description: 'A dramatic atmosphere of glowing embers.'
    },
    matrix: {
      name: 'Matrix',
      description: 'A digital world with animated green code.'
    },
    cyberpunk: {
      name: 'Cyberpunk',
      description: 'A neon city with futuristic colors.'
    },
    aurora: {
      name: 'Aurora',
      description: 'A glowing northern-lights atmosphere.'
    },
    light: {
      name: 'Light',
      description: 'A bright, clean workspace.'
    }
  };

  const THEME_COLORS = {
    cosmic: '#05091b',
    ocean: '#031421',
    forest: '#03130d',
    inferno: '#170603',
    matrix: '#010805',
    cyberpunk: '#10051d',
    aurora: '#041327',
    light: '#eaf1ff'
  };

  const VALID_TABS = new Set([
    'home', 'grading', 'rubric', 'results',
    'history', 'customization', 'settings'
  ]);

  const DEFAULT_RUBRIC = {
    name: 'My Grading Rubric',
    instructions: '',
    criteria: [
      { name: 'Accuracy', points: 50 },
      { name: 'Reasoning and explanation', points: 30 },
      { name: 'Completeness', points: 20 }
    ]
  };

  function safeRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('GradeNova could not read saved data:', error);
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('GradeNova could not save data:', error);
      return false;
    }
  }

  function setStatus(id, message, type = '') {
    const node = $('#' + id);
    if (!node) return;

    node.textContent = message;
    node.classList.remove('success', 'error');

    if (type) node.classList.add(type);
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function openTab(tabName, updateAddress = true) {
    if (!VALID_TABS.has(tabName)) tabName = 'home';

    document.body.dataset.activeTab = tabName;

    $$('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tabName;
    });

    $$('.main-nav a[href^="#"]').forEach((link) => {
      const selected = link.getAttribute('href') === '#' + tabName;

      link.classList.toggle('active', selected);

      if (selected) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    if (updateAddress && location.hash !== '#' + tabName) {
      history.replaceState(null, '', '#' + tabName);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const tabName = link.getAttribute('href').slice(1);
    if (!VALID_TABS.has(tabName)) return;

    event.preventDefault();
    openTab(tabName);
  });

  window.addEventListener('hashchange', () => {
    openTab(location.hash.slice(1), false);
  });

  /* =====================================================
     THEMES AND PREFERENCES
  ===================================================== */

  function getPrefs() {
    const prefs = safeRead(PREFS_KEY, {});
    return prefs && typeof prefs === 'object' ? prefs : {};
  }

  function savePref(name, value) {
    safeWrite(PREFS_KEY, { ...getPrefs(), [name]: value });
  }

  function updateThemeButtons(theme) {
    $$('[data-set-theme]').forEach((button) => {
      const selected = button.dataset.setTheme === theme;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function applyTheme(theme, persist = true) {
    if (!Object.hasOwn(THEMES, theme)) theme = 'cosmic';

    document.body.dataset.theme = theme;

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLORS[theme];

    const settingsTheme = $('#settings-theme');
    if (settingsTheme) settingsTheme.value = theme;

    const customTheme = $('#customize-theme');
    if (customTheme) customTheme.value = theme;

    const name = $('#current-theme-name');
    const description = $('#current-theme-description');

    if (name) name.textContent = THEMES[theme].name;
    if (description) description.textContent = THEMES[theme].description;

    updateThemeButtons(theme);

    if (persist) savePref('theme', theme);
  }

  function applyAccent(color, persist = true) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#39d7ff';

    document.body.style.setProperty('--accent', color);

    const picker = $('#accent-color');
    if (picker) picker.value = color;

    if (persist) savePref('accent', color);
  }

  function applyMotion(enabled, persist = false) {
    document.body.classList.toggle('motion-off', !enabled);

    const checkbox = $('#settings-motion');
    if (checkbox) checkbox.checked = enabled;

    const particles = $('#ambient-particles');
    if (particles) particles.hidden = !enabled;

    if (persist) savePref('motion', enabled);
  }

  $$('[data-set-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.setTheme);
      setCustomMode('preset');
    });
  });

  $('#settings-theme').addEventListener('change', (event) => {
    applyTheme(event.target.value);
    setCustomMode('preset');
  });

  $('#quick-theme').addEventListener('click', () => {
    const names = Object.keys(THEMES);
    const current = names.indexOf(document.body.dataset.theme);
    const next = names[(current + 1) % names.length];

    applyTheme(next);
    setCustomMode('preset');
  });

  $('#accent-color').addEventListener('input', (event) => {
    applyAccent(event.target.value);
  });

  $('#settings-motion').addEventListener('change', (event) => {
    applyMotion(event.target.checked, true);
  });

  /* =====================================================
     ANIMATED BACKGROUND ELEMENTS
  ===================================================== */

  function createAnimations() {
    const rain = $('#matrix-rain');

    if (rain && rain.childElementCount === 0) {
      for (let i = 0; i < 28; i += 1) {
        const column = document.createElement('span');
        column.className = 'matrix-column';
        column.style.setProperty('--x', `${(i * 3.73) % 100}%`);
        column.style.setProperty('--duration', `${7 + (i % 8) * 1.4}s`);
        column.style.setProperty('--delay', `${-(i % 10) * 1.35}s`);

        column.textContent = Array.from(
          { length: 26 },
          (_, n) => (i * 7 + n * 3 + (n % 2)) % 2
        ).join('\n');

        rain.appendChild(column);
      }
    }

    const equalizer = $('#cyber-equalizer');

    if (equalizer && equalizer.childElementCount === 0) {
      for (let i = 0; i < 48; i += 1) {
        const bar = document.createElement('i');

        bar.style.setProperty('--h', `${22 + ((i * 31) % 76)}%`);
        bar.style.setProperty('--beat', `${0.38 + (i % 7) * 0.09}s`);
        bar.style.animationDelay = `${-(i % 9) * 0.12}s`;

        equalizer.appendChild(bar);
      }
    }

    const container = $('#ambient-particles');

    if (container && container.childElementCount === 0) {
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < 25; i += 1) {
        const particle = document.createElement('span');
        particle.className = 'ambient-particle';
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
  }

  /* =====================================================
     CUSTOM BACKGROUND STUDIO
  ===================================================== */

  let customPrefs = safeRead(CUSTOM_KEY, {});
  if (!customPrefs || typeof customPrefs !== 'object') customPrefs = {};

  let wallpaperUrl = null;
  let wallpaperDbPromise = null;

  function openWallpaperDB() {
    if (!('indexedDB' in window)) {
      return Promise.reject(
        new Error('This browser does not support local image storage.')
      );
    }

    if (wallpaperDbPromise) return wallpaperDbPromise;

    wallpaperDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('GradeNovaCustomization', 1);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains('wallpapers')) {
          db.createObjectStore('wallpapers');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return wallpaperDbPromise;
  }

  async function saveWallpaperBlob(blob) {
    const db = await openWallpaperDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('wallpapers', 'readwrite');
      tx.objectStore('wallpapers').put(blob, 'active-wallpaper');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Image save was cancelled.'));
    });
  }

  async function readWallpaperBlob() {
    const db = await openWallpaperDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('wallpapers', 'readonly');
      const request = tx.objectStore('wallpapers').get('active-wallpaper');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteWallpaperBlob() {
    const db = await openWallpaperDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('wallpapers', 'readwrite');
      tx.objectStore('wallpapers').delete('active-wallpaper');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function showWallpaper(blob) {
    if (wallpaperUrl) {
      URL.revokeObjectURL(wallpaperUrl);
      wallpaperUrl = null;
    }

    if (!blob) {
      document.body.style.removeProperty('--custom-wallpaper');
      return;
    }

    wallpaperUrl = URL.createObjectURL(blob);

    document.body.style.setProperty(
      '--custom-wallpaper',
      `url("${wallpaperUrl}")`
    );
  }

  const modeControl = $('#customize-mode');
  const themeControl = $('#customize-theme');
  const solidColorControl = $('#customize-solid-color');
  const wallpaperControl = $('#customize-wallpaper');
  const overlayControl = $('#customize-overlay');
  const overlayValue = $('#customize-overlay-value');

  function setCustomMode(mode, persist = true) {
    if (!['preset', 'solid', 'wallpaper'].includes(mode)) {
      mode = 'preset';
    }

    document.body.dataset.backgroundMode = mode;
    modeControl.value = mode;

    if (mode === 'wallpaper' && !wallpaperUrl) {
      setStatus(
        'customization-status',
        'Choose a picture from your computer to use a custom background.'
      );
    }

    if (persist) {
      customPrefs.mode = mode;
      safeWrite(CUSTOM_KEY, customPrefs);
    }
  }

  function applySolidColor() {
    const color = solidColorControl.value;

    if (!/^#[0-9a-f]{6}$/i.test(color)) return;

    document.body.style.setProperty('--custom-solid-color', color);
    customPrefs.solidColor = color;
    safeWrite(CUSTOM_KEY, customPrefs);
  }

  function applyOverlay() {
    const value = Number(overlayControl.value);

    document.body.style.setProperty(
      '--custom-overlay',
      String(value / 100)
    );

    overlayValue.textContent = `${value}%`;
    customPrefs.overlay = value;
    safeWrite(CUSTOM_KEY, customPrefs);
  }

  modeControl.addEventListener('change', () => {
    setCustomMode(modeControl.value);
  });

  themeControl.addEventListener('change', () => {
    applyTheme(themeControl.value);
    setCustomMode('preset');
  });

  solidColorControl.addEventListener('input', () => {
    applySolidColor();
    setCustomMode('solid');
  });

  overlayControl.addEventListener('input', applyOverlay);

  wallpaperControl.addEventListener('change', async () => {
    const file = wallpaperControl.files && wallpaperControl.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus('customization-status', 'Please choose an image file.', 'error');
      wallpaperControl.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setStatus(
        'customization-status',
        'That picture is larger than 8 MB. Choose a smaller image.',
        'error'
      );
      wallpaperControl.value = '';
      return;
    }

    try {
      await saveWallpaperBlob(file);
      showWallpaper(file);
      setCustomMode('wallpaper');

      setStatus(
        'customization-status',
        '✓ Your picture is saved locally and is now your background.',
        'success'
      );
    } catch (error) {
      console.error('GradeNova could not save the wallpaper:', error);

      setStatus(
        'customization-status',
        'Could not save this picture. Try a smaller image or check browser storage.',
        'error'
      );
    }
  });

  $('#save-customization').addEventListener('click', () => {
    customPrefs.mode = modeControl.value;
    customPrefs.theme = themeControl.value;
    customPrefs.solidColor = solidColorControl.value;
    customPrefs.overlay = Number(overlayControl.value);

    applyTheme(themeControl.value, false);
    applySolidColor();
    applyOverlay();
    setCustomMode(modeControl.value, false);

    const saved = safeWrite(CUSTOM_KEY, customPrefs);

    setStatus(
      'customization-status',
      saved
        ? '✓ Your customization preferences are saved on this device.'
        : 'Could not save preferences. Check browser storage.',
      saved ? 'success' : 'error'
    );
  });

  $('#reset-customization').addEventListener('click', async () => {
    try {
      await deleteWallpaperBlob();
    } catch (error) {
      console.warn('GradeNova could not remove the saved wallpaper:', error);
    }

    showWallpaper(null);

    customPrefs = {
      mode: 'preset',
      theme: 'cosmic',
      solidColor: '#05091b',
      overlay: 35
    };

    themeControl.value = 'cosmic';
    solidColorControl.value = '#05091b';
    overlayControl.value = '35';
    wallpaperControl.value = '';

    applyTheme('cosmic');
    applySolidColor();
    applyOverlay();
    setCustomMode('preset');

    safeWrite(CUSTOM_KEY, customPrefs);

    setStatus(
      'customization-status',
      'Default background restored. Your rubric and grading history were not changed.',
      'success'
    );
  });

  async function restoreCustomization() {
    themeControl.value =
      customPrefs.theme && THEMES[customPrefs.theme]
        ? customPrefs.theme
        : 'cosmic';

    solidColorControl.value =
      /^#[0-9a-f]{6}$/i.test(customPrefs.solidColor || '')
        ? customPrefs.solidColor
        : '#05091b';

    const savedOverlay = Number(customPrefs.overlay);
    overlayControl.value = Number.isFinite(savedOverlay)
      ? Math.max(0, Math.min(75, savedOverlay))
      : 35;

    applySolidColor();
    applyOverlay();

    try {
      const blob = await readWallpaperBlob();
      showWallpaper(blob);
    } catch (error) {
      console.warn('GradeNova could not restore its wallpaper:', error);
    }

    applyTheme(themeControl.value, false);
    setCustomMode(customPrefs.mode || 'preset', false);
  }

  /* =====================================================
     RUBRIC BUILDER
  ===================================================== */

  const rubricContainer = $('#rubric-criteria');

  function criterionRow(name = '', points = 0) {
    const row = document.createElement('div');
    row.className = 'criterion-row';

    const nameLabel = document.createElement('label');
    nameLabel.append('Criterion ');

    const nameInput = document.createElement('input');
    nameInput.name = 'criterion-name';
    nameInput.value = name;
    nameInput.maxLength = 150;
    nameInput.placeholder = 'e.g. Evidence and reasoning';
    nameLabel.appendChild(nameInput);

    const pointsLabel = document.createElement('label');
    pointsLabel.append('Points ');

    const pointsInput = document.createElement('input');
    pointsInput.name = 'criterion-points';
    pointsInput.type = 'number';
    pointsInput.min = '0';
    pointsInput.max = '10000';
    pointsInput.step = '1';
    pointsInput.value = String(points);
    pointsLabel.appendChild(pointsInput);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-criterion';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove criterion');

    remove.addEventListener('click', () => {
      row.remove();
      updateRubricSummary();
    });

    row.append(nameLabel, pointsLabel, remove);
    return row;
  }

  function collectRubric() {
    const criteria = $$('.criterion-row', rubricContainer)
      .map((row) => ({
        name: $('input[name="criterion-name"]', row).value.trim(),
        points: Number($('input[name="criterion-points"]', row).value || 0)
      }))
      .filter((item) => item.name.length > 0);

    return {
      name: $('#rubric-name').value.trim() || 'Untitled rubric',
      instructions: $('#rubric-instructions').value.trim(),
      criteria,
      total: criteria.reduce((sum, item) => sum + item.points, 0)
    };
  }

  function updateRubricSummary() {
    const rubric = collectRubric();

    $('#rubric-total').textContent = String(rubric.total);
    $('#criteria-count').textContent = String(rubric.criteria.length);

    const assignmentTotal = Number($('#total-points').value || 100);
    const note = $('#rubric-total-note');

    if (!note) return;

    if (rubric.total === assignmentTotal) {
      note.textContent = 'Matches the assignment total.';
    } else if (rubric.total > assignmentTotal) {
      note.textContent =
        `Over by ${rubric.total - assignmentTotal} points compared with the assignment total (${assignmentTotal}).`;
    } else {
      note.textContent =
        `${assignmentTotal - rubric.total} points remaining compared with the assignment total (${assignmentTotal}).`;
    }
  }

  $('#add-criterion').addEventListener('click', () => {
    rubricContainer.appendChild(criterionRow('', 0));
    $('input[name="criterion-name"]', rubricContainer.lastElementChild).focus();
    updateRubricSummary();
  });

  rubricContainer.addEventListener('input', updateRubricSummary);
  $('#total-points').addEventListener('input', updateRubricSummary);

  $('#save-rubric').addEventListener('click', () => {
    const rubric = collectRubric();

    if (!rubric.criteria.length) {
      setStatus('rubric-status', 'Add at least one named criterion before saving.', 'error');
      return;
    }

    const validPoints = rubric.criteria.every((item) =>
      Number.isFinite(item.points) && item.points >= 0
    );

    if (!validPoints) {
      setStatus('rubric-status', 'Check the rubric point values.', 'error');
      return;
    }

    const saved = safeWrite(RUBRIC_KEY, rubric);

    setStatus(
      'rubric-status',
      saved
        ? '✓ Rubric saved in this browser.'
        : 'Could not save the rubric. Check browser storage settings.',
      saved ? 'success' : 'error'
    );

    updateRubricSummary();
  });

  $('#reset-rubric').addEventListener('click', () => {
    rubricContainer.replaceChildren(
      ...DEFAULT_RUBRIC.criteria.map((item) => criterionRow(item.name, item.points))
    );

    $('#rubric-name').value = DEFAULT_RUBRIC.name;
    $('#rubric-instructions').value = DEFAULT_RUBRIC.instructions;

    updateRubricSummary();
    setStatus('rubric-status', 'Default rubric restored. Save it to keep the changes.', 'success');
  });

  /* =====================================================
     HISTORY
     Only summaries are saved, never pasted student answers.
  ===================================================== */

  function readHistory() {
    const saved = safeRead(HISTORY_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  function renderHistory() {
    const list = $('#history-list');
    const entries = readHistory();

    $('#history-count').textContent = String(entries.length);
    list.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';

      const icon = document.createElement('span');
      icon.className = 'empty-symbol';
      icon.textContent = '◷';

      const title = document.createElement('h3');
      title.textContent = 'No saved sessions yet';

      const message = document.createElement('p');
      message.textContent =
        'Prepared request summaries will appear here. Student answers are not stored in history.';

      empty.append(icon, title, message);
      list.appendChild(empty);
      return;
    }

    entries.slice().reverse().forEach((entry) => {
      const row = document.createElement('article');
      row.className = 'history-entry';

      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = entry.title || 'Grading session';

      const details = document.createElement('small');
      const date = new Date(entry.createdAt);

      details.textContent =
        `${Number.isNaN(date.getTime()) ? 'Saved session' : date.toLocaleString()} · ` +
        `${entry.points} possible points · ${entry.criteria} criteria`;

      info.append(title, details);

      const chip = document.createElement('span');
      chip.className = 'history-chip';
      chip.textContent = 'Prepared';

      row.append(info, chip);
      list.appendChild(row);
    });
  }

  $('#export-history').addEventListener('click', () => {
    const blob = new Blob(
      [JSON.stringify(readHistory(), null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'gradenova-history.json';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('#clear-history').addEventListener('click', () => {
    if (!window.confirm('Clear saved GradeNova session summaries from this browser?')) return;

    safeWrite(HISTORY_KEY, []);
    renderHistory();
  });

  /* =====================================================
     GRADING FORM
     No fake scores: this front end does not call an AI API.
  ===================================================== */

  $('#grading-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const test = $('#test-input').value.trim();
    const answers = $('#answers-input').value.trim();
    const points = Number($('#total-points').value);
    const rubric = collectRubric();

    if (!test || !answers) {
      setStatus(
        'grading-status',
        'Please enter both the assignment and the student’s answers.',
        'error'
      );
      (!test ? $('#test-input') : $('#answers-input')).focus();
      return;
    }

    if (!Number.isFinite(points) || points <= 0 || points > 10000) {
      setStatus('grading-status', 'Enter a total possible score between 1 and 10,000.', 'error');
      $('#total-points').focus();
      return;
    }

    if (rubric.criteria.some((item) =>
      !Number.isFinite(item.points) || item.points < 0
    )) {
      setStatus('grading-status', 'Check the rubric point values. They must be zero or greater.', 'error');
      return;
    }

    if (rubric.criteria.length && rubric.total > points) {
      setStatus(
        'grading-status',
        `Your rubric totals ${rubric.total} points, which exceeds the ${points} possible points. Adjust the rubric or assignment total first.`,
        'error'
      );
      openTab('rubric');
      return;
    }

    setStatus(
      'grading-status',
      '✓ Request validated. No score has been generated because an AI grading backend is not connected in this frontend code.',
      'success'
    );

    const result = $('#results-content');
    result.replaceChildren();

    const icon = document.createElement('span');
    icon.className = 'empty-symbol';
    icon.textContent = '⌁';

    const title = document.createElement('h3');
    title.textContent = 'Request prepared — not graded yet';

    const message = document.createElement('p');
    message.textContent =
      'Your inputs passed front-end validation. Connect the secure grading backend to generate an actual score and feedback report.';

    const back = document.createElement('a');
    back.className = 'btn btn-primary';
    back.href = '#grading';
    back.textContent = 'Return to grading';

    result.append(icon, title, message, back);

    if ($('#option-history').checked) {
      const entries = readHistory();

      entries.push({
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        title: rubric.name,
        points,
        criteria: rubric.criteria.length,
        strictness: $('#grading-strictness').value
      });

      safeWrite(HISTORY_KEY, entries.slice(-50));
      renderHistory();
    }

    openTab('results');
  });

  $('#clear-grading').addEventListener('click', () => {
    $('#grading-form').reset();
    $('#total-points').value = '100';

    setStatus(
      'grading-status',
      'Form cleared. Your rubric and saved history were not changed.'
    );

    updateRubricSummary();
  });

  /* =====================================================
     SETTINGS
  ===================================================== */

  $('#save-settings').addEventListener('click', () => {
    const prefs = {
      theme: $('#settings-theme').value,
      accent: $('#accent-color').value,
      motion: $('#settings-motion').checked,
      strictness: $('#settings-default-strictness').value
    };

    applyTheme(prefs.theme, false);
    setCustomMode('preset');
    applyAccent(prefs.accent, false);
    applyMotion(prefs.motion, false);
    $('#grading-strictness').value = prefs.strictness;

    const saved = safeWrite(PREFS_KEY, prefs);

    setStatus(
      'settings-status',
      saved
        ? '✓ Your studio preferences are saved on this device.'
        : 'Could not save preferences. Check browser storage settings.',
      saved ? 'success' : 'error'
    );
  });

  $('#reset-settings').addEventListener('click', () => {
    applyTheme('cosmic', false);
    setCustomMode('preset');
    applyAccent('#39d7ff', false);
    applyMotion(true, false);

    $('#settings-default-strictness').value = 'balanced';
    $('#grading-strictness').value = 'balanced';

    safeWrite(PREFS_KEY, {
      theme: 'cosmic',
      accent: '#39d7ff',
      motion: true,
      strictness: 'balanced'
    });

    setStatus('settings-status', 'Default appearance restored.', 'success');
  });

  /* =====================================================
     SERENITY SOUND STUDIO
     Ten synthesized instrumental melodies.
     Music is OFF by default and stays off after reload.
  ===================================================== */

  const TRACKS = [
    {
      name: 'Moonlit Reflections',
      style: 'Soft piano melody',
      instrument: 'piano',
      notes: [60,64,67,72,69,67,64,62,65,69,72,76,74,69,65,64]
    },
    {
      name: 'Gentle Horizons',
      style: 'Soft piano melody',
      instrument: 'piano',
      notes: [57,60,64,69,67,64,60,59,62,65,69,74,72,69,65,62]
    },
    {
      name: 'Forest Whispers',
      style: 'Warm string-like tones',
      instrument: 'violin',
      notes: [55,59,62,67,69,67,62,59,57,60,64,69,67,64,60,57]
    },
    {
      name: 'Ocean Dreams',
      style: 'Piano-style melody',
      instrument: 'piano',
      notes: [62,65,69,74,72,69,65,62,60,64,67,72,71,67,64,60]
    },
    {
      name: 'Quiet Path',
      style: 'Soft piano melody',
      instrument: 'piano',
      notes: [60,63,67,70,72,70,67,63,58,62,65,70,68,65,62,58]
    },
    {
      name: 'Winter Light',
      style: 'Gentle string-like tones',
      instrument: 'violin',
      notes: [53,57,60,65,64,60,57,55,57,60,64,69,67,64,60,57]
    },
    {
      name: 'Golden Morning',
      style: 'Soft piano melody',
      instrument: 'piano',
      notes: [65,69,72,77,76,72,69,67,64,67,71,76,74,71,67,64]
    },
    {
      name: 'Starlit Skies',
      style: 'Piano-style melody',
      instrument: 'piano',
      notes: [58,62,65,70,69,65,62,60,57,60,64,69,67,64,60,57]
    },
    {
      name: 'Calm Waters',
      style: 'Warm string-like tones',
      instrument: 'violin',
      notes: [60,64,67,71,72,71,67,64,55,59,62,67,65,62,59,55]
    },
    {
      name: 'New Beginnings',
      style: 'Soft piano melody',
      instrument: 'piano',
      notes: [62,65,69,74,76,74,69,65,60,64,67,72,74,72,67,64]
    }
  ];

  let currentTrack = 0;
  let audioContext = null;
  let masterGain = null;
  let noteTimer = null;
  let progressTimer = null;
  let activeOscillators = new Set();
  let playing = false;
  let shuffleOn = false;
  let repeatOn = false;
  let noteStep = 0;
  let elapsedMs = 0;
  let startedAt = 0;

  const TRACK_LENGTH_MS = 120000;
  const musicEnabled = $('#music-enabled');
  const musicPlayButton = $('#music-play');
  const musicStatus = $('#music-status');
  const musicTrackList = $('#music-track-list');
  const volumeControl = $('#music-volume');
  const wave = $('#sound-wave');

  function formatMusicTime(ms) {
    const seconds = Math.floor(Math.max(0, ms) / 1000);

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function getElapsedMs() {
    return elapsedMs + (playing ? Date.now() - startedAt : 0);
  }

  function renderTrackList() {
    musicTrackList.replaceChildren();

    TRACKS.forEach((track, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'music-track';
      button.classList.toggle('active', index === currentTrack);

      const number = document.createElement('span');
      number.className = 'track-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const details = document.createElement('span');
      details.className = 'track-details';

      const name = document.createElement('strong');
      name.textContent = track.name;

      const style = document.createElement('small');
      style.textContent = track.style;

      details.append(name, style);

      const duration = document.createElement('span');
      duration.className = 'track-duration';
      duration.textContent = '2:00';

      button.append(number, details, duration);
      button.setAttribute('aria-label', `Play ${track.name}, track ${index + 1}`);

      button.addEventListener('click', () => {
        playTrack(index);
      });

      musicTrackList.appendChild(button);
    });
  }

  function updateTrackDisplay() {
    $('#music-track-title').textContent = TRACKS[currentTrack].name;
    $('#music-track-style').textContent = TRACKS[currentTrack].style;
    renderTrackList();
  }

  function ensureAudioContext() {
    if (audioContext) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error('This browser does not support Web Audio.');
    }

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(volumeControl.value) / 100;
    masterGain.connect(audioContext.destination);
  }

  function stopScheduledNotes() {
    if (noteTimer) clearInterval(noteTimer);
    if (progressTimer) clearInterval(progressTimer);

    noteTimer = null;
    progressTimer = null;

    activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch (_) {
        // The oscillator may already have finished.
      }
    });

    activeOscillators.clear();
  }

  function createMusicNote(midiNote, instrument, lengthSeconds, loudness = 0.7) {
    if (!audioContext || !masterGain) return;

    const now = audioContext.currentTime;
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator.type = instrument === 'violin' ? 'sawtooth' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);

    filter.type = 'lowpass';
    filter.frequency.value = instrument === 'violin' ? 1700 : 2600;
    filter.Q.value = 0.5;

    const peak = (Number(volumeControl.value) / 100) * 0.09 * loudness;
    const attack = instrument === 'violin' ? 0.24 : 0.015;
    const release = instrument === 'violin' ? lengthSeconds : 0.48;

    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(peak, now + attack);
    envelope.gain.setTargetAtTime(
      instrument === 'violin' ? peak * 0.75 : 0.0001,
      now + attack,
      instrument === 'violin' ? 0.3 : 0.12
    );
    envelope.gain.setValueAtTime(
      Math.max(0.0001, peak * 0.25),
      now + Math.max(attack, lengthSeconds - release * 0.4)
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + lengthSeconds);

    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);

    activeOscillators.add(oscillator);

    oscillator.addEventListener('ended', () => {
      activeOscillators.delete(oscillator);
      oscillator.disconnect();
      filter.disconnect();
      envelope.disconnect();
    }, { once: true });

    oscillator.start(now);
    oscillator.stop(now + lengthSeconds + 0.03);
  }

  function scheduleMusicStep() {
    if (!playing || !audioContext) return;

    const track = TRACKS[currentTrack];
    const midi = track.notes[noteStep % track.notes.length];

    createMusicNote(midi, track.instrument, 1.0, 1);

    if (noteStep % 4 === 0) {
      createMusicNote(midi - 12, 'piano', 1.35, 0.45);
      createMusicNote(midi + 7, track.instrument, 1.0, 0.25);
    }

    noteStep += 1;
  }

  function pickRandomTrack(excludeIndex) {
    if (TRACKS.length < 2) return excludeIndex;

    let next = excludeIndex;

    while (next === excludeIndex) {
      next = Math.floor(Math.random() * TRACKS.length);
    }

    return next;
  }

  function updateMusicProgress() {
    const elapsed = getElapsedMs();
    const percent = Math.min(100, (elapsed / TRACK_LENGTH_MS) * 100);

    $('#music-elapsed').textContent = formatMusicTime(elapsed);
    $('#music-progress-fill').style.width = `${percent}%`;

    if (elapsed >= TRACK_LENGTH_MS) {
      const next = repeatOn
        ? currentTrack
        : shuffleOn
          ? pickRandomTrack(currentTrack)
          : (currentTrack + 1) % TRACKS.length;

      playTrack(next);
    }
  }

  async function beginMusic() {
    try {
      ensureAudioContext();
      await audioContext.resume();

      if (playing) return;

      playing = true;
      startedAt = Date.now();

      noteTimer = setInterval(scheduleMusicStep, 680);
      progressTimer = setInterval(updateMusicProgress, 250);

      scheduleMusicStep();

      musicPlayButton.textContent = 'Ⅱ';
      musicPlayButton.setAttribute('aria-label', 'Pause music');
      musicPlayButton.title = 'Pause';

      wave.classList.add('is-playing');
      musicStatus.textContent = `Playing ${TRACKS[currentTrack].name}.`;
    } catch (error) {
      console.error('GradeNova audio could not start:', error);

      musicStatus.textContent =
        'Audio could not start. Try another browser or check your sound settings.';

      musicEnabled.checked = false;
      playing = false;
    }
  }

  function pauseMusic() {
    if (playing) {
      elapsedMs += Date.now() - startedAt;
    }

    playing = false;
    stopScheduledNotes();

    if (audioContext && audioContext.state === 'running') {
      audioContext.suspend().catch(() => {});
    }

    musicPlayButton.textContent = '▶';
    musicPlayButton.setAttribute('aria-label', 'Play music');
    musicPlayButton.title = 'Play';

    wave.classList.remove('is-playing');
    musicStatus.textContent = 'Music paused. Press Play to continue.';

    updateMusicProgress();
  }

  function playTrack(index) {
    currentTrack = (index + TRACKS.length) % TRACKS.length;
    elapsedMs = 0;
    noteStep = 0;

    stopScheduledNotes();
    playing = false;

    updateTrackDisplay();
    musicEnabled.checked = true;

    beginMusic();
  }

  musicEnabled.addEventListener('change', () => {
    if (musicEnabled.checked) {
      beginMusic();
    } else {
      pauseMusic();
      musicStatus.textContent = 'Music is off.';
    }
  });

  musicPlayButton.addEventListener('click', () => {
    if (playing) {
      pauseMusic();
    } else {
      musicEnabled.checked = true;
      beginMusic();
    }
  });

  $('#music-next').addEventListener('click', () => {
    const next = shuffleOn
      ? pickRandomTrack(currentTrack)
      : (currentTrack + 1) % TRACKS.length;

    playTrack(next);
  });

  $('#music-previous').addEventListener('click', () => {
    const previous = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
    playTrack(previous);
  });

  $('#music-shuffle').addEventListener('click', (event) => {
    shuffleOn = !shuffleOn;
    event.currentTarget.setAttribute('aria-pressed', String(shuffleOn));
    musicStatus.textContent = shuffleOn ? 'Shuffle is on.' : 'Shuffle is off.';
  });

  $('#music-repeat').addEventListener('click', (event) => {
    repeatOn = !repeatOn;
    event.currentTarget.setAttribute('aria-pressed', String(repeatOn));
    musicStatus.textContent = repeatOn
      ? 'Repeat current track is on.'
      : 'Repeat current track is off.';
  });

  volumeControl.addEventListener('input', () => {
    const volume = Number(volumeControl.value);

    $('#music-volume-value').textContent = `${volume}%`;

    if (masterGain && audioContext) {
      masterGain.gain.setTargetAtTime(
        volume / 100,
        audioContext.currentTime,
        0.04
      );
    }

    safeWrite(AUDIO_KEY, { volume });
  });

  /* =====================================================
     RESTORE SAVED PREFERENCES AND START THE APP
  ===================================================== */

  const prefs = getPrefs();

  applyTheme(
    Object.hasOwn(THEMES, prefs.theme) ? prefs.theme : 'cosmic',
    false
  );

  applyAccent(
    typeof prefs.accent === 'string' ? prefs.accent : '#39d7ff',
    false
  );

  applyMotion(
    typeof prefs.motion === 'boolean' ? prefs.motion : true,
    false
  );

  if (['lenient', 'balanced', 'strict'].includes(prefs.strictness)) {
    $('#settings-default-strictness').value = prefs.strictness;
    $('#grading-strictness').value = prefs.strictness;
  }

  const savedRubric = safeRead(RUBRIC_KEY, null);

  if (
    savedRubric &&
    Array.isArray(savedRubric.criteria) &&
    savedRubric.criteria.length
  ) {
    $('#rubric-name').value = savedRubric.name || DEFAULT_RUBRIC.name;
    $('#rubric-instructions').value = savedRubric.instructions || '';

    rubricContainer.replaceChildren(
      ...savedRubric.criteria.map((item) =>
        criterionRow(item.name, item.points)
      )
    );
  }

  const savedAudioPrefs = safeRead(AUDIO_KEY, {});

  if (Number.isFinite(Number(savedAudioPrefs.volume))) {
    volumeControl.value = Math.max(
      0,
      Math.min(100, Number(savedAudioPrefs.volume))
    );
  }

  $('#music-volume-value').textContent = `${volumeControl.value}%`;

  // Intentionally do not autoplay music on page load.
  musicEnabled.checked = false;
  updateTrackDisplay();

  createAnimations();
  updateRubricSummary();
  renderHistory();

  restoreCustomization().catch((error) => {
    console.warn('GradeNova could not restore customization:', error);
  });

  openTab(
    VALID_TABS.has(location.hash.slice(1))
      ? location.hash.slice(1)
      : 'home',
    false
  );

  console.info(
    'GradeNova initialized. Frontend features are ready; AI grading requires a configured backend.'
  );
});
