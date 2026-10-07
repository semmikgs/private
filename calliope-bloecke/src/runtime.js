/* Simulator-Zustand und Block-Interpreter */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- Simulierter Calliope ---------- */
  class CalliopeSim {
    constructor(svg) {
      this.svg = svg;
      this.leds = new Uint8Array(25);
      this.rgb = ['#000000', '#000000', '#000000'];
      this.pressed = { A: false, B: false };
      this.sensors = { LIGHT: 120, TEMP: 21, SOUND: 20 };
      this.clapUntil = 0;
      this.tilt = { roll: 0, pitch: 0 };     // Neigung in Grad
      this.heading = 0;                       // Kompass-Richtung in Grad
      this.compassOk = false;                 // Kompass kalibriert?
      this.gestureUntil = 0;
      this.gestureOverride = '';
      this.radioChannel = 7;
      this.radioUntil = 0;
      this.buttonListeners = [];
      this.dirty = true;
      this.ledEls = [];
      this.rgbEls = [];
      this.speaker = new CalSounds.Speaker();
      this.buildBoard();
      this.speaker.onChange(playing => this.speakerEl.classList.toggle('playing', playing));
      this.renderLoop();
    }

    buildBoard() {
      const el = (tag, attrs, parent, title) => {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (title) { const t = document.createElementNS(NS, 'title'); t.textContent = title; e.appendChild(t); }
        (parent || this.svg).appendChild(e);
        return e;
      };
      const text = (x, y, str, cls, parent, anchor) => {
        const t = el('text', { x, y, class: cls, 'text-anchor': anchor || 'middle' }, parent);
        t.textContent = str;
        return t;
      };
      this.svg.setAttribute('viewBox', '28 2 344 296');
      const defs = el('defs', {});
      const glowId = 'ledGlow' + (++boardCount);   // je Board eine eigene Kennung
      const f = el('filter', { id: glowId, x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
      el('feGaussianBlur', { stdDeviation: '3', result: 'b' }, f);
      const m = el('feMerge', {}, f);
      el('feMergeNode', { in: 'b' }, m);
      el('feMergeNode', { in: 'SourceGraphic' }, m);

      /* Platine: gleichmäßiges Sechseck */
      el('path', { d: 'M38 150 L119 10 L281 10 L362 150 L281 290 L119 290 Z', class: 'board' });

      /* Helligkeit wird über die LED-Matrix gemessen */
      const lightTag = el('g', { class: 'sensorTag' }, null, 'Die LED-Matrix misst auch die Helligkeit');
      this.sunEl = el('g', { transform: 'translate(172 33)' }, lightTag);
      el('circle', { cx: 0, cy: 0, r: 3.6, class: 'sunCore' }, this.sunEl);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        el('line', { x1: Math.cos(a) * 5.5, y1: Math.sin(a) * 5.5, x2: Math.cos(a) * 8, y2: Math.sin(a) * 8, class: 'sunRay' }, this.sunEl);
      }
      text(183, 37, 'Helligkeit', 'boardLabel part', lightTag, 'start');

      /* LED-Matrix */
      const step = 24, w = 11, h = 17, cy0 = 106;
      const x0 = 200 - (step * 4) / 2, y0 = cy0 - (step * 4) / 2;
      for (let i = 0; i < 25; i++) {
        const cx = x0 + (i % 5) * step, cy = y0 + Math.floor(i / 5) * step;
        const led = el('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 3, class: 'led' });
        led.style.setProperty('--glow', `url(#${glowId})`);
        this.ledEls.push(led);
      }

      /* Knöpfe */
      this.btnEls = {};
      [['A', 92], ['B', 308]].forEach(([name, cx]) => {
        const g = el('g', { class: 'hwButton' }, null, 'Knopf ' + name);
        el('rect', { x: cx - 24, y: cy0 - 24, width: 48, height: 48, rx: 9, class: 'btnPlate' }, g);
        el('circle', { cx, cy: cy0, r: 15, class: 'btnCap' }, g);
        text(cx, cy0 + 44, name, 'boardLabel');
        this.btnEls[name] = g;
        const down = e => { e.preventDefault(); g.setPointerCapture && g.setPointerCapture(e.pointerId); this.press(name); };
        const up = () => this.release(name);
        g.addEventListener('pointerdown', down);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointercancel', up);
        g.addEventListener('lostpointercapture', up);
      });

      /* RGB-LEDs */
      text(163, 188, 'RGB', 'boardLabel part', null, 'end');
      [176, 200, 224].forEach((cx, i) => {
        const g = el('g', { class: 'rgb' }, null, 'RGB-LED ' + (i + 1));
        el('circle', { cx, cy: 184, r: 10, class: 'rgbRing' }, g);
        this.rgbEls.push(el('circle', { cx, cy: 184, r: 6.5, class: 'rgbLed' }, g));
      });

      /* Lautsprecher */
      this.speakerEl = el('g', { class: 'speaker', transform: 'translate(130 222)' }, null, 'Lautsprecher');
      el('path', { d: 'M-12 -5h6l8 -7v24l-8 -7h-6z', class: 'boardIcon' }, this.speakerEl);
      el('path', { d: 'M6 -4a7 7 0 0 1 0 12', class: 'wave w1' }, this.speakerEl);
      el('path', { d: 'M10 -9a13 13 0 0 1 0 22', class: 'wave w2' }, this.speakerEl);
      text(134, 252, 'Lautsprecher', 'boardLabel part');

      /* Prozessor mit Temperatursensor */
      const chip = el('g', { class: 'chip' }, null, 'Prozessor, misst auch die Temperatur');
      for (let k = 0; k < 4; k++) {
        const p = 192 + k * 5.3;
        el('line', { x1: p, y1: 205, x2: p, y2: 209, class: 'chipPin' }, chip);
        el('line', { x1: p, y1: 235, x2: p, y2: 239, class: 'chipPin' }, chip);
        el('line', { x1: 183, y1: p + 17, x2: 187, y2: p + 17, class: 'chipPin' }, chip);
        el('line', { x1: 213, y1: p + 17, x2: 217, y2: p + 17, class: 'chipPin' }, chip);
      }
      el('rect', { x: 187, y: 209, width: 26, height: 26, rx: 3, class: 'chipBody' }, chip);
      el('rect', { x: 198.5, y: 213, width: 3, height: 11, rx: 1.5, class: 'thermoStem' }, chip);
      this.thermoEl = el('circle', { cx: 200, cy: 227, r: 3.6, class: 'thermoBulb' }, chip);
      text(200, 252, 'Temperatur', 'boardLabel part');

      /* Mikrofon */
      this.micEl = el('g', { class: 'mic', transform: 'translate(266 222)' }, null, 'Mikrofon');
      this.micLevelEl = el('circle', { cx: 0, cy: -2, r: 12, class: 'micLevel' }, this.micEl);
      el('rect', { x: -5, y: -12, width: 10, height: 16, rx: 5, class: 'boardIcon' }, this.micEl);
      el('path', { d: 'M-9 -2a9 9 0 0 0 18 0M0 7v5M-5 12h10', class: 'boardIconLine' }, this.micEl);
      text(266, 252, 'Mikrofon', 'boardLabel part');

      /* Lage- und Kompasssensor (ein Bauteil, wie auf dem echten Gerät) */
      const motion = el('g', { class: 'motion' }, null, 'Lagesensor und Kompass in einem Bauteil');
      for (let k = 0; k < 3; k++) {
        const q = 172 + k * 8;
        el('line', { x1: q - 66, y1: 160, x2: q - 66, y2: 164, class: 'chipPin' }, motion);
        el('line', { x1: q - 66, y1: 196, x2: q - 66, y2: 200, class: 'chipPin' }, motion);
        el('line', { x1: 86, y1: q, x2: 90, y2: q, class: 'chipPin' }, motion);
        el('line', { x1: 122, y1: q, x2: 126, y2: q, class: 'chipPin' }, motion);
      }
      el('rect', { x: 90, y: 164, width: 32, height: 32, rx: 4, class: 'chipBody' }, motion);
      el('circle', { cx: 106, cy: 180, r: 12, class: 'levelRing' }, motion);
      this.needleEl = el('g', { class: 'needle', transform: 'translate(106 180)' }, motion);
      el('path', { d: 'M0 -10 L3 0 L-3 0 Z', class: 'needleN' }, this.needleEl);
      el('path', { d: 'M0 10 L3 0 L-3 0 Z', class: 'needleS' }, this.needleEl);
      this.bubbleEl = el('circle', { cx: 106, cy: 180, r: 2.6, class: 'levelBubble' }, motion);
      text(106, 207, 'Lage/Kompass', 'boardLabel part', motion);

      /* Funkmodul */
      this.radioEl = el('g', { class: 'radio' }, null, 'Funkmodul');
      el('rect', { x: 284, y: 176, width: 26, height: 18, rx: 3, class: 'chipBody' }, this.radioEl);
      el('circle', { cx: 297, cy: 170, r: 2.4, class: 'boardIcon' }, this.radioEl);
      el('path', { d: 'M291.5 166 a8 8 0 0 1 11 0', class: 'wave w1' }, this.radioEl);
      el('path', { d: 'M287.5 161 a13 13 0 0 1 19 0', class: 'wave w2' }, this.radioEl);
      text(297, 207, 'Funk', 'boardLabel part', this.radioEl);

      /* Anschlüsse (nur angedeutet) */
      ['P0', 'P1', 'P2', 'P3'].forEach((p, i) => {
        const cx = 152 + i * 32;
        el('rect', { x: cx - 12, y: 266, width: 24, height: 13, rx: 3, class: 'pad' }, null, 'Anschluss ' + p);
        text(cx, 276, p, 'padLabel');
      });
    }

    /* Anzeige */
    setPixel(x, y, v) {
      x = Math.round(x); y = Math.round(y);
      if (!(x >= 0 && x <= 4 && y >= 0 && y <= 4)) return;
      this.leds[y * 5 + x] = v ? 255 : 0;
      this.dirty = true;
    }
    getPixel(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (!(x >= 0 && x <= 4 && y >= 0 && y <= 4)) return 0;
      return this.leds[y * 5 + x];
    }
    showBits(bits) {
      for (let i = 0; i < 25; i++) this.leds[i] = bits[i] === '1' ? 255 : 0;
      this.dirty = true;
    }
    showColumns(cols) {
      for (let x = 0; x < 5; x++)
        for (let y = 0; y < 5; y++) this.leds[y * 5 + x] = cols[x] && cols[x][y] ? 255 : 0;
      this.dirty = true;
    }
    clear() { this.leds.fill(0); this.dirty = true; }

    /* RGB-LEDs */
    setRgb(which, hex) {
      const idx = which === 'ALL' ? [0, 1, 2] : [Number(which)];
      idx.forEach(i => { if (i >= 0 && i <= 2) this.rgb[i] = hex; });
      this.dirty = true;
    }

    /* Sensoren */
    setSensor(name, value) { this.sensors[name] = value; this.dirty = true; }
    clap() { this.clapUntil = performance.now() + 350; this.dirty = true; }
    read(name) {
      if (name === 'SOUND') return performance.now() < this.clapUntil ? 255 : this.sensors.SOUND;
      return this.sensors[name];
    }

    /* Lage: aus den beiden Neigungswinkeln ergibt sich der Messwert jeder Achse.
       Die Summe ist immer genau 1 g, wie beim ruhig gehaltenen Gerät. */
    setTilt(roll, pitch) { this.tilt = { roll, pitch }; this.dirty = true; }
    setHeading(deg) { this.heading = ((Math.round(deg) % 360) + 360) % 360; this.dirty = true; }
    gesture(name, ms = 400) {
      this.gestureOverride = name;
      this.gestureUntil = performance.now() + ms;
      this.dirty = true;
    }
    accel(axis) {
      const now = performance.now();
      if (now < this.gestureUntil) {
        if (this.gestureOverride === 'freefall') return 0;
        if (this.gestureOverride === 'shake') return Math.round((Math.random() * 2 - 1) * 2000);
      }
      const r = rad(this.tilt.roll), p = rad(this.tilt.pitch);
      const v = axis === 'x' ? 1024 * Math.sin(r) * Math.cos(p)
        : axis === 'y' ? 1024 * Math.sin(p)
          : -1024 * Math.cos(r) * Math.cos(p);
      return Math.round(v) || 0;
    }
    currentGesture() {
      if (performance.now() < this.gestureUntil) return this.gestureOverride;
      const v = { x: this.accel('x'), y: this.accel('y'), z: this.accel('z') };
      const axis = ['x', 'y', 'z'].reduce((a, b) => Math.abs(v[b]) > Math.abs(v[a]) ? b : a);
      if (Math.abs(v[axis]) < 800) return '';
      if (axis === 'z') return v.z < 0 ? 'face up' : 'face down';
      if (axis === 'y') return v.y < 0 ? 'up' : 'down';
      return v.x < 0 ? 'left' : 'right';
    }
    compassHeading() { return this.heading; }
    calibrateCompass() { this.compassOk = true; this.dirty = true; }

    /* Funk */
    setChannel(n) { this.radioChannel = Math.max(0, Math.min(83, Math.round(toNum(n)))); this.dirty = true; }
    blinkRadio() { this.radioUntil = performance.now() + 250; this.dirty = true; }

    renderLoop() {
      const now = performance.now();
      const busy = now < this.clapUntil || now < this.gestureUntil || now < this.radioUntil;
      if (this.dirty || busy || this.wasBusy) {
        this.dirty = false;
        this.wasBusy = busy;
        this.ledEls.forEach((r, i) => r.classList.toggle('on', this.leds[i] > 0));
        this.rgbEls.forEach((c, i) => {
          const hex = this.rgb[i];
          const on = hex !== '#000000';
          c.setAttribute('fill', on ? hex : '#16383F');
          c.style.filter = on ? `drop-shadow(0 0 4px ${hex}) drop-shadow(0 0 7px ${hex})` : '';
        });
        const level = this.read('SOUND') / 255;
        this.micLevelEl.style.opacity = String(level * 0.55);
        this.micLevelEl.setAttribute('r', String(12 + level * 10));
        /* Libelle: zeigt die Neigung, Nadel: zeigt nach Norden */
        const ax = this.accel('x') / 1024, ay = this.accel('y') / 1024;
        this.bubbleEl.setAttribute('cx', String(106 + Math.max(-1, Math.min(1, ax)) * 6));
        this.bubbleEl.setAttribute('cy', String(180 + Math.max(-1, Math.min(1, ay)) * 6));
        this.needleEl.setAttribute('transform', `translate(106 180) rotate(${-this.heading})`);
        this.needleEl.classList.toggle('ok', this.compassOk);
        this.radioEl.classList.toggle('active', now < this.radioUntil);
        this.sunEl.style.opacity = String(0.35 + 0.65 * (this.sensors.LIGHT / 255));
        const tt = Math.max(0, Math.min(1, (this.sensors.TEMP + 10) / 60));
        this.thermoEl.setAttribute('fill', `hsl(${Math.round(210 - 210 * tt)}, 85%, 60%)`);
      }
      requestAnimationFrame(() => this.renderLoop());
    }

    /* Knöpfe */
    isPressed(btn) {
      return btn === 'AB' ? (this.pressed.A && this.pressed.B) : !!this.pressed[btn];
    }
    press(btn) {
      this.speaker.ensure();
      const names = btn === 'AB' ? ['A', 'B'] : [btn];
      const before = { ...this.pressed };
      names.forEach(n => { this.pressed[n] = true; this.btnEls[n].classList.add('down'); });
      if (btn === 'AB' || before.A !== this.pressed.A || before.B !== this.pressed.B) {
        const event = this.pressed.A && this.pressed.B ? 'AB' : btn;
        this.buttonListeners.forEach(fn => fn(event));
      }
    }
    release(btn) {
      const names = btn === 'AB' ? ['A', 'B'] : [btn];
      names.forEach(n => { this.pressed[n] = false; this.btnEls[n].classList.remove('down'); });
    }
    releaseAll() { this.release('AB'); }
    onButton(fn) { this.buttonListeners.push(fn); }

    reset() {
      this.clear();
      this.rgb = ['#000000', '#000000', '#000000'];
      this.speaker.stop();
      this.speaker.setVolume(100);
      this.compassOk = false;
      this.radioChannel = 7;
      this.gestureUntil = 0;
      this.dirty = true;
    }
  }

  /* ---------- Hilfsfunktionen wie in Scratch ---------- */
  const STOP = Symbol('stop');
  const STOP_SCRIPT = Symbol('stopScript');

  const toNum = v => {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string' && v.trim() === '') return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };
  const isNumeric = v => typeof v === 'number' ||
    (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)));
  const toBool = v => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
    const s = String(v ?? '').trim().toLowerCase();
    return !(s === '' || s === '0' || s === 'false' || s === 'falsch');
  };
  const toText = v => {
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Unendlich' : '-Unendlich');
      return String(Math.round(v * 1e6) / 1e6);
    }
    if (typeof v === 'boolean') return v ? 'wahr' : 'falsch';
    return String(v ?? '');
  };
  const compare = (a, b) => {
    if (isNumeric(a) && isNumeric(b)) return toNum(a) - toNum(b);
    const sa = toText(a).toLowerCase(), sb = toText(b).toLowerCase();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  };
  const clamp255 = v => Math.max(0, Math.min(255, Math.round(toNum(v))));
  const hex2 = v => clamp255(v).toString(16).padStart(2, '0');
  const rad = d => d * Math.PI / 180;
  const cleanTrig = v => Math.round(v * 1e10) / 1e10;

  class Thread {
    constructor(root) { this.root = root; this.rootId = root.id; this.stopped = false; this.cancelSleep = null; }
    check() { if (this.stopped) throw STOP; }
    sleep(ms) {
      return new Promise(res => {
        const id = setTimeout(() => { this.cancelSleep = null; res(); }, Math.max(0, ms));
        this.cancelSleep = () => { clearTimeout(id); this.cancelSleep = null; res(); };
      }).then(() => this.check());
    }
    tick() { return this.sleep(0); }
    stop() { this.stopped = true; if (this.cancelSleep) this.cancelSleep(); }
  }

  const HATS = new Set(['cal_when_start', 'cal_when_button', 'cal_when_sensor', 'cal_when_gesture', 'cal_when_radio']);

  /* Alle Calliopes im Fenster – für die Hervorhebung laufender Skripte */
  const RUNTIMES = new Set();
  let boardCount = 0;

  /* ---------- Funkverbindung zwischen den Calliopes ---------- */
  class RadioBus {
    constructor() {
      this.members = new Set();
      this.log = [];
      this.listeners = [];
    }
    join(rt) { this.members.add(rt); }
    leave(rt) { this.members.delete(rt); }
    onLog(fn) { this.listeners.push(fn); }
    note(entry) {
      this.log.push(Object.assign({ at: Date.now() }, entry));
      if (this.log.length > 50) this.log.splice(0, this.log.length - 50);
      this.listeners.forEach(fn => fn(this.log));
    }
    clear() { this.log.length = 0; this.listeners.forEach(fn => fn(this.log)); }

    /* von einem Calliope gesendet: alle anderen auf demselben Kanal hören mit */
    send(sender, text) {
      const channel = sender.sim.radioChannel;
      sender.sim.blinkRadio();
      const heard = [];
      this.members.forEach(rt => {
        if (rt !== sender && rt.sim.radioChannel === channel) { heard.push(rt); rt.receiveRadio(text); }
      });
      this.note({ from: sender.name, channel, text, heard: heard.length });
    }

    /* von Hand im Funk-Monitor eingespielt */
    inject(channel, text) {
      const heard = [];
      this.members.forEach(rt => { if (rt.sim.radioChannel === channel) { heard.push(rt); rt.receiveRadio(text); } });
      this.note({ from: 'Monitor', channel, text, heard: heard.length });
      return heard.length;
    }
  }

  /* ---------- Interpreter ---------- */
  class Runtime {
    constructor(workspace, sim, options = {}) {
      this.ws = workspace;
      this.sim = sim;
      this.name = options.name || 'Calliope';
      this.radio = options.radio || null;
      this.lastRadio = '';
      if (this.radio) this.radio.join(this);
      RUNTIMES.add(this);
      this.threads = new Set();
      this.listeners = [];
      this.vars = new Map();
      this.monitors = new Set();
      this.monitorListeners = [];
      this.sensorHatState = new Map();
      this.lastGesture = '';
      this.bubbleHandler = null;
      sim.onButton(code => this.trigger('cal_when_button', b => b.getFieldValue('BTN') === code));
      setInterval(() => { this.pollSensorHats(); this.pollGestureHats(); }, 50);
    }

    onChange(fn) { this.listeners.push(fn); }
    emit() {
      /* Ein Skript gilt als laufend, sobald irgendein Calliope es ausführt. */
      const running = new Set();
      RUNTIMES.forEach(rt => rt.runningRootIds().forEach(id => running.add(id)));
      for (const b of this.ws.getTopBlocks(false)) {
        const svg = b.getSvgRoot && b.getSvgRoot();
        if (svg) svg.classList.toggle('calRunning', running.has(b.id));
      }
      RUNTIMES.forEach(rt => rt.listeners.forEach(fn => fn(running.size > 0)));
    }

    /* Variablen und Bühnenanzeige */
    onMonitors(fn) { this.monitorListeners.push(fn); }
    emitMonitors() { this.monitorListeners.forEach(fn => fn()); }
    getVar(id) { return this.vars.has(id) ? this.vars.get(id) : 0; }
    setVar(id, v) { this.vars.set(id, v); if (this.monitors.has(id)) this.emitMonitors(); }
    setMonitor(id, visible) {
      if (visible) this.monitors.add(id); else this.monitors.delete(id);
      this.emitMonitors();
    }
    forgetVar(id) { this.vars.delete(id); this.monitors.delete(id); this.emitMonitors(); }

    runningRootIds() {
      const ids = new Set();
      this.threads.forEach(t => { if (!t.stopped) ids.add(t.rootId); });
      return ids;
    }
    isRunning(root) { return this.runningRootIds().has(root.id); }

    start(root) {
      const t = new Thread(root);
      this.threads.add(t);
      this.emit();
      this.runThread(t);
      return t;
    }

    stopRoot(root) {
      this.threads.forEach(t => { if (t.rootId === root.id) t.stop(); });
      this.emit();
    }

    stopAll() {
      this.threads.forEach(t => t.stop());
      this.sim.speaker.stop();
      this.emit();
    }

    greenFlag() {
      this.stopAll();
      this.sim.reset();
      this.vars.clear();
      this.emitMonitors();
      this.sensorHatState.clear();
      this.lastGesture = '';
      this.lastRadio = '';
      for (const b of this.ws.getTopBlocks(true)) {
        if (b.type === 'cal_when_start' && b.isEnabled()) this.start(b);
      }
    }

    trigger(type, match) {
      for (const b of this.ws.getTopBlocks(true)) {
        if (b.type === type && b.isEnabled() && match(b) && !this.isRunning(b)) this.start(b);
      }
    }

    /* "Wenn Messwert > Grenze": startet beim Überschreiten */
    pollSensorHats() {
      const seen = new Set();
      for (const b of this.ws.getTopBlocks(false)) {
        if (b.type !== 'cal_when_sensor' || !b.isEnabled()) continue;
        seen.add(b.id);
        let now = false;
        try { now = this.sim.read(b.getFieldValue('SENSOR')) > this.num(b, 'VALUE'); } catch (e) { /* Block im Umbau */ }
        const before = this.sensorHatState.get(b.id) || false;
        this.sensorHatState.set(b.id, now);
        if (now && !before && !this.isRunning(b)) this.start(b);
      }
      for (const id of [...this.sensorHatState.keys()]) if (!seen.has(id)) this.sensorHatState.delete(id);
    }

    /* "Wenn Logo oben": startet, sobald der Calliope in diese Lage kommt */
    pollGestureHats() {
      const now = this.sim.currentGesture();
      if (now === this.lastGesture) return;
      this.lastGesture = now;
      if (!now) return;
      this.trigger('cal_when_gesture', b => b.getFieldValue('GESTURE') === now);
    }

    /* Funk: eine ankommende Nachricht startet die Empfangsskripte neu */
    receiveRadio(text) {
      this.lastRadio = text;
      this.sim.blinkRadio();
      for (const b of this.ws.getTopBlocks(true)) {
        if (b.type !== 'cal_when_radio' || !b.isEnabled()) continue;
        if (this.isRunning(b)) this.stopRoot(b);
        this.start(b);
      }
    }

    async runThread(t) {
      try {
        if (t.root.outputConnection) {
          /* Reporter angeklickt: Wert anzeigen wie in Scratch */
          if (this.bubbleHandler) this.bubbleHandler(t.root, toText(this.evaluate(t.root)));
        } else {
          const first = HATS.has(t.root.type) ? t.root.getNextBlock() : t.root;
          await this.runStack(first, t);
        }
      } catch (e) {
        if (e !== STOP && e !== STOP_SCRIPT) console.error('Fehler im Skript:', e);
      } finally {
        this.threads.delete(t);
        this.emit();
      }
    }

    async runStack(block, t) {
      for (let b = block; b; b = b.getNextBlock()) {
        t.check();
        if (b.isDeadOrDying && b.isDeadOrDying()) throw STOP;
        if (!b.isEnabled()) continue;
        await this.exec(b, t);
      }
    }

    input(b, name) {
      const target = b.getInputTargetBlock(name);
      return target ? this.evaluate(target) : '';
    }
    num(b, name) { return toNum(this.input(b, name)); }
    bool(b, name) {
      const target = b.getInputTargetBlock(name);
      return target ? toBool(this.evaluate(target)) : false;
    }

    evaluate(b) {
      const sim = this.sim;
      switch (b.type) {
        case 'cal_num': {
          const v = b.getFieldValue('NUM');
          return v === '' ? '' : toNum(v);
        }
        case 'cal_txt': return b.getFieldValue('TEXT');
        case 'cal_colour': return b.getFieldValue('COLOUR');
        case 'cal_rgb_mix':
          return ('#' + hex2(this.input(b, 'R')) + hex2(this.input(b, 'G')) + hex2(this.input(b, 'B'))).toUpperCase();

        /* Fühlen */
        case 'cal_button_pressed': return sim.isPressed(b.getFieldValue('BTN'));
        case 'cal_light': return sim.read('LIGHT');
        case 'cal_temperature': return sim.read('TEMP');
        case 'cal_sound_level': return sim.read('SOUND');
        case 'cal_accel': return sim.accel(b.getFieldValue('AXIS'));
        case 'cal_gesture_is': return sim.currentGesture() === b.getFieldValue('GESTURE');
        case 'cal_compass': return sim.compassHeading();
        case 'cal_radio_message': return this.lastRadio;

        /* Operatoren */
        case 'cal_add': return this.num(b, 'A') + this.num(b, 'B');
        case 'cal_sub': return this.num(b, 'A') - this.num(b, 'B');
        case 'cal_mul': return this.num(b, 'A') * this.num(b, 'B');
        case 'cal_div': return this.num(b, 'A') / this.num(b, 'B');
        case 'cal_mod': {
          const n = this.num(b, 'A'), m = this.num(b, 'B');
          let r = n % m;
          if (r / m < 0) r += m;
          return r;
        }
        case 'cal_random': {
          const fromRaw = this.input(b, 'FROM'), toRaw = this.input(b, 'TO');
          let lo = toNum(fromRaw), hi = toNum(toRaw);
          if (lo > hi) [lo, hi] = [hi, lo];
          const isInt = v => Number.isInteger(toNum(v)) && !String(v).includes('.');
          if (isInt(fromRaw) && isInt(toRaw)) return lo + Math.floor(Math.random() * (hi - lo + 1));
          return lo + Math.random() * (hi - lo);
        }
        case 'cal_gt': return compare(this.input(b, 'A'), this.input(b, 'B')) > 0;
        case 'cal_lt': return compare(this.input(b, 'A'), this.input(b, 'B')) < 0;
        case 'cal_eq': return compare(this.input(b, 'A'), this.input(b, 'B')) === 0;
        case 'cal_and': return this.bool(b, 'A') && this.bool(b, 'B');
        case 'cal_or': return this.bool(b, 'A') || this.bool(b, 'B');
        case 'cal_not': return !this.bool(b, 'A');
        case 'cal_join': return toText(this.input(b, 'A')) + toText(this.input(b, 'B'));
        case 'cal_letter_of': {
          const chars = [...toText(this.input(b, 'TEXT'))];
          const i = Math.floor(this.num(b, 'INDEX')) - 1;
          return i >= 0 && i < chars.length ? chars[i] : '';
        }
        case 'cal_length': return [...toText(this.input(b, 'TEXT'))].length;
        case 'cal_contains':
          return toText(this.input(b, 'A')).toLowerCase().includes(toText(this.input(b, 'B')).toLowerCase());
        case 'cal_round': return Math.round(this.num(b, 'A'));
        case 'cal_mathop': {
          const n = this.num(b, 'A');
          switch (b.getFieldValue('OP')) {
            case 'abs': return Math.abs(n);
            case 'floor': return Math.floor(n);
            case 'ceiling': return Math.ceil(n);
            case 'sqrt': return Math.sqrt(n);
            case 'sin': return cleanTrig(Math.sin(rad(n)));
            case 'cos': return cleanTrig(Math.cos(rad(n)));
            case 'tan': return cleanTrig(Math.tan(rad(n)));
            case 'asin': return Math.asin(n) * 180 / Math.PI;
            case 'acos': return Math.acos(n) * 180 / Math.PI;
            case 'atan': return Math.atan(n) * 180 / Math.PI;
            case 'ln': return Math.log(n);
            case 'log': return Math.log10(n);
            case 'e^': return Math.exp(n);
            case '10^': return Math.pow(10, n);
          }
          return 0;
        }

        /* Variablen */
        case 'cal_var_get': return this.getVar(b.getFieldValue('VAR'));
        default: return '';
      }
    }

    async loopBody(b, t) {
      const body = b.getInputTargetBlock('DO');
      if (body) await this.runStack(body, t);
      await t.tick();
    }

    async exec(b, t) {
      const sim = this.sim;
      switch (b.type) {
        /* Steuerung */
        case 'cal_wait':
          await t.sleep(this.num(b, 'SECS') * 1000);
          break;
        case 'cal_repeat': {
          const n = Math.round(this.num(b, 'TIMES'));
          for (let i = 0; i < n; i++) await this.loopBody(b, t);
          break;
        }
        case 'cal_forever':
          for (;;) await this.loopBody(b, t);
        case 'cal_if':
          if (this.bool(b, 'COND')) {
            const body = b.getInputTargetBlock('DO');
            if (body) await this.runStack(body, t);
          }
          break;
        case 'cal_if_else': {
          const body = b.getInputTargetBlock(this.bool(b, 'COND') ? 'DO' : 'ELSE');
          if (body) await this.runStack(body, t);
          break;
        }
        case 'cal_wait_until':
          while (!this.bool(b, 'COND')) await t.tick();
          break;
        case 'cal_repeat_until':
          while (!this.bool(b, 'COND')) await this.loopBody(b, t);
          break;
        case 'cal_stop':
          if (b.getFieldValue('WHAT') === 'ALL') { this.stopAll(); throw STOP; }
          throw STOP_SCRIPT;

        /* Aussehen */
        case 'cal_show_leds':
          sim.showBits(b.getFieldValue('LEDS'));
          break;
        case 'cal_show_icon': {
          const icon = CalFont.ICONS.find(i => i[0] === b.getFieldValue('ICON'));
          if (icon) sim.showBits(icon[2]);
          break;
        }
        case 'cal_show_text':
          await this.scrollText(toText(this.input(b, 'TEXT')), t);
          break;
        case 'cal_plot': {
          const x = this.num(b, 'X'), y = this.num(b, 'Y');
          const mode = b.getFieldValue('MODE');
          const on = mode === 'ON' ? true : mode === 'OFF' ? false : !sim.getPixel(x, y);
          sim.setPixel(x, y, on);
          break;
        }
        case 'cal_clear':
          sim.clear();
          break;
        case 'cal_rgb_colour': {
          const v = toText(this.input(b, 'COLOUR')).trim();
          sim.setRgb(b.getFieldValue('LED'), /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : '#000000');
          break;
        }
        case 'cal_rgb_off':
          sim.setRgb('ALL', '#000000');
          break;

        /* Klang */
        case 'cal_play_note':
        case 'cal_play_freq': {
          const ms = Math.max(0, this.num(b, 'SECS') * 1000);
          const freq = b.type === 'cal_play_note'
            ? CalSounds.midiToFreq(Number(b.getFieldValue('NOTE')))
            : this.num(b, 'FREQ');
          sim.speaker.tone(freq, ms);
          await t.sleep(ms);
          break;
        }
        case 'cal_play_sound': {
          const ms = sim.speaker.playTune(b.getFieldValue('SOUND'));
          await t.sleep(ms);
          break;
        }
        case 'cal_start_sound':
          sim.speaker.playTune(b.getFieldValue('SOUND'));
          break;
        case 'cal_stop_sounds':
          sim.speaker.stop();
          break;
        case 'cal_set_volume':
          sim.speaker.setVolume(this.num(b, 'VOL'));
          break;
        case 'cal_change_volume':
          sim.speaker.setVolume(sim.speaker.volume + this.num(b, 'VOL'));
          break;

        /* Lage und Kompass */
        case 'cal_compass_calibrate':
          await this.calibrateCompass(t);
          break;

        /* Funk */
        case 'cal_radio_channel':
          sim.setChannel(this.input(b, 'CHANNEL'));
          break;
        case 'cal_radio_send':
          if (this.radio) this.radio.send(this, toText(this.input(b, 'TEXT')));
          break;

        /* Variablen */
        case 'cal_var_set':
          this.setVar(b.getFieldValue('VAR'), this.input(b, 'VALUE'));
          break;
        case 'cal_var_change': {
          const id = b.getFieldValue('VAR');
          this.setVar(id, toNum(this.getVar(id)) + this.num(b, 'VALUE'));
          break;
        }
        case 'cal_var_show':
          this.setMonitor(b.getFieldValue('VAR'), true);
          break;
        case 'cal_var_hide':
          this.setMonitor(b.getFieldValue('VAR'), false);
          break;
      }
    }

    /* Kalibrieren: ein Punkt läuft einmal im Kreis, danach ist der Kompass bereit */
    async calibrateCompass(t) {
      const ring = [];
      for (let x = 0; x < 5; x++) ring.push([x, 0]);
      for (let y = 1; y < 5; y++) ring.push([4, y]);
      for (let x = 3; x >= 0; x--) ring.push([x, 4]);
      for (let y = 3; y >= 1; y--) ring.push([0, y]);
      for (const [x, y] of ring) {
        t.check();
        this.sim.clear();
        this.sim.setPixel(x, y, true);
        await t.sleep(80);
      }
      this.sim.clear();
      this.sim.calibrateCompass();
      await t.sleep(200);
    }

    /* verhält sich wie display.scroll() der Firmware */
    async scrollText(text, t) {
      const s = CalFont.deviceText(text);
      if (s.length === 0) return;
      if (s.length === 1) {
        this.sim.showBits(CalFont.charImage(s));
        await t.sleep(400);
        return;
      }
      for (const frame of CalFont.scrollFrames(s)) {
        t.check();
        this.sim.showColumns(frame);
        await t.sleep(150);
      }
    }
  }

  window.CalRuntime = { CalliopeSim, Runtime, RadioBus, toText };
})();
