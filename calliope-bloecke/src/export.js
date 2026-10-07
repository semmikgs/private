/* Übersetzung der Blöcke nach MicroPython (Calliope mini 3) */
(function () {
  const PRELUDE = window.CAL_PY_PRELUDE;

  const py = s => {
    let out = "'";
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      if (ch === '\\') out += '\\\\';
      else if (ch === "'") out += "\\'";
      else if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (c < 32) out += '\\x' + c.toString(16).padStart(2, '0');
      else out += ch;
    }
    return out + "'";
  };
  const numLit = v => {
    const s = String(v).trim();
    if (s === '') return "''";
    const n = Number(s);
    if (!Number.isFinite(n)) return '0';
    return String(n);
  };
  const midiToFreq = m => Math.round(440 * Math.pow(2, (m - 69) / 12));
  const tuneMs = id => {
    const TICK = 125;
    const entry = CalSounds.LIST.find(s => s.id === id);
    if (!entry) return 0;
    let ticks = 4, total = 0;
    entry.tune.forEach(tok => {
      const m = /:(\d+)$/.exec(tok);
      if (m) ticks = Number(m[1]);
      total += ticks * TICK;
    });
    return total;
  };
  const imgLit = bits => {
    const rows = [];
    for (let y = 0; y < 5; y++) rows.push(bits.slice(y * 5, y * 5 + 5).replace(/1/g, '9'));
    return `Image('${rows.join(':')}')`;
  };

  function generate(workspace) {
    const images = new Map();
    const imageName = bits => {
      if (!images.has(bits)) images.set(bits, `_I${images.size}`);
      return images.get(bits);
    };
    const warnings = new Set();
    const varName = id => {
      const v = workspace.getVariableMap().getVariableById(id);
      return v ? v.getName() : 'Variable';
    };

    /* ---------- Ausdrücke ---------- */
    function input(b, name, fallback = "''") {
      const t = b.getInputTargetBlock(name);
      return t ? expr(t) : fallback;
    }
    function cond(b, name) {
      const t = b.getInputTargetBlock(name);
      if (!t) return 'False';
      const e = expr(t);
      return t.outputConnection && (t.outputConnection.getCheck() || []).includes('Boolean') ? e : `_b(${e})`;
    }
    const n = (b, name) => `_n(${input(b, name)})`;

    function expr(b) {
      switch (b.type) {
        case 'cal_num': return numLit(b.getFieldValue('NUM'));
        case 'cal_txt': return py(b.getFieldValue('TEXT'));
        case 'cal_colour': return py(b.getFieldValue('COLOUR'));
        case 'cal_rgb_mix': return `_hex(${input(b, 'R')}, ${input(b, 'G')}, ${input(b, 'B')})`;
        case 'cal_button_pressed': return `_btn(${py(b.getFieldValue('BTN'))})`;
        case 'cal_light': return 'display.read_light_level()';
        case 'cal_temperature': return 'temperature()';
        case 'cal_sound_level': return 'microphone.sound_level()';
        case 'cal_accel': return `accelerometer.get_${b.getFieldValue('AXIS')}()`;
        case 'cal_gesture_is': return `(accelerometer.current_gesture() == ${py(b.getFieldValue('GESTURE'))})`;
        case 'cal_compass': return 'compass.heading()';
        case 'cal_radio_message': return '_msg';
        case 'cal_add': return `(${n(b, 'A')} + ${n(b, 'B')})`;
        case 'cal_sub': return `(${n(b, 'A')} - ${n(b, 'B')})`;
        case 'cal_mul': return `(${n(b, 'A')} * ${n(b, 'B')})`;
        case 'cal_div': return `_div(${input(b, 'A')}, ${input(b, 'B')})`;
        case 'cal_mod': return `_mod(${input(b, 'A')}, ${input(b, 'B')})`;
        case 'cal_random': return `_rand(${input(b, 'FROM')}, ${input(b, 'TO')})`;
        case 'cal_gt': return `(_cmp(${input(b, 'A')}, ${input(b, 'B')}) > 0)`;
        case 'cal_lt': return `(_cmp(${input(b, 'A')}, ${input(b, 'B')}) < 0)`;
        case 'cal_eq': return `(_cmp(${input(b, 'A')}, ${input(b, 'B')}) == 0)`;
        case 'cal_and': return `(${cond(b, 'A')} and ${cond(b, 'B')})`;
        case 'cal_or': return `(${cond(b, 'A')} or ${cond(b, 'B')})`;
        case 'cal_not': return `(not ${cond(b, 'A')})`;
        case 'cal_join': return `(_s(${input(b, 'A')}) + _s(${input(b, 'B')}))`;
        case 'cal_letter_of': return `_letter(${input(b, 'INDEX')}, ${input(b, 'TEXT')})`;
        case 'cal_length': return `len(_s(${input(b, 'TEXT')}))`;
        case 'cal_contains': return `(_s(${input(b, 'B')}).lower() in _s(${input(b, 'A')}).lower())`;
        case 'cal_round': return `_rnd(${input(b, 'A')})`;
        case 'cal_mathop': return `_math(${py(b.getFieldValue('OP'))}, ${input(b, 'A')})`;
        case 'cal_var_get': return `_v.get(${py(varName(b.getFieldValue('VAR')))}, 0)`;
        default:
          warnings.add(b.type);
          return "''";
      }
    }

    /* ---------- Anweisungen ---------- */
    function body(b, name, ind) {
      const t = b.getInputTargetBlock(name);
      const lines = t ? stack(t, ind) : [];
      return lines.length ? lines : [ind + 'pass'];
    }

    function stack(first, ind) {
      const out = [];
      for (let b = first; b; b = b.getNextBlock()) {
        if (!b.isEnabled()) continue;
        out.push(...stmt(b, ind));
      }
      return out;
    }

    function stmt(b, ind) {
      const I = ind, J = ind + '    ';
      const L = s => [I + s];
      switch (b.type) {
        case 'cal_wait': return L(`yield int(${n(b, 'SECS')} * 1000)`);
        case 'cal_repeat': return [I + `for _ in range(_rnd(${input(b, 'TIMES')})):`, ...body(b, 'DO', J), J + 'yield 0'];
        case 'cal_forever': return [I + 'while True:', ...body(b, 'DO', J), J + 'yield 0'];
        case 'cal_if': return [I + `if ${cond(b, 'COND')}:`, ...body(b, 'DO', J)];
        case 'cal_if_else': return [I + `if ${cond(b, 'COND')}:`, ...body(b, 'DO', J), I + 'else:', ...body(b, 'ELSE', J)];
        case 'cal_wait_until': return [I + `while not ${cond(b, 'COND')}:`, J + 'yield 0'];
        case 'cal_repeat_until': return [I + `while not ${cond(b, 'COND')}:`, ...body(b, 'DO', J), J + 'yield 0'];
        case 'cal_stop':
          return b.getFieldValue('WHAT') === 'ALL' ? [I + '_stop_all()', I + 'return'] : L('return');

        case 'cal_show_leds': return L(`display.show(${imageName(b.getFieldValue('LEDS'))})`);
        case 'cal_show_icon': {
          const icon = CalFont.ICONS.find(i => i[0] === b.getFieldValue('ICON'));
          return icon ? L(`display.show(${imageName(icon[2])})  # ${icon[1]}`) : [];
        }
        case 'cal_show_text': return L(`yield _show_text(${input(b, 'TEXT')})`);
        case 'cal_plot': {
          const mode = { ON: 1, OFF: 0, TOGGLE: 2 }[b.getFieldValue('MODE')];
          return L(`_plot(${input(b, 'X')}, ${input(b, 'Y')}, ${mode})`);
        }
        case 'cal_clear': return L('display.clear()');
        case 'cal_rgb_colour': {
          const led = b.getFieldValue('LED');
          return L(`_setrgb(${led === 'ALL' ? -1 : Number(led)}, ${input(b, 'COLOUR')})`);
        }
        case 'cal_rgb_off': return L("_setrgb(-1, '#000000')");

        case 'cal_play_note':
          return L(`yield _tone(${midiToFreq(Number(b.getFieldValue('NOTE')))}, ${n(b, 'SECS')} * 1000)`);
        case 'cal_play_freq': return L(`yield _tone(${input(b, 'FREQ')}, ${n(b, 'SECS')} * 1000)`);
        case 'cal_play_sound': {
          const id = b.getFieldValue('SOUND');
          return [I + `music.play(music.${id}, wait=False)`, I + `yield ${tuneMs(id)}`];
        }
        case 'cal_start_sound': return L(`music.play(music.${b.getFieldValue('SOUND')}, wait=False)`);
        case 'cal_stop_sounds': return L('music.stop()');
        case 'cal_set_volume': return L(`_setvol(${input(b, 'VOL')})`);
        case 'cal_change_volume': return L(`_setvol(_vol + ${n(b, 'VOL')})`);

        case 'cal_compass_calibrate': return [I + 'compass.calibrate()', I + 'yield 0'];
        case 'cal_radio_channel': return L(`_chan(${input(b, 'CHANNEL')})`);
        case 'cal_radio_send': return L(`radio.send(_s(${input(b, 'TEXT')}))`);

        case 'cal_var_set': return L(`_v[${py(varName(b.getFieldValue('VAR')))}] = ${input(b, 'VALUE')}`);
        case 'cal_var_change': {
          const k = py(varName(b.getFieldValue('VAR')));
          return L(`_v[${k}] = _n(_v.get(${k}, 0)) + ${n(b, 'VALUE')}`);
        }
        case 'cal_var_show':
        case 'cal_var_hide':
          return L('pass  # Variablenanzeige gibt es nur im Simulator');
        default:
          warnings.add(b.type);
          return L(`pass  # nicht übertragbar: ${b.type}`);
      }
    }

    /* ---------- Skripte ---------- */
    const scripts = [], starts = [], buttons = { A: [], B: [], AB: [] }, sensors = [], gestures = [], radios = [];
    const GESTURE_LABEL = Object.fromEntries(CalBlocks.GESTURES.map(([label, id]) => [id, label]));
    const SENSOR_LABEL = { LIGHT: 'Helligkeit', SOUND: 'Mikrofon-Lautstärke', TEMP: 'Temperatur' };
    workspace.getTopBlocks(true).forEach(top => {
      if (!top.isEnabled()) return;
      let title;
      if (top.type === 'cal_when_start') title = 'Wenn Calliope startet';
      else if (top.type === 'cal_when_button') title = `Wenn Knopf ${top.getFieldValue('BTN').replace('AB', 'A+B')} gedrückt wird`;
      else if (top.type === 'cal_when_sensor') title = `Wenn ${SENSOR_LABEL[top.getFieldValue('SENSOR')]} > …`;
      else if (top.type === 'cal_when_gesture') title = `Wenn ${GESTURE_LABEL[top.getFieldValue('GESTURE')] || '…'}`;
      else if (top.type === 'cal_when_radio') title = 'Wenn Funk-Nachricht empfangen wird';
      else return;
      const name = `_skript${scripts.length + 1}`;
      const lines = [`def ${name}():  # ${title}`];
      const first = top.getNextBlock();
      if (first) lines.push(...stack(first, '    '));
      lines.push('    yield 0');
      scripts.push(lines.join('\n'));
      if (top.type === 'cal_when_start') starts.push(name);
      else if (top.type === 'cal_when_button') buttons[top.getFieldValue('BTN')].push(name);
      else if (top.type === 'cal_when_sensor') sensors.push(`[${name}, ${py(top.getFieldValue('SENSOR'))}, lambda: ${input(top, 'VALUE', '0')}, False]`);
      else if (top.type === 'cal_when_gesture') gestures.push(`[${name}, ${py(top.getFieldValue('GESTURE'))}]`);
      else radios.push(name);
    });

    const vars = workspace.getVariableMap().getAllVariables()
      .map(v => `${py(v.getName())}: 0`);
    const imgLines = [...images.entries()].map(([bits, name]) => `${name} = ${imgLit(bits)}`);

    const code = [
      '# Erzeugt mit Calliope-Blöcke für den Calliope mini 3 (MicroPython)',
      '# Laufzeit: Taktgeber für gleichzeitige Skripte wie im Simulator',
      PRELUDE.trim(),
      '',
      '# ---------- Programm ----------',
      `_v = {${vars.join(', ')}}`,
      ...imgLines,
      '',
      scripts.join('\n\n'),
      '',
      `_START = [${starts.join(', ')}]`,
      `_BTN = {'A': [${buttons.A.join(', ')}], 'B': [${buttons.B.join(', ')}], 'AB': [${buttons.AB.join(', ')}]}`,
      `_SENS = [${sensors.join(', ')}]`,
      `_GEST = [${gestures.join(', ')}]`,
      `_RADIO = [${radios.join(', ')}]`,
      `_RADIO_USED = ${/\bradio\.|_chan\(|\b_msg\b/.test(scripts.join('\n')) || radios.length ? 'True' : 'False'}`,
      '',
      '_main()',
      ''
    ].join('\n');

    /* kompakter für den kleinen Arbeitsspeicher: Leerzeilen weg, Einrückung 1 Leerzeichen */
    const compact = code
      .replace(/^( {4})+/gm, m => ' '.repeat(m.length / 4))
      .replace(/\n{2,}/g, '\n');
    return { code: compact, warnings: [...warnings], scriptCount: scripts.length };
  }

  window.CalExport = { generate };
})();
