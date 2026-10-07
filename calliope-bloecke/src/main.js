/* Start der Anwendung */
(function () {
  /* Kategorie-Darstellung wie in Scratch: farbiger Kreis, Name darunter */
  class ScratchCategory extends ContinuousCategory {
    setSelected(isSelected) {
      super.setSelected(isSelected);
      if (this.rowDiv_) this.rowDiv_.style.backgroundColor = '';
    }
  }

  registerContinuousToolbox();
  Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxCategory.registrationName, ScratchCategory, true);

  /* Kontextmenü auf das Nötige reduzieren */
  ['blockInline', 'blockHelp', 'blockDisable', 'blockComment', 'blockCollapseExpand',
    'collapseWorkspace', 'expandWorkspace', 'workspaceComment'].forEach(id => {
    try { Blockly.ContextMenuRegistry.registry.unregister(id); } catch (e) { /* nicht vorhanden */ }
  });

  /* ---------- Dialogfenster im Scratch-Stil (ersetzt prompt/alert/confirm) ---------- */
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalOk = document.getElementById('modalOk');
  const modalCancel = document.getElementById('modalCancel');
  let modalClose = null;

  let modalLocked = false;
  const modalActions = modal.querySelector('.modalActions');

  function openModal({ title, body, okText = 'OK', cancelText = 'Abbrechen', cancel = true, buttons = true, locked = false, onOk, onCancel, focus }) {
    modalTitle.textContent = title;
    modalBody.replaceChildren(...body);
    modalOk.textContent = okText;
    modalCancel.textContent = cancelText;
    modalActions.hidden = !buttons;
    modalCancel.hidden = !cancel;
    modalLocked = locked;
    modal.hidden = false;
    const close = ok => {
      if (modalClose !== close) return;
      modal.hidden = true;
      modalClose = null;
      modalLocked = false;
      ok ? onOk && onOk() : onCancel && onCancel();
    };
    modalClose = close;
    (focus || (buttons ? modalOk : modal.querySelector('.modal'))).focus();
    return { close: (ok = false) => close(ok) };
  }
  modalOk.addEventListener('click', () => modalClose && modalClose(true));
  modalCancel.addEventListener('click', () => modalClose && modalClose(false));
  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); if (!modalLocked) modalClose && modalClose(false); }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') { e.preventDefault(); modalClose && modalClose(true); }
  });
  modal.addEventListener('mousedown', e => { if (e.target === modal && !modalLocked) modalClose && modalClose(false); });

  const para = text => { const p = document.createElement('p'); p.textContent = text; return p; };

  Blockly.dialog.setPrompt((message, defaultValue, callback) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue || '';
    input.className = 'modalInput';
    const title = /neuen Variable/i.test(message) ? 'Neue Variable'
      : /umbenennen/i.test(message) ? 'Variable umbenennen' : 'Eingabe';
    const label = document.createElement('label');
    label.className = 'modalLabel';
    label.append(message, input);
    openModal({
      title, body: [label], focus: input,
      onOk: () => callback(input.value.trim() || null),
      onCancel: () => callback(null)
    });
    input.select();
  });
  Blockly.dialog.setAlert((message, callback) => {
    openModal({ title: 'Hinweis', body: [para(message)], cancel: false, onOk: callback, onCancel: callback });
  });
  Blockly.dialog.setConfirm((message, callback) => {
    openModal({ title: 'Bitte bestätigen', body: [para(message)], onOk: () => callback(true), onCancel: () => callback(false) });
  });

  /* ---------- Arbeitsfläche ---------- */
  const workspace = Blockly.inject('blocklyDiv', {
    toolbox: CalBlocks.toolboxWithoutVariables,
    theme: CalBlocks.theme,
    renderer: 'zelos',
    media: 'media/',
    sounds: false,
    trashcan: false,
    comments: false,
    disable: false,
    collapse: false,
    zoom: { controls: false, wheel: true, startScale: 0.8, maxScale: 2.5, minScale: 0.35, scaleSpeed: 1.15, pinch: true },
    move: { scrollbars: true, drag: true, wheel: true },
    plugins: {
      flyoutsVerticalToolbox: 'ContinuousFlyout',
      metricsManager: 'ContinuousMetrics',
      toolbox: 'ContinuousToolbox'
    }
  });

  const radioBus = new CalRuntime.RadioBus();
  const sim = new CalRuntime.CalliopeSim(document.getElementById('board'));
  const runtime = new CalRuntime.Runtime(workspace, sim, { name: 'Calliope 1', radio: radioBus });

  /* Der zweite Calliope entsteht erst, wenn er gebraucht wird */
  const boards = [{ sim, runtime }];
  let partner = null;
  function partnerBoard() {
    if (!partner) {
      const sim2 = new CalRuntime.CalliopeSim(document.getElementById('board2'));
      const runtime2 = new CalRuntime.Runtime(workspace, sim2, { name: 'Calliope 2', radio: radioBus });
      partner = { sim: sim2, runtime: runtime2 };
      applySensors();
    }
    return partner;
  }
  const active = () => (partner && partner.on ? boards.concat([partner]) : boards);

  /* Variablen-Kategorie erst nach dem Registrieren der Rückrufe einblenden */
  workspace.registerToolboxCategoryCallback('CAL_VARIABLES', CalBlocks.variablesFlyout);
  workspace.registerButtonCallback('CAL_NEW_VAR', () => Blockly.Variables.createVariableButtonHandler(workspace, null, ''));
  workspace.registerButtonCallback('CAL_MONITORS', () => openMonitorDialog());
  workspace.updateToolbox(CalBlocks.toolbox);

  Blockly.serialization.workspaces.load(CalBlocks.starter, workspace);
  /* neue Variablen automatisch auf der Bühne zeigen (während Laden aus) */
  const app = { autoMonitor: false };
  app.resetBoards = () => active().forEach(bd => { bd.runtime.stopAll(); bd.sim.reset(); });

  const refreshToolbox = () => { const tb = workspace.getToolbox(); if (tb) tb.refreshSelection(); };
  workspace.addChangeListener(e => {
    if (e.type === Blockly.Events.VAR_CREATE) {
      if (app.autoMonitor) runtime.setMonitor(e.varId, true);   // neue Variablen sichtbar, wie in Scratch
      refreshToolbox();
    } else if (e.type === Blockly.Events.VAR_DELETE) {
      runtime.forgetVar(e.varId);
      refreshToolbox();
    } else if (e.type === Blockly.Events.VAR_RENAME) {
      runtime.emitMonitors();
      refreshToolbox();
    }
  });

  /* ---------- Bühnenanzeige der Variablen ---------- */
  const monitorsEl = document.getElementById('monitors');
  function renderMonitors() {
    const map = workspace.getVariableMap();
    const items = [];
    for (const id of runtime.monitors) {
      const v = map.getVariableById(id);
      if (!v) continue;
      const row = document.createElement('div');
      row.className = 'monitor';
      const name = document.createElement('span');
      name.className = 'monitorName';
      name.textContent = v.getName();
      const val = document.createElement('span');
      val.className = 'monitorValue';
      val.textContent = CalRuntime.toText(runtime.getVar(id));
      row.append(name, val);
      items.push(row);
    }
    monitorsEl.replaceChildren(...items);
  }
  let monitorQueued = false;
  runtime.onMonitors(() => {
    if (monitorQueued) return;
    monitorQueued = true;
    requestAnimationFrame(() => { monitorQueued = false; renderMonitors(); });
  });

  function openMonitorDialog() {
    const vars = workspace.getVariableMap().getAllVariables()
      .slice().sort((a, b) => a.getName().localeCompare(b.getName(), 'de'));
    const list = document.createElement('div');
    list.className = 'monitorChoice';
    const boxes = vars.map(v => {
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = runtime.monitors.has(v.getId());
      box.dataset.id = v.getId();
      label.append(box, v.getName());
      list.appendChild(label);
      return box;
    });
    openModal({
      title: 'Bühnenanzeige', body: [para('Welche Variablen sollen auf der Bühne angezeigt werden?'), list],
      focus: boxes[0],
      onOk: () => boxes.forEach(b => runtime.setMonitor(b.dataset.id, b.checked))
    });
  }

  /* ---------- Start / Stopp ---------- */
  const flagBtn = document.getElementById('flagBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('runStatus');
  flagBtn.addEventListener('click', () => { sim.speaker.ensure(); active().forEach(bd => bd.runtime.greenFlag()); });
  stopBtn.addEventListener('click', () => active().forEach(bd => bd.runtime.stopAll()));
  runtime.onChange(running => {
    flagBtn.classList.toggle('active', running);
    status.textContent = running ? 'Programm läuft' : 'Angehalten';
  });

  /* Skript anklicken = starten bzw. anhalten (wie in Scratch) */
  workspace.addChangeListener(e => {
    if (e.type === Blockly.Events.CLICK && e.targetType === 'block' && e.blockId) {
      const block = workspace.getBlockById(e.blockId);
      if (!block) return;
      sim.speaker.ensure();
      const root = block.getRootBlock();
      if (runtime.isRunning(root)) runtime.stopRoot(root); else runtime.start(root);
    }
  });

  /* Wert eines angeklickten Reporters als Sprechblase zeigen */
  const bubble = document.getElementById('valueBubble');
  let bubbleTimer = null;
  runtime.bubbleHandler = (block, text) => {
    const r = block.getSvgRoot().getBoundingClientRect();
    bubble.textContent = text === '' ? '(leer)' : text;
    bubble.style.left = `${r.left + r.width / 2}px`;
    bubble.style.top = `${r.top - 8}px`;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 2500);
  };
  workspace.addChangeListener(e => { if (e.type === Blockly.Events.VIEWPORT_CHANGE || e.type === Blockly.Events.BLOCK_DRAG) bubble.hidden = true; });

  /* Laufende Skripte nach dem Verschieben weiter hervorheben */
  workspace.addChangeListener(e => {
    if (e.type === Blockly.Events.BLOCK_MOVE || e.type === Blockly.Events.BLOCK_DELETE) runtime.emit();
  });

  /* ---------- Eingänge: A+B, Sensoren ---------- */
  const abBtn = document.getElementById('abBtn');
  const abDown = e => { e.preventDefault(); abBtn.setPointerCapture(e.pointerId); abBtn.classList.add('down'); sim.press('AB'); };
  const abUp = () => { abBtn.classList.remove('down'); sim.release('AB'); };
  abBtn.addEventListener('pointerdown', abDown);
  abBtn.addEventListener('pointerup', abUp);
  abBtn.addEventListener('pointercancel', abUp);
  abBtn.addEventListener('lostpointercapture', abUp);

  /* Alle Regler wirken auf jeden angezeigten Calliope */
  const sliders = [...document.querySelectorAll('[data-sensor], [data-tilt], [data-heading]')];
  const sims = () => active().map(bd => bd.sim);
  const sval = id => Number(document.getElementById(id).value);
  function applySensors() {
    sliders.forEach(sl => {
      const out = document.getElementById(sl.id + 'Out');
      if (out) out.textContent = sl.value + (sl.dataset.unit || '');
    });
    sims().forEach(s => {
      s.setSensor('LIGHT', sval('sLight'));
      s.setSensor('TEMP', sval('sTemp'));
      s.setSensor('SOUND', sval('sSound'));
      s.setTilt(sval('sRoll'), sval('sPitch'));
      s.setHeading(sval('sHeading'));
    });
  }
  sliders.forEach(sl => sl.addEventListener('input', applySensors));
  applySensors();

  document.getElementById('clapBtn').addEventListener('click', () => sims().forEach(s => s.clap()));
  document.getElementById('shakeBtn').addEventListener('click', () => sims().forEach(s => s.gesture('shake', 500)));
  document.getElementById('fallBtn').addEventListener('click', () => sims().forEach(s => s.gesture('freefall', 500)));
  document.getElementById('flatBtn').addEventListener('click', () => {
    document.getElementById('sRoll').value = 0;
    document.getElementById('sPitch').value = 0;
    applySensors();
  });

  /* ---------- Funk ---------- */
  const partnerToggle = document.getElementById('partnerToggle');
  const board2Box = document.getElementById('board2Box');
  const boardsEl = document.querySelector('.boards');
  partnerToggle.addEventListener('change', () => {
    const bd = partnerBoard();
    bd.on = partnerToggle.checked;
    board2Box.hidden = !bd.on;
    boardsEl.classList.toggle('two', bd.on);
    boardsEl.closest('.stage').classList.toggle('two', bd.on);
    if (bd.on) { applySensors(); } else { bd.runtime.stopAll(); bd.sim.reset(); }
    Blockly.svgResize(workspace);
    updateRadioStatus();
  });

  const radioStatus = document.getElementById('radioStatus');
  function updateRadioStatus() {
    radioStatus.textContent = active().map(bd => `${bd.runtime.name}: Kanal ${bd.sim.radioChannel}`).join(' · ');
  }
  setInterval(updateRadioStatus, 400);

  const radioLog = document.getElementById('radioLog');
  radioBus.onLog(entries => {
    if (!entries.length) {
      radioLog.replaceChildren(Object.assign(document.createElement('li'), { className: 'radioEmpty', textContent: 'Noch keine Nachrichten.' }));
      return;
    }
    const rows = entries.slice(-20).map(e => {
      const li = document.createElement('li');
      const from = document.createElement('span'); from.className = 'radioFrom'; from.textContent = e.from;
      const ch = document.createElement('span'); ch.className = 'radioChan'; ch.textContent = 'K' + e.channel;
      const body = document.createElement('span'); body.className = 'radioBody'; body.textContent = e.text === '' ? '(leer)' : e.text;
      const heard = document.createElement('span'); heard.className = 'radioHeard';
      heard.textContent = e.heard === 0 ? 'niemand hört' : e.heard === 1 ? '1 hört' : e.heard + ' hören';
      li.append(from, ch, body, heard);
      return li;
    });
    radioLog.replaceChildren(...rows);
    radioLog.scrollTop = radioLog.scrollHeight;
  });

  document.getElementById('radioSendBtn').addEventListener('click', () => {
    const ch = Math.max(0, Math.min(83, Math.round(Number(document.getElementById('radioChannel').value) || 0)));
    document.getElementById('radioChannel').value = ch;
    radioBus.inject(ch, document.getElementById('radioText').value);
  });
  document.getElementById('radioText').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('radioSendBtn').click(); }
  });

  /* Tastatur: A und B */
  const typing = () => {
    const a = document.activeElement;
    return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable) || !modal.hidden;
  };
  window.addEventListener('keydown', e => {
    if (e.repeat || typing() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'b') { sim.press(k.toUpperCase()); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'b') sim.release(k.toUpperCase());
  });
  window.addEventListener('blur', () => active().forEach(bd => bd.sim.releaseAll()));

  /* Zoom-Knöpfe */
  document.getElementById('zoomIn').addEventListener('click', () => workspace.zoomCenter(1));
  document.getElementById('zoomOut').addEventListener('click', () => workspace.zoomCenter(-1));
  document.getElementById('zoomReset').addEventListener('click', () => {
    workspace.setScale(0.8);
    workspace.scrollCenter();
  });

  window.addEventListener('resize', () => Blockly.svgResize(workspace));
  window.calApp = Object.assign(app, { workspace, sim, runtime, radioBus, boards: active, openModal, para, isModalOpen: () => !modal.hidden });
  CalProject.init(window.calApp);
  CalDevice.init(window.calApp);
})();
