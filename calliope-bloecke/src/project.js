/* Projekt: Neu, Laden, Speichern, automatische Sicherung */
(function () {
  const FORMAT = 'calliope-bloecke';
  const VERSION = 1;
  const AUTOSAVE_KEY = 'calliope-bloecke:autosave';
  const DEFAULT_NAME = 'Calliope-Projekt';

  function init(app) {
    const { workspace, runtime, sim, openModal, para } = app;
    const nameInput = document.getElementById('projectName');
    const fileInput = document.getElementById('fileInput');
    const menuBtn = document.getElementById('fileMenuBtn');
    const menu = document.getElementById('fileMenu');

    let dirty = false;      // Änderungen seit dem letzten Speichern als Datei
    let loading = true;     // während des Ladens keine Änderungen zählen
    let autosaveTimer = null;
    let touched = false;    // erst nach echten Änderungen im Browser sichern

    /* ---------- Hilfen ---------- */
    const projectName = () => nameInput.value.trim() || DEFAULT_NAME;
    const updateTitle = () => {
      document.title = `${dirty ? '* ' : ''}${projectName()} – Calliope-Blöcke`;
    };
    const markDirty = () => {
      if (loading) return;
      dirty = true;
      touched = true;
      updateTitle();
      scheduleAutosave();
    };

    function snapshot() {
      return {
        format: FORMAT,
        version: VERSION,
        name: projectName(),
        savedAt: new Date().toISOString(),
        workspace: Blockly.serialization.workspaces.save(workspace),
        monitors: [...runtime.monitors]
      };
    }

    function isProject(data) {
      return data && data.format === FORMAT && data.workspace && typeof data.workspace === 'object';
    }

    /* Projektzustand übernehmen */
    function applyProject(data, { markClean = true } = {}) {
      loading = true;
      app.autoMonitor = false;
      app.resetBoards();
      runtime.vars.clear();
      runtime.monitors.clear();
      runtime.emitMonitors();
      workspace.clear();
      Blockly.serialization.workspaces.load(data.workspace, workspace);
      nameInput.value = data.name || DEFAULT_NAME;
      /* Blockly meldet Ereignisse verzögert, daher erst danach wieder scharf schalten */
      setTimeout(() => {
        const map = workspace.getVariableMap();
        (data.monitors || []).forEach(id => { if (map.getVariableById(id)) runtime.monitors.add(id); });
        runtime.emitMonitors();
        workspace.clearUndo();
        workspace.scrollCenter();
        if (markClean) dirty = false;
        loading = false;
        app.autoMonitor = true;
        updateTitle();
      }, 60);
    }

    /* Rückfrage, falls ungespeicherte Änderungen verloren gehen würden */
    function confirmDiscard(actionText, proceed) {
      if (!dirty) { proceed(); return; }
      openModal({
        title: 'Nicht gespeicherte Änderungen',
        body: [para(`Das aktuelle Projekt „${projectName()}“ wurde noch nicht gespeichert. ${actionText}`)],
        okText: 'Trotzdem fortfahren',
        onOk: proceed
      });
    }

    /* ---------- Neu ---------- */
    function newProject() {
      confirmDiscard('Beim Anlegen eines neuen Projekts geht es verloren.', () => {
        applyProject({ name: DEFAULT_NAME, workspace: CalBlocks.starter, monitors: [] });
        touched = false;
        clearAutosave();
      });
    }

    /* ---------- Speichern ---------- */
    function safeFileName(name, ext = '.calliope.json') {
      const cleaned = name.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
      return (cleaned || DEFAULT_NAME) + ext;
    }
    app.fileNameFor = ext => safeFileName(projectName(), ext);

    function saveToComputer() {
      const data = snapshot();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFileName(data.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      dirty = false;
      touched = true;
      updateTitle();
      writeAutosave();
    }

    /* ---------- Laden ---------- */
    function loadFromComputer() {
      confirmDiscard('Beim Laden eines anderen Projekts geht es verloren.', () => {
        fileInput.value = '';
        fileInput.click();
      });
    }

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let data = null;
        try { data = JSON.parse(reader.result); } catch (e) { /* ungültig */ }
        if (!isProject(data)) {
          openModal({
            title: 'Datei lässt sich nicht öffnen',
            body: [para(`„${file.name}“ ist kein Projekt von Calliope-Blöcke. Wähle eine Datei, die hier gespeichert wurde (Endung .calliope.json).`)],
            cancel: false
          });
          return;
        }
        if (!data.name) data.name = file.name.replace(/\.calliope\.json$|\.json$/i, '');
        try {
          applyProject(data);
          touched = true;
          setTimeout(writeAutosave, 150);
        } catch (e) {
          console.error(e);
          openModal({
            title: 'Datei lässt sich nicht öffnen',
            body: [para('Das Projekt enthält Blöcke, die diese Version nicht kennt. Es wurde ein leeres Projekt geöffnet.')],
            cancel: false
          });
          applyProject({ name: DEFAULT_NAME, workspace: CalBlocks.starter, monitors: [] });
        }
      };
      reader.readAsText(file);
    });

    /* ---------- Automatische Sicherung im Browser ---------- */
    function storage() {
      try { return window.localStorage; } catch (e) { return null; }
    }
    function writeAutosave() {
      const ls = storage();
      if (!ls || !touched) return;
      try { ls.setItem(AUTOSAVE_KEY, JSON.stringify(Object.assign(snapshot(), { dirty }))); } catch (e) { /* voll oder gesperrt */ }
    }
    function scheduleAutosave() {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(writeAutosave, 800);
    }
    function clearAutosave() {
      const ls = storage();
      if (ls) try { ls.removeItem(AUTOSAVE_KEY); } catch (e) { /* egal */ }
    }
    function readAutosave() {
      const ls = storage();
      if (!ls) return null;
      try {
        const data = JSON.parse(ls.getItem(AUTOSAVE_KEY));
        return isProject(data) ? data : null;
      } catch (e) { return null; }
    }

    /* ---------- Änderungen verfolgen ---------- */
    workspace.addChangeListener(e => { if (!e.isUiEvent) markDirty(); });
    runtime.onMonitors(() => { if (!loading) scheduleAutosave(); });
    nameInput.addEventListener('input', markDirty);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); });
    nameInput.addEventListener('blur', () => { if (!nameInput.value.trim()) nameInput.value = DEFAULT_NAME; updateTitle(); });

    window.addEventListener('beforeunload', e => {
      writeAutosave();
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    /* ---------- Menü „Datei“ ---------- */
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    function openMenu(focusFirst) {
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      if (focusFirst) items[0].focus();
    }
    function closeMenu() {
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    menuBtn.addEventListener('click', () => (menu.hidden ? openMenu(false) : closeMenu()));
    menuBtn.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(true); } });
    menu.addEventListener('keydown', e => {
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { closeMenu(); menuBtn.focus(); }
    });
    document.addEventListener('pointerdown', e => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) closeMenu();
    });
    const actions = { new: newProject, open: loadFromComputer, save: saveToComputer, hex: () => app.downloadHex() };
    items.forEach(item => item.addEventListener('click', () => {
      closeMenu();
      actions[item.dataset.action]();
    }));

    /* Tastenkürzel Strg+S / Strg+O */
    window.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || app.isModalOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); saveToComputer(); }
      if (k === 'o') { e.preventDefault(); loadFromComputer(); }
    });

    /* ---------- Start: gesicherten Stand anbieten ---------- */
    const saved = readAutosave();
    const finishStart = () => { loading = false; app.autoMonitor = true; updateTitle(); };
    setTimeout(() => {
      if (saved) {
        const when = new Date(saved.savedAt);
        const stamp = isNaN(when) ? '' : ` vom ${when.toLocaleDateString('de-DE')} um ${when.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        openModal({
          title: 'Weiterarbeiten?',
          body: [para(`Im Browser ist ein automatisch gesicherter Stand von „${saved.name}“${stamp} vorhanden.`)],
          okText: 'Wiederherstellen',
          cancelText: 'Neu beginnen',
          onOk: () => {
            applyProject(saved);
            touched = true;
            setTimeout(() => { dirty = !!saved.dirty; updateTitle(); }, 80);
          },
          onCancel: finishStart
        });
      } else {
        finishStart();
      }
    }, 60);
  }

  window.CalProject = { init };
})();
