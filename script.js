
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const PREFS_KEY = 'gradenova-preferences-v3';
  const HISTORY_KEY = 'gradenova-history-v3';
  const RUBRIC_KEY = 'gradenova-rubric-v3';

  const THEMES = {
    cosmic: { name: 'Cosmic', description: 'Deep space, glowing planets, and cinematic nebulae.' },
    ocean: { name: 'Ocean', description: 'Deep blue currents and underwater light.' },
    forest: { name: 'Forest', description: 'Moonlit woodland and drifting mist.' },
    inferno: { name: 'Inferno', description: 'Warm volcanic light and glowing embers.' },
    matrix: { name: 'Matrix', description: 'Emerald binary digits falling through a digital world.' },
    cyberpunk: { name: 'Cyberpunk', description: 'A neon city with a pulsing equalizer and glowing grid.' },
    aurora: { name: 'Aurora', description: 'Moving ribbons of green, teal, and violet northern lights.' },
    light: { name: 'Light', description: 'A clean, bright workspace.' }
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
    'home', 'grading', 'rubric', 'history', 'results', 'settings'
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

  /* -------------------------------------------------------
     NAVIGATION
     One panel visible at a time. This does not scroll to
     another section; it switches the actual workspace.
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     THEMES
  ------------------------------------------------------- */

  function updateThemeButtons(theme) {
    $$('[data-set-theme]').forEach((button) => {
      const selected = button.dataset.setTheme === theme;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function getPrefs() {
    const prefs = safeRead(PREFS_KEY, {});
    return prefs && typeof prefs === 'object' ? prefs : {};
  }

  function savePref(name, value) {
    safeWrite(PREFS_KEY, { ...getPrefs(), [name]: value });
  }

  function applyTheme(theme, persist = true) {
    if (!Object.hasOwn(THEMES, theme)) theme = 'cosmic';

    document.body.dataset.theme = theme;

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLORS[theme];

    const select = $('#settings-theme');
    if (select) select.value = theme;

    updateThemeButtons(theme);

    $('#current-theme-name').textContent = THEMES[theme].name;
    $('#current-theme-description').textContent = THEMES[theme].description;

    if (persist) savePref('theme', theme);
  }

  $$('[data-set-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.setTheme);
    });
  });

  $('#settings-theme').addEventListener('change', (event) => {
    applyTheme(event.target.value);
  });

  $('#quick-theme').addEventListener('click', () => {
    const names = Object.keys(THEMES);
    const current = names.indexOf(document.body.dataset.theme);
    applyTheme(names[(current + 1) % names.length]);
  });

  /* -------------------------------------------------------
     ACCENT COLOR AND MOTION
  ------------------------------------------------------- */

  function applyAccent(color, persist = true) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#39d7ff';

    // Set the accent on the body so it overrides theme palettes.
    document.body.style.setProperty('--accent', color);

    const picker = $('#accent-color');
    if (picker) picker.value = color;

    if (persist) savePref('accent', color);
  }

  $('#accent-color').addEventListener('input', (event) => {
    applyAccent(event.target.value);
  });

  function applyMotion(enabled, persist = false) {
    document.body.classList.toggle('motion-off', !enabled);
    $('#settings-motion').checked = enabled;
    $('#ambient-particles').hidden = !enabled;

    if (persist) savePref('motion', enabled);
  }

  $('#settings-motion').addEventListener('change', (event) => {
    applyMotion(event.target.checked, true);
  });

  /* -------------------------------------------------------
     BACKGROUND ANIMATION ELEMENTS
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     RUBRIC BUILDER
  ------------------------------------------------------- */

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
    const criteria = $$('.criterion-row', rubricContainer).map((row) => ({
      name: $('input[name="criterion-name"]', row).value.trim(),
      points: Number($('input[name="criterion-points"]', row).value || 0)
    })).filter((item) => item.name.length > 0);

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

    if (note) {
      if (rubric.total === assignmentTotal) {
        note.textContent = 'Matches the assignment total.';
      } else if (rubric.total > assignmentTotal) {
        note.textContent = `Over by ${rubric.total - assignmentTotal} points compared with the assignment total (${assignmentTotal}).`;
      } else {
        note.textContent = `${assignmentTotal - rubric.total} points remaining compared with the assignment total (${assignmentTotal}).`;
      }
    }
  }

  $('#add-criterion').addEventListener('click', () => {
    rubricContainer.appendChild(criterionRow('', 0));
    const newest = rubricContainer.lastElementChild;
    $('input[name="criterion-name"]', newest).focus();
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
      saved ? '✓ Rubric saved in this browser.' : 'Could not save the rubric. Check browser storage settings.',
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

  /* -------------------------------------------------------
     HISTORY
     This saves summaries only, not student answer text.
  ------------------------------------------------------- */

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
      message.textContent = 'Prepared request summaries will appear here. Student answers are not stored in history.';

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

  /* -------------------------------------------------------
     GRADING FORM
     The frontend validates input but does not invent a score.
  ------------------------------------------------------- */

  $('#grading-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const test = $('#test-input').value.trim();
    const answers = $('#answers-input').value.trim();
    const points = Number($('#total-points').value);
    const rubric = collectRubric();

    if (!test || !answers) {
      setStatus('grading-status', 'Please enter both the assignment and the student’s answers.', 'error');
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
      setStatus('grading-status', `Your rubric totals ${rubric.total} points, which exceeds the ${points} possible points. Adjust the rubric or assignment total first.`, 'error');
      openTab('rubric');
      return;
    }

    setStatus(
      'grading-status',
      '✓ Request validated. No score has been generated because an AI grading backend is not connected.',
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
    message.textContent = 'Your inputs passed front-end validation. Connect a secure backend to generate an actual score and feedback report.';

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
    setStatus('grading-status', 'Form cleared. Your rubric and saved history were not changed.');
    updateRubricSummary();
  });

  /* -------------------------------------------------------
     SETTINGS
  ------------------------------------------------------- */

  $('#save-settings').addEventListener('click', () => {
    const prefs = {
      theme: $('#settings-theme').value,
      accent: $('#accent-color').value,
      motion: $('#settings-motion').checked,
      strictness: $('#settings-default-strictness').value
    };

    applyTheme(prefs.theme, false);
    applyAccent(prefs.accent, false);
    applyMotion(prefs.motion, false);
    $('#grading-strictness').value = prefs.strictness;

    const saved = safeWrite(PREFS_KEY, prefs);

    setStatus(
      'settings-status',
      saved ? '✓ Your studio preferences are saved on this device.' : 'Could not save preferences. Check browser storage settings.',
      saved ? 'success' : 'error'
    );
  });

  $('#reset-settings').addEventListener('click', () => {
    applyTheme('cosmic', false);
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

  /* -------------------------------------------------------
     RESTORE SAVED PREFERENCES
  ------------------------------------------------------- */

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

  if (savedRubric && Array.isArray(savedRubric.criteria) && savedRubric.criteria.length) {
    $('#rubric-name').value = savedRubric.name || DEFAULT_RUBRIC.name;
    $('#rubric-instructions').value = savedRubric.instructions || '';

    rubricContainer.replaceChildren(
      ...savedRubric.criteria.map((item) => criterionRow(item.name, item.points))
    );
  }

  createAnimations();
  updateRubricSummary();
  renderHistory();

  openTab(
    VALID_TABS.has(location.hash.slice(1)) ? location.hash.slice(1) : 'home',
    false
  );

  console.info('GradeNova initialized. Frontend ready; grading backend not connected.');
});
