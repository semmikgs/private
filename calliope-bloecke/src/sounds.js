/* Klänge und simulierter Piezo-Lautsprecher */
(function () {
  /* Tonfolgen im Notenformat von MicroPython (Note, Oktave, :Dauer in Ticks) */
  const LIST = [
    { id: 'BA_DING', name: 'Ba-Ding', tune: ['b5:1', 'e6:3'] },
    { id: 'JUMP_UP', name: 'Sprung hoch', tune: ['c5:1', 'd', 'e', 'f', 'g'] },
    { id: 'JUMP_DOWN', name: 'Sprung runter', tune: ['g5:1', 'f', 'e', 'd', 'c'] },
    { id: 'POWER_UP', name: 'Einschalten', tune: ['g4:1', 'c5', 'e', 'g:2', 'e:1', 'g:3'] },
    { id: 'POWER_DOWN', name: 'Ausschalten', tune: ['g5:1', 'd#', 'c', 'g4:2', 'b:1', 'c5:3'] },
    { id: 'WAWAWAWAA', name: 'Wah-wah', tune: ['e3:3', 'r:1', 'd#:3', 'r:1', 'd:4', 'r:1', 'c#:8'] },
    { id: 'RINGTONE', name: 'Klingelton', tune: ['c4:1', 'd', 'e:2', 'g', 'd:1', 'e', 'f:2', 'a', 'e:1', 'f', 'g:2', 'b', 'c5:4'] }
  ];
  const TICK_MS = 125; // 120 BPM, 4 Ticks pro Schlag

  const SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function parseTune(tune) {
    let octave = 4, ticks = 4;
    return tune.map(tok => {
      const m = /^([a-gr])(#|b)?(\d)?(?::(\d+))?$/i.exec(tok);
      if (!m) return { freq: 0, ms: ticks * TICK_MS };
      if (m[3]) octave = Number(m[3]);
      if (m[4]) ticks = Number(m[4]);
      if (m[1].toLowerCase() === 'r') return { freq: 0, ms: ticks * TICK_MS };
      let semi = SEMI[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
      const midi = (octave + 1) * 12 + semi;
      return { freq: midiToFreq(midi), ms: ticks * TICK_MS };
    });
  }
  const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);

  class Speaker {
    constructor() {
      this.ctx = null;
      this.volume = 100;
      this.osc = null;
      this.gain = null;
      this.seqTimer = null;
      this.listeners = [];
    }
    onChange(fn) { this.listeners.push(fn); }
    emit(playing) { this.listeners.forEach(fn => fn(playing)); }

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }

    setVolume(v) { this.volume = Math.max(0, Math.min(100, v)); if (this.gain) this.applyGain(); }
    applyGain() {
      const g = 0.12 * (this.volume / 100);
      this.gain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.005);
    }

    /* einzelner Ton; ersetzt einen laufenden Ton (nur ein Lautsprecher) */
    tone(freq, ms) {
      this.stopTone();
      if (!(freq > 0) || !(ms > 0)) return;
      const ctx = this.ensure();
      this.emit(true);
      if (ctx) {
        this.osc = ctx.createOscillator();
        this.gain = ctx.createGain();
        this.osc.type = 'square';
        this.osc.frequency.value = Math.min(20000, freq);
        this.gain.gain.value = 0;
        this.applyGain();
        this.osc.connect(this.gain).connect(ctx.destination);
        this.osc.start();
      }
      this.toneTimer = setTimeout(() => this.stopTone(), ms);
    }

    stopTone() {
      clearTimeout(this.toneTimer);
      if (this.osc) {
        const osc = this.osc, gain = this.gain;
        gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.004);
        osc.stop(this.ctx.currentTime + 0.03);
        this.osc = null;
        this.gain = null;
      }
      this.emit(false);
    }

    /* Tonfolge, gibt die Gesamtdauer in ms zurück */
    playTune(id) {
      this.stop();
      const entry = LIST.find(s => s.id === id);
      if (!entry) return 0;
      const notes = parseTune(entry.tune);
      let i = 0;
      const next = () => {
        if (i >= notes.length) { this.stopTone(); this.seqTimer = null; return; }
        const n = notes[i++];
        if (n.freq > 0) this.tone(n.freq, n.ms - 10); else this.stopTone();
        this.seqTimer = setTimeout(next, n.ms);
      };
      next();
      return notes.reduce((s, n) => s + n.ms, 0);
    }

    stop() {
      clearTimeout(this.seqTimer);
      this.seqTimer = null;
      this.stopTone();
    }
  }

  window.CalSounds = { LIST, Speaker, midiToFreq };
})();
