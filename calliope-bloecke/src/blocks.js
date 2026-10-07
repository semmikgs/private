/* Blöcke, Theme und Toolbox im Scratch-Stil */
(function () {
  const C = {
    events:    ['#FFBF00', '#E6AC00', '#CC9900'],
    control:   ['#FFAB19', '#EC9C13', '#CF8B17'],
    looks:     ['#9966FF', '#855CD6', '#774DCB'],
    sound:     ['#CF63CF', '#C94FC9', '#BD42BD'],
    sensing:   ['#5CB1D6', '#47A8D1', '#2E8EB8'],
    radio:     ['#0FBD8C', '#0DA57A', '#0B8E69'],
    operators: ['#59C059', '#46B946', '#389438'],
    variables: ['#FF8C1A', '#FF8000', '#DB6E00']
  };
  const style = (c, extra) => Object.assign(
    { colourPrimary: c[0], colourSecondary: c[1], colourTertiary: c[2] }, extra || {});

  const theme = Blockly.Theme.defineTheme('calliope-scratch', {
    base: Blockly.Themes.Classic,
    blockStyles: {
      event_blocks: style(C.events, { hat: 'cap' }),
      control_blocks: style(C.control),
      looks_blocks: style(C.looks),
      sound_blocks: style(C.sound),
      sensing_blocks: style(C.sensing),
      radio_blocks: style(C.radio),
      radio_hat_blocks: style(C.radio, { hat: 'cap' }),
      operator_blocks: style(C.operators),
      variable_blocks: style(C.variables),
      shadow_blocks: { colourPrimary: '#FFFFFF', colourSecondary: '#FFFFFF', colourTertiary: '#FFFFFF' }
    },
    categoryStyles: {
      events: { colour: C.events[0] },
      control: { colour: C.control[0] },
      looks: { colour: C.looks[0] },
      sound: { colour: C.sound[0] },
      sensing: { colour: C.sensing[0] },
      radio: { colour: C.radio[0] },
      operators: { colour: C.operators[0] },
      variables: { colour: C.variables[0] }
    },
    componentStyles: {
      workspaceBackgroundColour: '#F9F9F9',
      toolboxBackgroundColour: '#FFFFFF',
      toolboxForegroundColour: '#575E75',
      flyoutBackgroundColour: '#FFFFFF',
      flyoutForegroundColour: '#575E75',
      flyoutOpacity: 1,
      scrollbarColour: '#CECDCE',
      scrollbarOpacity: 1,
      insertionMarkerColour: '#575E75',
      insertionMarkerOpacity: 0.45,
      selectedGlowColour: '#FFD500'
    },
    fontStyle: { family: '"Helvetica Neue", Helvetica, Arial, sans-serif', weight: '500', size: 12 }
  });

  /* ---------- Eigenes Feld: 5x5-LED-Matrix ---------- */
  const CELL = 8, GAP = 2, PAD = 4;
  const SIZE = PAD * 2 + CELL * 5 + GAP * 4;

  class FieldLedMatrix extends Blockly.Field {
    constructor(value, validator, config) {
      super(value || '0'.repeat(25), validator, config);
      this.SERIALIZABLE = true;
      this.EDITABLE = true;
      this.cells_ = [];
    }
    static fromJson(options) { return new FieldLedMatrix(options.value, undefined, options); }

    doClassValidation_(v) {
      if (typeof v !== 'string') return null;
      const s = v.replace(/[^01]/g, '');
      return s.length === 25 ? s : null;
    }

    initView() {
      this.fieldGroup_.classList.add('blocklyField', 'calLedField');
      /* eigene Gruppe, damit die Renderer-Regel ".blocklyEditableField>rect" nicht greift */
      const g = Blockly.utils.dom.createSvgElement('g', {}, this.fieldGroup_);
      this.bg_ = Blockly.utils.dom.createSvgElement('rect',
        { x: 0, y: 0, rx: 6, ry: 6, width: SIZE, height: SIZE, class: 'calLedFieldBg' }, g);
      for (let i = 0; i < 25; i++) {
        const x = PAD + (i % 5) * (CELL + GAP), y = PAD + Math.floor(i / 5) * (CELL + GAP);
        this.cells_.push(Blockly.utils.dom.createSvgElement('rect',
          { x, y, rx: 2, ry: 2, width: CELL, height: CELL }, g));
      }
    }

    updateSize_() { this.size_ = new Blockly.utils.Size(SIZE, SIZE); }

    render_() {
      const v = this.getValue() || '';
      this.cells_.forEach((r, i) => r.setAttribute('class', v[i] === '1' ? 'calLedOn' : 'calLedOff'));
      this.updateSize_();
    }

    getText_() { return 'Bild'; }

    showEditor_() {
      const div = Blockly.DropDownDiv.getContentDiv();
      div.replaceChildren();
      const wrap = document.createElement('div');
      wrap.className = 'calLedEditor';
      const grid = document.createElement('div');
      grid.className = 'calLedEditorGrid';
      const btns = [];
      const refresh = () => {
        const v = this.getValue();
        btns.forEach((b, i) => {
          b.classList.toggle('on', v[i] === '1');
          b.setAttribute('aria-pressed', v[i] === '1');
        });
      };
      for (let i = 0; i < 25; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `LED Spalte ${(i % 5)} Zeile ${Math.floor(i / 5)}`);
        b.addEventListener('click', () => {
          const v = this.getValue().split('');
          v[i] = v[i] === '1' ? '0' : '1';
          this.setValue(v.join(''));
          refresh();
        });
        btns.push(b);
        grid.appendChild(b);
      }
      const row = document.createElement('div');
      row.className = 'calLedEditorActions';
      const mk = (label, bits) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', () => { this.setValue(bits); refresh(); });
        row.appendChild(b);
      };
      mk('Alle aus', '0'.repeat(25));
      mk('Alle an', '1'.repeat(25));
      wrap.append(grid, row);
      div.appendChild(wrap);
      refresh();
      const block = this.getSourceBlock();
      Blockly.DropDownDiv.setColour(block.getColour(), block.getColourTertiary());
      Blockly.DropDownDiv.showPositionedByField(this, () => {});
    }
  }
  Blockly.fieldRegistry.register('field_led_matrix', FieldLedMatrix);

  /* ---------- Eigenes Feld: Farbauswahl ---------- */
  const COLOURS = [
    ['#FF0000', 'Rot'], ['#FF8000', 'Orange'], ['#FFFF00', 'Gelb'], ['#80FF00', 'Hellgrün'],
    ['#00FF00', 'Grün'], ['#00FFFF', 'Türkis'], ['#0080FF', 'Hellblau'], ['#0000FF', 'Blau'],
    ['#8000FF', 'Violett'], ['#FF00FF', 'Magenta'], ['#FF0080', 'Pink'], ['#FFFFFF', 'Weiß']
  ];

  class FieldColourSwatch extends Blockly.Field {
    constructor(value, validator, config) {
      super(value || '#FF0000', validator, config);
      this.SERIALIZABLE = true;
      this.EDITABLE = true;
    }
    static fromJson(options) { return new FieldColourSwatch(options.colour, undefined, options); }
    doClassValidation_(v) {
      return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : null;
    }
    initView() {
      this.fieldGroup_.classList.add('blocklyField', 'calColourField');
      const g = Blockly.utils.dom.createSvgElement('g', {}, this.fieldGroup_);
      this.swatch_ = Blockly.utils.dom.createSvgElement('rect',
        { x: 0, y: 0, width: 40, height: 24, rx: 12, ry: 12, class: 'calColourSwatch' }, g);
    }
    updateSize_() { this.size_ = new Blockly.utils.Size(40, 24); }
    render_() {
      this.swatch_.setAttribute('fill', this.getValue());
      this.updateSize_();
    }
    getText_() {
      const c = COLOURS.find(x => x[0] === this.getValue());
      return c ? c[1] : this.getValue();
    }
    showEditor_() {
      const div = Blockly.DropDownDiv.getContentDiv();
      div.replaceChildren();
      const grid = document.createElement('div');
      grid.className = 'calColourGrid';
      COLOURS.forEach(([hex, name]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.style.background = hex;
        b.title = name;
        b.setAttribute('aria-label', name);
        if (hex === this.getValue()) b.classList.add('current');
        b.addEventListener('click', () => { this.setValue(hex); Blockly.DropDownDiv.hideIfOwner(this); });
        grid.appendChild(b);
      });
      div.appendChild(grid);
      const block = this.getSourceBlock();
      Blockly.DropDownDiv.setColour(block.getColour(), block.getColourTertiary());
      Blockly.DropDownDiv.showPositionedByField(this, () => {});
    }
  }
  Blockly.fieldRegistry.register('field_colour_swatch', FieldColourSwatch);

  /* Zahlenfelder wie in Scratch: dürfen leer sein, nur Zahlen */
  Blockly.Extensions.register('cal_numeric', function () {
    this.getField('NUM').setValidator(v => {
      const s = String(v).replace(',', '.');
      return /^-?\d*\.?\d*$/.test(s) ? s : null;
    });
  });

  /* ---------- Hilfsgrafiken ---------- */
  const svgUri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const FLAG = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M5 3v19" stroke="#45993D" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M6 4c4-2 7 2 12 0v10c-5 2-8-2-12 0z" fill="#4CBF56" stroke="#45993D" stroke-width="1.4" stroke-linejoin="round"/></svg>');

  function iconUri(bits) {
    let r = '';
    for (let i = 0; i < 25; i++) {
      r += `<rect x="${1 + (i % 5) * 4.4}" y="${1 + Math.floor(i / 5) * 4.4}" width="3.6" height="3.6" rx="0.8" fill="${bits[i] === '1' ? '#FFFFFF' : 'rgba(255,255,255,0.28)'}"/>`;
    }
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23.6 23.6">${r}</svg>`);
  }
  const ICON_OPTIONS = CalFont.ICONS.map(([id, name, bits]) =>
    [{ src: iconUri(bits), width: 26, height: 26, alt: name }, id]);

  const BTN_OPTIONS = [['A', 'A'], ['B', 'B'], ['A+B', 'AB']];
  const RGB_OPTIONS = [['alle', 'ALL'], ['1', '0'], ['2', '1'], ['3', '2']];
  const SENSOR_OPTIONS = [['Helligkeit', 'LIGHT'], ['Mikrofon-Lautstärke', 'SOUND'], ['Temperatur', 'TEMP']];

  /* Lagen des Calliope, wie sie die Firmware kennt */
  const GESTURES = [
    ['geschüttelt', 'shake'],
    ['Logo oben', 'up'],
    ['Logo unten', 'down'],
    ['nach links gekippt', 'left'],
    ['nach rechts gekippt', 'right'],
    ['Anzeige oben', 'face up'],
    ['Anzeige unten', 'face down'],
    ['im freien Fall', 'freefall']
  ];
  const AXIS_OPTIONS = [['x', 'x'], ['y', 'y'], ['z', 'z']];

  /* Töne C4 bis C6, deutsche Notennamen */
  const NOTE_NAMES = ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'Ais', 'H'];
  const NOTE_OPTIONS = [];
  for (let m = 60; m <= 84; m++) NOTE_OPTIONS.push([NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1), String(m)]);

  const SOUND_OPTIONS = CalSounds.LIST.map(s => [s.name, s.id]);

  const MATH_OPTIONS = [['Betrag', 'abs'], ['abrunden', 'floor'], ['aufrunden', 'ceiling'], ['Wurzel', 'sqrt'],
    ['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'], ['asin', 'asin'], ['acos', 'acos'], ['atan', 'atan'],
    ['ln', 'ln'], ['log', 'log'], ['e ^', 'e^'], ['10 ^', '10^']];

  const stmt = { previousStatement: null, nextStatement: null, inputsInline: true };
  const binop = (type, fmt, tooltip, output) => Object.assign({
    type, message0: fmt,
    args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }],
    inputsInline: true, output: output === undefined ? 'Value' : output, style: 'operator_blocks', tooltip
  });
  const boolop = (type, fmt, tooltip) => ({
    type, message0: fmt,
    args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'input_value', name: 'B', check: 'Boolean' }],
    inputsInline: true, output: 'Boolean', style: 'operator_blocks', tooltip
  });
  const varField = { type: 'field_variable', name: 'VAR', variable: 'meine Variable' };

  Blockly.common.defineBlocksWithJsonArray([
    /* Schatten-Eingaben (weiße Ovale) */
    { type: 'cal_num', message0: '%1', args0: [{ type: 'field_input', name: 'NUM', text: '0' }],
      output: 'Value', style: 'shadow_blocks', extensions: ['cal_numeric'] },
    { type: 'cal_txt', message0: '%1', args0: [{ type: 'field_input', name: 'TEXT', text: '' }],
      output: 'Value', style: 'shadow_blocks' },
    { type: 'cal_colour', message0: '%1', args0: [{ type: 'field_colour_swatch', name: 'COLOUR', colour: '#FF0000' }],
      output: 'Value', style: 'shadow_blocks' },

    /* Ereignisse */
    { type: 'cal_when_start', message0: 'Wenn Calliope startet %1',
      args0: [{ type: 'field_image', src: FLAG, width: 24, height: 24, alt: 'Start' }],
      nextStatement: null, style: 'event_blocks',
      tooltip: 'Läuft los, wenn die grüne Flagge angeklickt wird. Auf dem echten Calliope: beim Einschalten.' },
    { type: 'cal_when_button', message0: 'Wenn Knopf %1 gedrückt wird',
      args0: [{ type: 'field_dropdown', name: 'BTN', options: BTN_OPTIONS }],
      nextStatement: null, style: 'event_blocks',
      tooltip: 'Läuft los, sobald der gewählte Knopf gedrückt wird.' },
    { type: 'cal_when_gesture', message0: 'Wenn %1',
      args0: [{ type: 'field_dropdown', name: 'GESTURE', options: GESTURES }],
      nextStatement: null, style: 'event_blocks',
      tooltip: 'Läuft los, sobald der Calliope in diese Lage kommt.' },
    { type: 'cal_when_sensor', message0: 'Wenn %1 > %2',
      args0: [{ type: 'field_dropdown', name: 'SENSOR', options: SENSOR_OPTIONS }, { type: 'input_value', name: 'VALUE' }],
      nextStatement: null, inputsInline: true, style: 'event_blocks',
      tooltip: 'Läuft los, sobald der Messwert über die Grenze steigt.' },

    /* Steuerung */
    Object.assign({ type: 'cal_wait', message0: 'warte %1 Sekunden',
      args0: [{ type: 'input_value', name: 'SECS' }], style: 'control_blocks',
      tooltip: 'Wartet die angegebene Zeit, bevor es weitergeht.' }, stmt),
    Object.assign({ type: 'cal_repeat', message0: 'wiederhole %1 mal', args0: [{ type: 'input_value', name: 'TIMES' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], style: 'control_blocks',
      tooltip: 'Wiederholt die Blöcke darin so oft wie angegeben.' }, stmt),
    { type: 'cal_forever', message0: 'wiederhole fortlaufend',
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null, style: 'control_blocks',
      tooltip: 'Wiederholt die Blöcke darin immer wieder.' },
    Object.assign({ type: 'cal_if', message0: 'falls %1 , dann', args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], style: 'control_blocks',
      tooltip: 'Führt die Blöcke darin nur aus, wenn die Bedingung stimmt.' }, stmt),
    Object.assign({ type: 'cal_if_else', message0: 'falls %1 , dann', args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      message2: 'sonst',
      message3: '%1', args3: [{ type: 'input_statement', name: 'ELSE' }], style: 'control_blocks',
      tooltip: 'Stimmt die Bedingung, laufen die oberen Blöcke, sonst die unteren.' }, stmt),
    Object.assign({ type: 'cal_wait_until', message0: 'warte bis %1', args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      style: 'control_blocks', tooltip: 'Wartet, bis die Bedingung stimmt.' }, stmt),
    Object.assign({ type: 'cal_repeat_until', message0: 'wiederhole bis %1', args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], style: 'control_blocks',
      tooltip: 'Wiederholt die Blöcke darin, bis die Bedingung stimmt.' }, stmt),
    { type: 'cal_stop', message0: 'stoppe %1',
      args0: [{ type: 'field_dropdown', name: 'WHAT', options: [['alles', 'ALL'], ['dieses Skript', 'THIS']] }],
      previousStatement: null, style: 'control_blocks',
      tooltip: 'Hält alle Skripte oder nur dieses Skript an.' },

    /* Aussehen */
    Object.assign({ type: 'cal_show_leds', message0: 'zeige Bild %1',
      args0: [{ type: 'field_led_matrix', name: 'LEDS', value: '0000001010000001000101110' }],
      style: 'looks_blocks', inputsInline: false,
      tooltip: 'Zeigt das gezeichnete Bild auf den LEDs. Zum Zeichnen auf das Raster klicken.' }, stmt, { inputsInline: false }),
    Object.assign({ type: 'cal_show_icon', message0: 'zeige Symbol %1',
      args0: [{ type: 'field_dropdown', name: 'ICON', options: ICON_OPTIONS }],
      style: 'looks_blocks', tooltip: 'Zeigt ein fertiges Symbol auf den LEDs.' }, stmt),
    Object.assign({ type: 'cal_show_text', message0: 'zeige Text %1', args0: [{ type: 'input_value', name: 'TEXT' }],
      style: 'looks_blocks',
      tooltip: 'Lässt Text oder eine Zahl über die LEDs laufen. Ein einzelnes Zeichen bleibt stehen.' }, stmt),
    Object.assign({ type: 'cal_plot', message0: 'schalte LED x: %1 y: %2 %3',
      args0: [{ type: 'input_value', name: 'X' }, { type: 'input_value', name: 'Y' },
        { type: 'field_dropdown', name: 'MODE', options: [['an', 'ON'], ['aus', 'OFF'], ['um', 'TOGGLE']] }],
      style: 'looks_blocks',
      tooltip: 'Schaltet eine einzelne LED. x = Spalte von 0 (links) bis 4, y = Zeile von 0 (oben) bis 4.' }, stmt),
    Object.assign({ type: 'cal_clear', message0: 'lösche Anzeige', style: 'looks_blocks',
      tooltip: 'Schaltet alle LEDs der Anzeige aus.' }, stmt),
    Object.assign({ type: 'cal_rgb_colour', message0: 'setze RGB-LED %1 auf %2',
      args0: [{ type: 'field_dropdown', name: 'LED', options: RGB_OPTIONS }, { type: 'input_value', name: 'COLOUR' }],
      style: 'looks_blocks',
      tooltip: 'Lässt eine oder alle drei RGB-LEDs leuchten. Farbe anklicken oder einen Block „Farbe R G B“ einsetzen.' }, stmt),
    { type: 'cal_rgb_mix', message0: 'Farbe R %1 G %2 B %3',
      args0: [{ type: 'input_value', name: 'R' }, { type: 'input_value', name: 'G' }, { type: 'input_value', name: 'B' }],
      inputsInline: true, output: 'Value', style: 'looks_blocks',
      tooltip: 'Mischt eine Farbe aus Rot (R), Grün (G) und Blau (B). Jeder Wert von 0 bis 255.' },
    Object.assign({ type: 'cal_rgb_off', message0: 'schalte RGB-LEDs aus', style: 'looks_blocks',
      tooltip: 'Schaltet alle drei RGB-LEDs aus.' }, stmt),

    /* Klang */
    Object.assign({ type: 'cal_play_note', message0: 'spiele Ton %1 für %2 Sekunden',
      args0: [{ type: 'field_dropdown', name: 'NOTE', options: NOTE_OPTIONS }, { type: 'input_value', name: 'SECS' }],
      style: 'sound_blocks', tooltip: 'Spielt einen Ton und wartet, bis er zu Ende ist.' }, stmt),
    Object.assign({ type: 'cal_play_freq', message0: 'spiele %1 Hz für %2 Sekunden',
      args0: [{ type: 'input_value', name: 'FREQ' }, { type: 'input_value', name: 'SECS' }],
      style: 'sound_blocks', tooltip: 'Spielt einen Ton mit der angegebenen Frequenz in Hertz.' }, stmt),
    Object.assign({ type: 'cal_play_sound', message0: 'spiele Klang %1 ganz',
      args0: [{ type: 'field_dropdown', name: 'SOUND', options: SOUND_OPTIONS }],
      style: 'sound_blocks', tooltip: 'Spielt einen fertigen Klang und wartet, bis er zu Ende ist.' }, stmt),
    Object.assign({ type: 'cal_start_sound', message0: 'starte Klang %1',
      args0: [{ type: 'field_dropdown', name: 'SOUND', options: SOUND_OPTIONS }],
      style: 'sound_blocks', tooltip: 'Startet einen fertigen Klang. Das Skript läuft sofort weiter.' }, stmt),
    Object.assign({ type: 'cal_stop_sounds', message0: 'stoppe alle Klänge', style: 'sound_blocks',
      tooltip: 'Beendet den Ton, der gerade läuft.' }, stmt),
    Object.assign({ type: 'cal_set_volume', message0: 'setze Lautstärke auf %1 %%',
      args0: [{ type: 'input_value', name: 'VOL' }],
      style: 'sound_blocks', tooltip: 'Stellt die Lautstärke des Lautsprechers ein (0 bis 100 %).' }, stmt),
    Object.assign({ type: 'cal_change_volume', message0: 'ändere Lautstärke um %1',
      args0: [{ type: 'input_value', name: 'VOL' }],
      style: 'sound_blocks', tooltip: 'Macht den Lautsprecher lauter oder leiser.' }, stmt),

    /* Fühlen */
    { type: 'cal_button_pressed', message0: 'Knopf %1 gedrückt?',
      args0: [{ type: 'field_dropdown', name: 'BTN', options: BTN_OPTIONS }],
      output: 'Boolean', style: 'sensing_blocks', tooltip: 'Wahr, solange der gewählte Knopf gedrückt ist.' },
    { type: 'cal_light', message0: 'Helligkeit', output: 'Value', style: 'sensing_blocks',
      tooltip: 'Wie hell es ist: 0 (dunkel) bis 255 (sehr hell).' },
    { type: 'cal_temperature', message0: 'Temperatur in °C', output: 'Value', style: 'sensing_blocks',
      tooltip: 'Die gemessene Temperatur in Grad Celsius.' },
    { type: 'cal_accel', message0: 'Beschleunigung %1',
      args0: [{ type: 'field_dropdown', name: 'AXIS', options: AXIS_OPTIONS }],
      output: 'Value', style: 'sensing_blocks',
      tooltip: 'Wert des Lagesensors in Milli-g. x zeigt nach rechts, y nach hinten, z nach unten. Flach auf dem Tisch ist z etwa -1024.' },
    { type: 'cal_gesture_is', message0: 'ist %1 ?',
      args0: [{ type: 'field_dropdown', name: 'GESTURE', options: GESTURES }],
      output: 'Boolean', style: 'sensing_blocks',
      tooltip: 'Wahr, solange der Calliope in dieser Lage ist.' },
    { type: 'cal_compass', message0: 'Kompass-Richtung', output: 'Value', style: 'sensing_blocks',
      tooltip: 'Himmelsrichtung in Grad: 0 ist Norden, 90 Osten, 180 Süden, 270 Westen.' },
    Object.assign({ type: 'cal_compass_calibrate', message0: 'kalibriere Kompass', style: 'sensing_blocks',
      tooltip: 'Stellt den Kompass ein. Auf dem echten Calliope muss das einmal gemacht werden, bevor die Richtung stimmt.' }, stmt),
    { type: 'cal_sound_level', message0: 'Mikrofon-Lautstärke', output: 'Value', style: 'sensing_blocks',
      tooltip: 'Wie laut es in der Umgebung ist: 0 (leise) bis 255 (sehr laut).' },

    /* Operatoren */
    binop('cal_add', '%1 + %2', 'Addiert zwei Zahlen.'),
    binop('cal_sub', '%1 - %2', 'Subtrahiert die zweite Zahl von der ersten.'),
    binop('cal_mul', '%1 * %2', 'Multipliziert zwei Zahlen.'),
    binop('cal_div', '%1 / %2', 'Dividiert die erste Zahl durch die zweite.'),
    { type: 'cal_random', message0: 'Zufallszahl von %1 bis %2',
      args0: [{ type: 'input_value', name: 'FROM' }, { type: 'input_value', name: 'TO' }],
      inputsInline: true, output: 'Value', style: 'operator_blocks',
      tooltip: 'Eine zufällige Zahl im Bereich. Mit Kommazahlen als Grenze gibt es auch Kommazahlen.' },
    binop('cal_gt', '%1 > %2', 'Wahr, wenn der erste Wert größer ist.', 'Boolean'),
    binop('cal_lt', '%1 < %2', 'Wahr, wenn der erste Wert kleiner ist.', 'Boolean'),
    binop('cal_eq', '%1 = %2', 'Wahr, wenn beide Werte gleich sind.', 'Boolean'),
    boolop('cal_and', '%1 und %2', 'Wahr, wenn beide Bedingungen stimmen.'),
    boolop('cal_or', '%1 oder %2', 'Wahr, wenn mindestens eine Bedingung stimmt.'),
    { type: 'cal_not', message0: 'nicht %1', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }],
      inputsInline: true, output: 'Boolean', style: 'operator_blocks', tooltip: 'Kehrt die Bedingung um.' },
    binop('cal_join', 'verbinde %1 und %2', 'Hängt zwei Texte aneinander.'),
    { type: 'cal_letter_of', message0: 'Zeichen %1 von %2',
      args0: [{ type: 'input_value', name: 'INDEX' }, { type: 'input_value', name: 'TEXT' }],
      inputsInline: true, output: 'Value', style: 'operator_blocks', tooltip: 'Das Zeichen an dieser Stelle (1 = erstes Zeichen).' },
    { type: 'cal_length', message0: 'Länge von %1', args0: [{ type: 'input_value', name: 'TEXT' }],
      inputsInline: true, output: 'Value', style: 'operator_blocks', tooltip: 'Anzahl der Zeichen im Text.' },
    { type: 'cal_contains', message0: '%1 enthält %2 ?',
      args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }],
      inputsInline: true, output: 'Boolean', style: 'operator_blocks', tooltip: 'Wahr, wenn der Text den zweiten Text enthält.' },
    binop('cal_mod', '%1 mod %2', 'Rest bei der Division.'),
    { type: 'cal_round', message0: 'runde %1', args0: [{ type: 'input_value', name: 'A' }],
      inputsInline: true, output: 'Value', style: 'operator_blocks', tooltip: 'Rundet auf eine ganze Zahl.' },
    { type: 'cal_mathop', message0: '%1 von %2',
      args0: [{ type: 'field_dropdown', name: 'OP', options: MATH_OPTIONS }, { type: 'input_value', name: 'A' }],
      inputsInline: true, output: 'Value', style: 'operator_blocks',
      tooltip: 'Rechenfunktion. Winkel für sin, cos und tan in Grad.' },

    /* Variablen */
    { type: 'cal_var_get', message0: '%1', args0: [varField], output: 'Value', style: 'variable_blocks',
      tooltip: 'Der Wert der Variable.' },
    Object.assign({ type: 'cal_var_set', message0: 'setze %1 auf %2', args0: [varField, { type: 'input_value', name: 'VALUE' }],
      style: 'variable_blocks', tooltip: 'Gibt der Variable einen neuen Wert.' }, stmt),
    Object.assign({ type: 'cal_var_change', message0: 'ändere %1 um %2', args0: [varField, { type: 'input_value', name: 'VALUE' }],
      style: 'variable_blocks', tooltip: 'Zählt die Zahl zur Variable dazu (negativ: abziehen).' }, stmt),
    Object.assign({ type: 'cal_var_show', message0: 'zeige Variable %1', args0: [varField],
      style: 'variable_blocks', tooltip: 'Zeigt die Variable auf der Bühne an.' }, stmt),
    Object.assign({ type: 'cal_var_hide', message0: 'verstecke Variable %1', args0: [varField],
      style: 'variable_blocks', tooltip: 'Blendet die Variable auf der Bühne aus.' }, stmt),

    /* Funk */
    Object.assign({ type: 'cal_radio_channel', message0: 'setze Funk-Kanal auf %1',
      args0: [{ type: 'input_value', name: 'CHANNEL' }], style: 'radio_blocks',
      tooltip: 'Kanal von 0 bis 83. Nur Calliopes auf demselben Kanal hören sich gegenseitig.' }, stmt),
    Object.assign({ type: 'cal_radio_send', message0: 'sende %1 über Funk',
      args0: [{ type: 'input_value', name: 'TEXT' }], style: 'radio_blocks',
      tooltip: 'Schickt einen Text oder eine Zahl an alle anderen Calliopes auf demselben Kanal.' }, stmt),
    { type: 'cal_when_radio', message0: 'Wenn Funk-Nachricht empfangen wird',
      nextStatement: null, style: 'radio_hat_blocks',
      tooltip: 'Läuft los, sobald eine Funk-Nachricht ankommt.' },
    { type: 'cal_radio_message', message0: 'Funk-Nachricht', output: 'Value', style: 'radio_blocks',
      tooltip: 'Die zuletzt empfangene Funk-Nachricht.' }
  ]);

  const num = (name, n) => ({ [name]: { shadow: { type: 'cal_num', fields: { NUM: n } } } });
  const txt = (name, t) => ({ [name]: { shadow: { type: 'cal_txt', fields: { TEXT: t } } } });
  const inputs = (...parts) => Object.assign({}, ...parts);
  const block = (type, extra) => Object.assign({ kind: 'block', type }, extra || {});

  const staticToolbox = [
    { kind: 'category', name: 'Ereignisse', categorystyle: 'events', contents: [
      block('cal_when_start'),
      block('cal_when_button'),
      block('cal_when_sensor', { inputs: num('VALUE', 100) }),
      block('cal_when_gesture')
    ] },
    { kind: 'category', name: 'Steuerung', categorystyle: 'control', contents: [
      block('cal_wait', { inputs: num('SECS', 1) }),
      block('cal_repeat', { inputs: num('TIMES', 10) }),
      block('cal_forever'),
      block('cal_if'),
      block('cal_if_else'),
      block('cal_wait_until'),
      block('cal_repeat_until'),
      block('cal_stop')
    ] },
    { kind: 'category', name: 'Aussehen', categorystyle: 'looks', contents: [
      block('cal_show_leds'),
      block('cal_show_icon'),
      block('cal_show_text', { inputs: txt('TEXT', 'Hallo!') }),
      block('cal_plot', { inputs: inputs(num('X', 2), num('Y', 2)) }),
      block('cal_clear'),
      block('cal_rgb_colour', { inputs: { COLOUR: { shadow: { type: 'cal_colour', fields: { COLOUR: '#FF0000' } } } } }),
      block('cal_rgb_mix', { inputs: inputs(num('R', 255), num('G', 128), num('B', 0)) }),
      block('cal_rgb_off')
    ] },
    { kind: 'category', name: 'Klang', categorystyle: 'sound', contents: [
      block('cal_play_note', { inputs: num('SECS', 0.5) }),
      block('cal_play_freq', { inputs: inputs(num('FREQ', 440), num('SECS', 0.5)) }),
      block('cal_play_sound'),
      block('cal_start_sound'),
      block('cal_stop_sounds'),
      block('cal_set_volume', { inputs: num('VOL', 100) }),
      block('cal_change_volume', { inputs: num('VOL', -10) })
    ] },
    { kind: 'category', name: 'Fühlen', categorystyle: 'sensing', contents: [
      block('cal_button_pressed'),
      block('cal_light'),
      block('cal_temperature'),
      block('cal_sound_level'),
      block('cal_accel'),
      block('cal_gesture_is'),
      block('cal_compass'),
      block('cal_compass_calibrate')
    ] },
    { kind: 'category', name: 'Funk', categorystyle: 'radio', contents: [
      block('cal_radio_channel', { inputs: num('CHANNEL', 7) }),
      block('cal_radio_send', { inputs: txt('TEXT', 'Hallo!') }),
      block('cal_when_radio'),
      block('cal_radio_message')
    ] },
    { kind: 'category', name: 'Operatoren', categorystyle: 'operators', contents: [
      block('cal_add', { inputs: inputs(num('A', ''), num('B', '')) }),
      block('cal_sub', { inputs: inputs(num('A', ''), num('B', '')) }),
      block('cal_mul', { inputs: inputs(num('A', ''), num('B', '')) }),
      block('cal_div', { inputs: inputs(num('A', ''), num('B', '')) }),
      block('cal_random', { inputs: inputs(num('FROM', 1), num('TO', 10)) }),
      block('cal_gt', { inputs: inputs(txt('A', ''), txt('B', '50')) }),
      block('cal_lt', { inputs: inputs(txt('A', ''), txt('B', '50')) }),
      block('cal_eq', { inputs: inputs(txt('A', ''), txt('B', '50')) }),
      block('cal_and'),
      block('cal_or'),
      block('cal_not'),
      block('cal_join', { inputs: inputs(txt('A', 'Apfel '), txt('B', 'Banane')) }),
      block('cal_letter_of', { inputs: inputs(num('INDEX', 1), txt('TEXT', 'Apfel')) }),
      block('cal_length', { inputs: txt('TEXT', 'Apfel') }),
      block('cal_contains', { inputs: inputs(txt('A', 'Apfel'), txt('B', 'a')) }),
      block('cal_mod', { inputs: inputs(num('A', ''), num('B', '')) }),
      block('cal_round', { inputs: num('A', '') }),
      block('cal_mathop', { inputs: num('A', '') })
    ] }
  ];

  /* Variablen-Kategorie wird dynamisch gefüllt (siehe main.js) */
  function variablesFlyout(ws) {
    const vars = ws.getVariableMap().getAllVariables()
      .slice().sort((a, b) => a.getName().localeCompare(b.getName(), 'de'));
    const items = [{ kind: 'button', text: 'Neue Variable', callbackkey: 'CAL_NEW_VAR' }];
    if (vars.length) {
      items.push({ kind: 'button', text: 'Bühnenanzeige wählen', callbackkey: 'CAL_MONITORS' });
      vars.forEach(v => items.push(block('cal_var_get', { fields: { VAR: { id: v.getId() } } })));
      const f = { VAR: { id: vars[0].getId() } };
      items.push(
        block('cal_var_set', { fields: f, inputs: txt('VALUE', '0') }),
        block('cal_var_change', { fields: f, inputs: num('VALUE', 1) }),
        block('cal_var_show', { fields: f }),
        block('cal_var_hide', { fields: f })
      );
    }
    return items;
  }

  const toolbox = {
    kind: 'categoryToolbox',
    contents: staticToolbox.concat([
      { kind: 'category', name: 'Variablen', categorystyle: 'variables', custom: 'CAL_VARIABLES' }
    ])
  };
  const toolboxWithoutVariables = { kind: 'categoryToolbox', contents: staticToolbox };

  const starter = {
    variables: [{ name: 'meine Variable', id: 'var-meine-variable' }],
    blocks: { languageVersion: 0, blocks: [{
      type: 'cal_when_start', x: 40, y: 40,
      next: { block: { type: 'cal_show_icon', fields: { ICON: 'HEART' } } }
    }] }
  };

  window.CalBlocks = { theme, toolbox, toolboxWithoutVariables, variablesFlyout, starter, GESTURES };
})();
