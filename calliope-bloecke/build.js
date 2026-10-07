/* Baut aus src/ und vendor/ die fertige Einzeldatei index.html.
   Aufruf im Ordner calliope-bloecke:  node build.js  */
const fs = require('fs');
const path = require('path');

const here = __dirname;
const read = p => fs.readFileSync(path.join(here, p), 'utf8');

const vendor = {
  'blockly_compressed.js': 'vendor/blockly_compressed.js',
  'msg/de.js': 'vendor/msg/de.js',
  'continuous-toolbox.js': 'vendor/continuous-toolbox.js',
  'flashlib.js': 'vendor/flashlib.js'
};

const generated = {
  // Die MicroPython-Laufzeit wird als Zeichenkette eingebettet und beim Export vorangestellt.
  'pyprelude': () => 'window.CAL_PY_PRELUDE = ' + JSON.stringify(read('src/pyprelude.txt')) + ';',
  // Die Calliope-Firmware liegt gepackt und Base64-kodiert bei; die Seite entpackt sie bei Bedarf.
  'firmware': () => 'window.CAL_FIRMWARE_GZ_B64 = "' + read('vendor/fw.b64').trim() + '";'
};

let html = read('src/index.html');
html = html.replace(/<!--INLINE:(.+?)-->/g, (_, name) => {
  const js = (generated[name] ? generated[name]() : read(vendor[name] || name))
    .replace(/<\/script/gi, '<\\/script')
    .replace(/^\/\/# sourceMappingURL=.*$/gm, '');
  return `<script>\n/* ${name} */\n${js}\n</script>`;
});

fs.writeFileSync(path.join(here, 'index.html'), html);
console.log('index.html geschrieben:', (html.length / 1024).toFixed(0) + ' KB');
