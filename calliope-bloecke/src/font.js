/* 5x5-Schrift für Lauftext und Symbole (eigene Glyphen, variable Breite) */
(function () {
  /* Schrift der Calliope-Firmware (CODAL „pendolino3“, MIT-Lizenz, Lancaster University):
     95 Zeichen (ASCII 32–126) × 5 Zeilen, je Zeile 5 Bits als Base32-Ziffer. */
  const FONT = '0000088808aa000avavaepejepi49jcicid8800048884844480a4a004e400004800e00000801248gciiic4c44es2cguu24ic6aiv2vgu1u24ehev248geheheehe480808004048248420e0e084248eh604ehljcciuiisisisegggesiiisugsguugsggegjheiiuiis888sv22icikokigggguhrlhhhpljhciiicsisggciic6sisihegc2sv4444iiiichhha4hhlrhiiciiha444u48gue888eg8421e222e4a0000000v840000eiifggsis0egge22eiecisge68s88eie2cggsii808882022cgkoki888860rlhh0siii0ciic0sisg0eie20eggg0684o88e870iiif0hha40hhlr0icci0ha4o0u48u64c4688888o8c8o00c30';

  const rowBits = (code, y) => parseInt(FONT[(code - 32) * 5 + y], 32);
  const glyph = ch => {
    let code = ch.charCodeAt(0);
    if (!(code >= 32 && code <= 126)) code = 63; // '?'
    return [0, 1, 2, 3, 4].map(y => rowBits(code, y));
  };
  const pixel = (g, x, y) => (g[y] >> (4 - x)) & 1;
  const colNonBlank = (g, x) => g.some((_, y) => pixel(g, x, y));
  const rightmost = g => colNonBlank(g, 4) ? 4 : colNonBlank(g, 3) ? 3 : 2;

  /* Umlaute wie auf dem Gerät umschreiben, andere Sonderzeichen werden „?“ */
  function deviceText(text) {
    return String(text)
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
      .replace(/[^\x20-\x7e]/g, '?');
  }

  /* Genaue Nachbildung von display.scroll() der Firmware: liefert alle Einzelbilder */
  function scrollFrames(text) {
    const s = deviceText(text);
    const frames = [];
    const img = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]; // [x][y]
    let next = 0, offset = 0, right, limit;
    if (s.length) { right = s[0]; limit = rightmost(glyph(right)) + 1; } else { right = ' '; limit = 5; }
    for (;;) {
      if (next === s.length && offset === 5) break;
      for (let x = 0; x < 4; x++) img[x] = img[x + 1].slice();
      img[4] = [0, 0, 0, 0, 0];
      if (offset < limit) {
        const g = glyph(right);
        for (let y = 0; y < 5; y++) img[4][y] = pixel(g, offset, y);
      } else if (offset === limit) {
        next++;
        if (next === s.length) { right = ' '; limit = 5; offset = 0; }
        else {
          right = s[next];
          const g = glyph(right);
          offset = -(colNonBlank(g, 0) ? 1 : 0);
          limit = rightmost(g) + 1;
        }
      }
      offset++;
      frames.push(img.map(col => col.slice()));
    }
    return frames;
  }

  /* Einzelnes Zeichen wie display.show('A') als 25er-Bitstring */
  function charImage(ch) {
    const g = glyph(deviceText(ch)[0] || ' ');
    let bits = '';
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) bits += pixel(g, x, y);
    return bits;
  }

  const img = rows => rows.join('').replace(/#/g, '1').replace(/\./g, '0');
  const ICONS = [
    ['HEART', 'Herz', img(['.#.#.', '#####', '#####', '.###.', '..#..'])],
    ['HEART_SMALL', 'kleines Herz', img(['.....', '.#.#.', '.###.', '..#..', '.....'])],
    ['HAPPY', 'fröhlich', img(['.....', '.#.#.', '.....', '#...#', '.###.'])],
    ['SAD', 'traurig', img(['.....', '.#.#.', '.....', '.###.', '#...#'])],
    ['YES', 'Haken', img(['.....', '....#', '...#.', '#.#..', '.#...'])],
    ['NO', 'Kreuz', img(['#...#', '.#.#.', '..#..', '.#.#.', '#...#'])],
    ['ARROW_N', 'Pfeil hoch', img(['..#..', '.###.', '#.#.#', '..#..', '..#..'])],
    ['ARROW_S', 'Pfeil runter', img(['..#..', '..#..', '#.#.#', '.###.', '..#..'])],
    ['ARROW_W', 'Pfeil links', img(['..#..', '.#...', '#####', '.#...', '..#..'])],
    ['ARROW_E', 'Pfeil rechts', img(['..#..', '...#.', '#####', '...#.', '..#..'])],
    ['HOUSE', 'Haus', img(['..#..', '.###.', '#####', '.#.#.', '.###.'])],
    ['DIAMOND', 'Raute', img(['..#..', '.#.#.', '#...#', '.#.#.', '..#..'])]
  ];

  window.CalFont = { scrollFrames, charImage, deviceText, ICONS };
})();
